import { generateText, Output } from 'ai';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { extractionSchema, buildExtractionPrompt } from '../src/routes/extract';
import { CASES, TODAY, type Case, type Extraction } from './ab-cases';

/**
 * Banc A/B pour la route /api/extract.
 *
 * Deux axes croises : le modele (gpt-oss-120b vs qwen-3.8-27b) et le prompt
 * (celui de production vs une variante anti-synthese). Le croisement separe
 * ce qui releve du modele de ce qui releve du prompt.
 */

type ModelVariant = { key: string; model: string; reasoningEffort?: 'none' | 'low' | 'medium' | 'high' };

const ALL_MODELS: ModelVariant[] = [
  { key: 'gpt-oss', model: 'gpt-oss-120b' },
  { key: 'qwen', model: 'qwen-3.8-27b', reasoningEffort: 'low' },
];

/**
 * Suffixe applique au prompt de production. Cible le comportement observe au
 * premier tour : Qwen fusionne les actualites voisines et en laisse tomber.
 */
const RECALL_ADDENDUM: Record<string, string> = {
  fr: `
EXHAUSTIVITÉ DES HOT TOPICS - CRITIQUE:
- Crée UN hot topic SÉPARÉ par actualité distincte. Ne fusionne JAMAIS deux actualités
  différentes en une seule, même si elles sont liées (ex: "déménagement" et "visite d'appartement"
  sont deux hot topics, pas un seul ; "grossesse" et "recherche de nourrice" aussi).
- Avant de répondre, relis la transcription et compte les actualités temporaires mentionnées.
  Ton tableau hotTopics doit en contenir autant. Si tu en as moins, tu en as oublié : reprends.
- Une actualité déjà présente dans les ACTUALITÉS EXISTANTES compte aussi : si la note lui
  ajoute une date ou un détail nouveau sans la résoudre, crée le hot topic correspondant.
- La concision n'est PAS un objectif ici. Mieux vaut un hot topic de trop qu'un oublié.`,
  en: `
HOT TOPIC EXHAUSTIVENESS - CRITICAL:
- Create ONE SEPARATE hot topic per distinct piece of news. NEVER merge two different
  items into one, even when related (e.g. "moving" and "apartment viewing" are two hot
  topics, not one; so are "pregnancy" and "looking for a nanny").
- Before answering, re-read the transcription and count the temporary items mentioned.
  Your hotTopics array must contain that many. Fewer means you dropped one: go back.
- An item already listed in EXISTING TOPICS counts too: if the note adds a new date or
  detail without resolving it, create the corresponding hot topic.
- Conciseness is NOT a goal here. One hot topic too many beats one missed.`,
  es: `
EXHAUSTIVIDAD DE LOS HOT TOPICS - CRÍTICO:
- Crea UN hot topic SEPARADO por cada novedad distinta. NUNCA fusiones dos novedades
  diferentes en una sola, aunque estén relacionadas.
- Antes de responder, relee la transcripción y cuenta las novedades temporales mencionadas.
  Tu array hotTopics debe contener esa cantidad. Si tienes menos, olvidaste alguna.
- La concisión NO es un objetivo aquí. Mejor un hot topic de más que uno olvidado.`,
};


/**
 * Le defaut residuel apres la regle d'exhaustivite : le modele reconnait bien
 * une situation mais la rend en un seul hot topic la ou elle porte plusieurs
 * echeances distinctes, chacune meritant son rappel.
 */
