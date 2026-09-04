import { generateText, Output } from 'ai';
import { createCerebras } from '@ai-sdk/cerebras';
import { z } from 'zod';
import { extractionSchema, buildExtractionPrompt } from '../src/routes/extract';
import { LONG_CASES, type LongCase } from './long-note-cases';

/**
 * Etude dediee aux notes fleuves : a partir de quelle densite l'extraction
 * laisse tomber des sujets, et quelle strategie la rattrape.
 *
 * Mesure principale : le RAPPEL, part des sujets reellement presents qu'on
 * retrouve. Les assertions du banc principal ne le voient pas -- une extraction
 * peut etre juste sur tout ce qu'elle contient et taire la moitie de la note.
 */

const MODEL = process.env.MODEL || 'gpt-oss-120b';
const RUNS = Number(process.env.RUNS || 3);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const PRICE = { in: 0.35, out: 0.75 };

type Extraction = typeof extractionSchema._type;
type Strategy = {
  key: string;
  label: string;
  run: (c: LongCase, cerebras: ReturnType<typeof createCerebras>) => Promise<{ out: Extraction; calls: number; inTok: number; outTok: number }>;
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const extract = async (
  cerebras: ReturnType<typeof createCerebras>,
  prompt: string,
  reasoningEffort?: 'low' | 'medium' | 'high'
) => {
  const res = await generateText({
    model: cerebras(MODEL),
    output: Output.object({ schema: extractionSchema }),
    prompt,
    temperature: 0,
    ...(reasoningEffort ? { providerOptions: { cerebras: { reasoningEffort } } } : {}),
  });
  const u = res.usage || ({} as Record<string, number>);
  return {
    out: res.output as Extraction,
    inTok: Number(u.inputTokens || 0),
    outTok: Number(u.outputTokens || 0),
  };
};

/** Inventaire libre des sujets, sans schema : une passe bon marche qui sert de checklist. */
const inventorySchema = z.object({
  topics: z.array(z.string()).describe('Un libellé court par actualité temporaire distincte mentionnée'),
});

const STRATEGIES: Strategy[] = [
  {
    key: 'baseline',
    label: 'Passe unique (production actuelle)',
    run: async (c, cerebras) => {
      const r = await extract(cerebras, buildExtractionPrompt(c.transcription, undefined, c.language));
      return { out: r.out, calls: 1, inTok: r.inTok, outTok: r.outTok };
    },
  },
  {
    key: 'reasoning-high',
    label: 'Passe unique, reasoning high',
    run: async (c, cerebras) => {
      const r = await extract(cerebras, buildExtractionPrompt(c.transcription, undefined, c.language), 'high');
      return { out: r.out, calls: 1, inTok: r.inTok, outTok: r.outTok };
    },
  },
  {
    key: 'checklist',
    label: 'Inventaire puis extraction guidée',
    run: async (c, cerebras) => {
      const inv = await generateText({
        model: cerebras(MODEL),
        output: Output.object({ schema: inventorySchema }),
        temperature: 0,
        prompt: `Liste UNIQUEMENT les actualités temporaires distinctes mentionnées dans cette note vocale.
Une actualité temporaire est un projet en cours, un événement à venir, une situation qui évoluera.
N'inclus PAS les traits permanents (métier stable, hobby régulier, lieu de vie).
Un libellé court par actualité. N'en oublie aucune, relis la note avant de répondre.

NOTE:
${c.transcription}`,
      });
      const topics = (inv.output as z.infer<typeof inventorySchema>).topics;
      const iu = inv.usage || ({} as Record<string, number>);

      const guided =
        buildExtractionPrompt(c.transcription, undefined, c.language) +
        `\n\nCHECKLIST DES ACTUALITÉS REPÉRÉES DANS CETTE NOTE:
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Ton tableau hotTopics doit couvrir CHACUNE de ces ${topics.length} entrées, sauf celles qui sont en
réalité un trait permanent. N'en fusionne aucune.`;

      const r = await extract(cerebras, guided);
      return {
        out: r.out,
        calls: 2,
        inTok: r.inTok + Number(iu.inputTokens || 0),
        outTok: r.outTok + Number(iu.outputTokens || 0),
      };
    },
  },
  {
    key: 'second-pass',
    label: 'Extraction puis passe de complétion',
    run: async (c, cerebras) => {
      const first = await extract(cerebras, buildExtractionPrompt(c.transcription, undefined, c.language));
      const already = first.out.hotTopics.map((t) => `- ${t.title}`).join('\n') || '- (aucun)';

      const completion =
        buildExtractionPrompt(c.transcription, undefined, c.language) +
        `\n\nUNE PREMIÈRE PASSE A DÉJÀ EXTRAIT CES ACTUALITÉS:
${already}

Elle en a probablement oublié. Relis la note et produis l'extraction COMPLÈTE : reprends les
actualités ci-dessus telles quelles ET ajoute celles qui manquent.`;

      const r = await extract(cerebras, completion);
      return {
        out: r.out,
        calls: 2,
        inTok: first.inTok + r.inTok,
        outTok: first.outTok + r.outTok,
      };
    },
  },
];

type Row = {
  caseId: string; words: number; strategy: string; run: number;
  ok: boolean; error?: string;
  found: number; expected: number; extracted: number;
  missed: string[]; calls: number; costUsd: number; latencyMs: number;
};

const score = (out: Extraction, c: LongCase) => {
  const haystack = norm(out.hotTopics.map((t) => `${t.title} ${t.context}`).join(' | '));
  const missed = c.expectedTopics
    .filter((t) => !t.keywords.some((k) => haystack.includes(norm(k))))
    .map((t) => t.label);
  return { found: c.expectedTopics.length - missed.length, missed };
};

async function pool<T>(jobs: (() => Promise<T>)[], size: number): Promise<T[]> {
  const out = new Array<T>(jobs.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, jobs.length) }, async () => {
      while (i < jobs.length) {
        const k = i++;
        out[k] = await jobs[k]();
      }
    })
  );
  return out;
}