const FACETS_ADDENDUM: Record<string, string> = {
  fr: `
UNE SITUATION PEUT PORTER PLUSIEURS ÉCHÉANCES:
- Si une même situation implique plusieurs échéances ou démarches distinctes, crée UN hot topic
  PAR ÉCHÉANCE, pas un seul pour la situation entière.
- Exemple: "le proprio veut vendre, j'ai trois mois pour partir, et j'ai rendez-vous à la banque
  vendredi pour un prêt" = TROIS hot topics (départ du logement, recherche d'achat, rendez-vous
  bancaire), parce que chacun a sa propre date et son propre suivi.
- Le test: si deux éléments méritent des rappels à des moments différents, ce sont deux hot topics.`,
  en: `
ONE SITUATION CAN CARRY SEVERAL DEADLINES:
- When a single situation involves several distinct deadlines or steps, create ONE hot topic
  PER DEADLINE, not one for the whole situation.
- Example: "the landlord is selling, I have three months to move out, and I have a bank
  appointment Friday about a loan" = THREE hot topics (moving out, house hunting, bank
  appointment), because each has its own date and its own follow-up.
- The test: if two items deserve reminders at different moments, they are two hot topics.`,
  es: `
UNA SITUACIÓN PUEDE TENER VARIOS PLAZOS:
- Si una misma situación implica varios plazos o gestiones distintas, crea UN hot topic POR
  PLAZO, no uno solo para toda la situación.
- La prueba: si dos elementos merecen recordatorios en momentos diferentes, son dos hot topics.`,
};

type PromptVariant = { key: string; decorate: (prompt: string, language: string) => string };

const ALL_PROMPTS: PromptVariant[] = [
  { key: 'prod', decorate: (p) => p },
  { key: 'recall', decorate: (p, lang) => p + '\n' + (RECALL_ADDENDUM[lang] || RECALL_ADDENDUM.fr) },
  { key: 'facets', decorate: (p, lang) => p + '\n' + (FACETS_ADDENDUM[lang] || FACETS_ADDENDUM.fr) },
];

const PRICING: Record<string, { in: number; out: number }> = {
  'gpt-oss-120b': { in: 0.35, out: 0.75 },
  'qwen-3.8-27b': { in: 0.99, out: 1.49 },
  'gpt-5-mini': { in: 0.25, out: 2.0 },
};

const judgeSchema = z.object({
  score: z.number().min(0).max(10),
  reasoning: z.string(),
  issues: z.array(z.string()),
  strengths: z.array(z.string()),
});

/** Juge neutre : ni gpt-oss ni qwen. Grille reprise de lib/evaluators.ts. */
async function judge(openai: ReturnType<typeof createOpenAI>, transcription: string, extraction: object) {
  const prompt = `Tu es un évaluateur de qualité pour un système d'extraction d'informations.

Ta tâche : Évaluer si l'extraction JSON correspond fidèlement à la transcription audio.

TRANSCRIPTION ORIGINALE:
${transcription}

EXTRACTION GÉNÉRÉE:
${JSON.stringify(extraction, null, 2)}

CONTEXTE IMPORTANT:
- Le nom du contact peut provenir de la base de données (pas une hallucination)
- Les dates calculées (ex: "dans 2 semaines" → date précise) sont attendues et correctes
- Un mois nommé sans année désigne sa prochaine occurrence à venir
- La date du jour est ${TODAY}

Évalue la qualité selon ces critères:
1. COMPLÉTUDE: Tous les sujets/infos mentionnés sont-ils extraits ?
2. EXACTITUDE: Les informations extraites correspondent-elles à la transcription ?
3. CATÉGORISATION: hotTopics (temporaires, à suivre) vs loves (goûts permanents) ?
4. DATES: Si une date est mentionnée pour un hot topic, eventDate est-il correct ?
5. RÉSOLUTIONS: Si un sujet existant est résolu, la résolution est-elle détaillée ?
6. PAS D'HALLUCINATION: Rien d'inventé au-delà de ce qui est dit ?

Score 0-10 : 9-10 parfait, 7-8 très bon, 4-6 moyen, 1-3 mauvais. Sois strict et objectif.`;

  const res = await generateText({ model: openai('gpt-5-mini'), output: Output.object({ schema: judgeSchema }), prompt });
  const u = res.usage || ({} as Record<string, number>);
  const p = PRICING['gpt-5-mini'];
  return {
    ...res.output!,
    costUsd: (Number(u.inputTokens || 0) * p.in + Number(u.outputTokens || 0) * p.out) / 1_000_000,
  };
}

type Run = {
  caseId: string; tier: string; model: string; prompt: string; ok: boolean; error?: string;
  latencyMs: number; inputTokens: number; cachedInputTokens: number; outputTokens: number;
  reasoningTokens: number; costUsd: number;
  checksPassed: number; checksTotal: number; failedChecks: string[];
  topicsExtracted: number; topicsExpected: number;
  judgeScore: number | null; judgeIssues: string[]; judgeCostUsd: number;
  output?: unknown;
};

const RUNS = Number(process.env.RUNS || 2);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 90000);
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);

async function runOne(
  c: Case, m: ModelVariant, pv: PromptVariant,
  cerebras: ReturnType<typeof createCerebras>, openai: ReturnType<typeof createOpenAI>
): Promise<Run> {
  const prompt = pv.decorate(
    buildExtractionPrompt(c.transcription, c.currentContact, c.language),
    c.language
  );
  const started = Date.now();
  const base: Run = {
    caseId: c.id, tier: c.tier, model: m.key, prompt: pv.key, ok: false, latencyMs: 0,
    inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningTokens: 0, costUsd: 0,
    checksPassed: 0, checksTotal: 0, failedChecks: [],
    topicsExtracted: 0, topicsExpected: c.expectedTopics,
    judgeScore: null, judgeIssues: [], judgeCostUsd: 0,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await generateText({
      model: cerebras(m.model),
      output: Output.object({ schema: extractionSchema }),
      prompt,
      temperature: 0,
      abortSignal: controller.signal,
      ...(m.reasoningEffort ? { providerOptions: { cerebras: { reasoningEffort: m.reasoningEffort } } } : {}),
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - started;
    const out = res.output as Extraction;
    const u = res.usage || ({} as Record<string, number>);
    const inputTokens = Number(u.inputTokens || 0);
    const outputTokens = Number(u.outputTokens || 0);
    const price = PRICING[m.model];

    let checks = [] as ReturnType<Case['checks']>;
    try { checks = c.checks(out); } catch (e) { checks = [{ name: 'checks-threw:' + String(e), pass: false }]; }

    let judgeScore: number | null = null, judgeIssues: string[] = [], judgeCostUsd = 0;
    try {
      const ev = await judge(openai, c.transcription, out as object);
      judgeScore = ev.score; judgeIssues = ev.issues || []; judgeCostUsd = ev.costUsd;
    } catch { /* best effort */ }

    return {
      ...base, ok: true, latencyMs, inputTokens, outputTokens,
      cachedInputTokens: Number((u as Record<string, number>).cachedInputTokens || 0),
      reasoningTokens: Number((u as Record<string, number>).reasoningTokens || 0),
      costUsd: (inputTokens * price.in + outputTokens * price.out) / 1_000_000,
      checksPassed: checks.filter((k) => k.pass).length,
      checksTotal: checks.length,
      failedChecks: checks.filter((k) => !k.pass).map((k) => `${k.name} → ${JSON.stringify(k.got)}`),
      topicsExtracted: out.hotTopics?.length ?? 0,
      judgeScore, judgeIssues, judgeCostUsd, output: out,
    };
  } catch (error) {
    return { ...base, latencyMs: Date.now() - started, error: (error as Error).message?.slice(0, 200) };
  }
}

async function pool<T>(jobs: (() => Promise<T>)[], size: number): Promise<T[]> {
  const results = new Array<T>(jobs.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const i = cursor++;
        results[i] = await jobs[i]();
      }
    })
  );
  return results;
}