async function main() {
  const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY });
  const only = (process.env.STRATEGIES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const strategies = only.length ? STRATEGIES.filter((s) => only.includes(s.key)) : STRATEGIES;

  const jobs: (() => Promise<Row>)[] = [];
  for (const c of LONG_CASES) for (const s of strategies) for (let i = 0; i < RUNS; i++) {
    jobs.push(async () => {
      const started = Date.now();
      const base: Row = {
        caseId: c.id, words: c.words, strategy: s.key, run: i + 1, ok: false,
        found: 0, expected: c.expectedTopics.length, extracted: 0, missed: [],
        calls: 0, costUsd: 0, latencyMs: 0,
      };
      try {
        const r = await s.run(c, cerebras);
        const { found, missed } = score(r.out, c);
        return {
          ...base, ok: true, found, missed,
          extracted: r.out.hotTopics.length, calls: r.calls,
          costUsd: (r.inTok * PRICE.in + r.outTok * PRICE.out) / 1_000_000,
          latencyMs: Date.now() - started,
        };
      } catch (error) {
        return { ...base, error: (error as Error).message?.slice(0, 160), latencyMs: Date.now() - started };
      }
    });
  }

  console.log(`${jobs.length} runs · ${LONG_CASES.length} notes × ${strategies.length} stratégies × ${RUNS}\n`);
  let done = 0;
  const rows = await pool(
    jobs.map((j) => async () => {
      const r = await j();
      done++;
      console.log(
        r.ok
          ? `(${done}/${jobs.length}) [${r.caseId}] ${r.strategy.padEnd(15)} ${r.found}/${r.expected} sujets · ${r.extracted} extraits · ${r.latencyMs}ms`
          : `(${done}/${jobs.length}) [${r.caseId}] ${r.strategy.padEnd(15)} ERREUR ${r.error}`
      );
      return r;
    }),
    CONCURRENCY
  );

  const fs = await import('node:fs');
  fs.writeFileSync(process.env.OUT || '/tmp/long-notes.json', JSON.stringify(rows, null, 2));

  console.log('\n=== RAPPEL PAR STRATÉGIE ET PAR LONGUEUR ===');
  const header = ['stratégie'.padEnd(16), ...LONG_CASES.map((c) => `${c.words}m/${c.expectedTopics.length}s`.padEnd(11))].join('');
  console.log(header);
  for (const s of strategies) {
    const cells = LONG_CASES.map((c) => {
      const rs = rows.filter((r) => r.caseId === c.id && r.strategy === s.key && r.ok);
      if (!rs.length) return '—'.padEnd(11);
      const pct = (rs.reduce((a, r) => a + r.found, 0) / rs.reduce((a, r) => a + r.expected, 0)) * 100;
      return `${pct.toFixed(0)}%`.padEnd(11);
    });
    console.log(s.key.padEnd(16) + cells.join(''));
  }

  console.log('\n=== COÛT ET LATENCE ===');
  for (const s of strategies) {
    const rs = rows.filter((r) => r.strategy === s.key && r.ok);
    if (!rs.length) continue;
    const globalPct =
      (rs.reduce((a, r) => a + r.found, 0) / rs.reduce((a, r) => a + r.expected, 0)) * 100;
    const lat = rs.map((r) => r.latencyMs).sort((a, b) => a - b);
    console.log(
      `${s.key.padEnd(16)} rappel ${globalPct.toFixed(0)}% · ${rs[0].calls} appel(s) · ` +
        `$${((rs.reduce((a, r) => a + r.costUsd, 0) / rs.length) * 1000).toFixed(2)}/1000 · ` +
        `médiane ${lat[Math.floor(lat.length / 2)]}ms`
    );
  }

  console.log('\n=== SUJETS LES PLUS SOUVENT PERDUS (baseline) ===');
  const lost: Record<string, number> = {};
  rows.filter((r) => r.strategy === 'baseline' && r.ok).forEach((r) => r.missed.forEach((m) => { lost[m] = (lost[m] || 0) + 1; }));
  Object.entries(lost).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([k, v]) => console.log(`  ${v}×  ${k}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