async function main() {
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (!cerebrasKey) throw new Error('CEREBRAS_API_KEY manquante');
  const cerebras = createCerebras({ apiKey: cerebrasKey });
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const pick = (name: string) => (process.env[name] || '').split(',').map((s) => s.trim()).filter(Boolean);
  const onlyModels = pick('MODELS');
  const onlyPrompts = pick('PROMPTS');
  const models = onlyModels.length ? ALL_MODELS.filter((m) => onlyModels.includes(m.key)) : ALL_MODELS;
  const prompts = onlyPrompts.length ? ALL_PROMPTS.filter((p) => onlyPrompts.includes(p.key)) : ALL_PROMPTS;
  const jobs: (() => Promise<Run>)[] = [];
  for (const c of CASES) for (const m of models) for (const p of prompts) {
    for (let i = 0; i < RUNS; i++) jobs.push(() => runOne(c, m, p, cerebras, openai));
  }
  console.log(
    `${jobs.length} runs · ${CASES.length} cas × ${models.length} modèles × ${prompts.length} prompts × ${RUNS}\n`
  );

  let done = 0;
  const runs = await pool(
    jobs.map((j) => async () => {
      const r = await j();
      done++;
      const tag = r.ok
        ? `${r.checksPassed}/${r.checksTotal} · ${r.topicsExtracted}/${r.topicsExpected} topics · juge ${r.judgeScore ?? '—'} · ${r.latencyMs}ms`
        : `ERREUR ${r.error}`;
      console.log(`(${done}/${jobs.length}) [${r.caseId}] ${r.model}/${r.prompt}  ${tag}`);
      return r;
    }),
    CONCURRENCY
  );

  const fs = await import('node:fs');
  const outPath = process.env.OUT || '/tmp/ab-extract-results.json';
  fs.writeFileSync(outPath, JSON.stringify({ today: TODAY, runs }, null, 2));

  console.log(`\nRésultats bruts → ${outPath}`);
  console.log('\n=== SYNTHÈSE (modèle × prompt) ===');
  const pct = (a: number, b: number) => (b ? ((a / b) * 100).toFixed(0) + '%' : '—');
  for (const m of models) for (const p of prompts) {
    const rs = runs.filter((r) => r.model === m.key && r.prompt === p.key);
    const ok = rs.filter((r) => r.ok);
    const lat = ok.map((r) => r.latencyMs).sort((a, b) => a - b);
    const tier = (t: string) => {
      const s = ok.filter((r) => r.tier === t);
      return pct(s.reduce((a, r) => a + r.checksPassed, 0), s.reduce((a, r) => a + r.checksTotal, 0));
    };
    const withTopics = ok.filter((r) => r.topicsExpected > 0);
    const judged = ok.filter((r) => r.judgeScore !== null);
    const sum = (f: (r: Run) => number) => ok.reduce((a, r) => a + f(r), 0);
    console.log([
      `\n${m.key} / prompt=${p.key}`,
      `  succès schéma  : ${ok.length}/${rs.length} (${pct(ok.length, rs.length)})`,
      `  checks simple  : ${tier('simple')}`,
      `  checks complexe: ${tier('complex')}`,
      `  RAPPEL topics  : ${pct(withTopics.reduce((a, r) => a + Math.min(r.topicsExtracted, r.topicsExpected), 0), withTopics.reduce((a, r) => a + r.topicsExpected, 0))}`,
      `  juge moyen     : ${judged.length ? (judged.reduce((a, r) => a + (r.judgeScore || 0), 0) / judged.length).toFixed(2) : '—'}/10`,
      `  latence méd/p95: ${lat[Math.floor(lat.length / 2)] || 0}ms / ${lat[Math.floor(lat.length * 0.95)] || 0}ms`,
      `  tokens in moy  : ${ok.length ? Math.round(sum((r) => r.inputTokens) / ok.length) : 0} (dont ${ok.length ? Math.round(sum((r) => r.cachedInputTokens) / ok.length) : 0} en cache, ${pct(sum((r) => r.cachedInputTokens), sum((r) => r.inputTokens))})`,
      `  coût/1000 extr.: $${ok.length ? ((ok.reduce((a, r) => a + r.costUsd, 0) / ok.length) * 1000).toFixed(2) : '0'}`,
    ].join('\n'));
  }
  const judgeTotal = runs.reduce((a, r) => a + r.judgeCostUsd, 0);
  const extrTotal = runs.reduce((a, r) => a + r.costUsd, 0);
  console.log(`\n=== COÛT DE CETTE CAMPAGNE ===\n  extractions Cerebras : $${extrTotal.toFixed(4)}\n  juge gpt-5-mini      : $${judgeTotal.toFixed(4)} (${runs.filter((r) => r.judgeScore !== null).length} évaluations)\n  TOTAL                : $${(extrTotal + judgeTotal).toFixed(4)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
