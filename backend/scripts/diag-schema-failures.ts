import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { createCerebras } from '@ai-sdk/cerebras';
import { extractionSchema, buildExtractionPrompt } from '../src/routes/extract';
import { CASES } from './ab-cases';

/**
 * Reproduit les echecs de schema de gpt-oss-120b et capture la reponse brute
 * du modele, que le banc A/B jette avec l'exception.
 */

const MODEL = process.env.MODEL || 'gpt-oss-120b';
const N = Number(process.env.N || 8);
const ONLY = (process.env.CASES || 'C12-fausse-resolution,C5-double-resolution,C10-english-recall').split(',');

type Failure = { caseId: string; attempt: number; text?: string; cause?: string; finishReason?: string };

async function main() {
  const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY });
  const cases = CASES.filter((c) => ONLY.includes(c.id));
  const failures: Failure[] = [];
  let total = 0;

  for (const c of cases) {
    const prompt = buildExtractionPrompt(c.transcription, c.currentContact, c.language);
    let ko = 0;
    for (let i = 0; i < N; i++) {
      total++;
      try {
        await generateText({
          model: cerebras(MODEL),
          output: Output.object({ schema: extractionSchema }),
          prompt,
          temperature: 0,
        });
      } catch (error) {
        ko++;
        const f: Failure = { caseId: c.id, attempt: i + 1 };
        if (NoObjectGeneratedError.isInstance(error)) {
          f.text = error.text;
          f.finishReason = error.finishReason;
          f.cause = String(error.cause).slice(0, 600);
        } else {
          f.cause = (error as Error).message?.slice(0, 300);
        }
        failures.push(f);
      }
    }
    console.log(`${c.id} · ${MODEL} : ${ko}/${N} échecs`);
  }

  const fs = await import('node:fs');
  const out = process.env.OUT || '/tmp/diag-schema.json';
  fs.writeFileSync(out, JSON.stringify({ model: MODEL, total, failures }, null, 2));
  console.log(`\n${failures.length}/${total} échecs · détail → ${out}`);

  for (const f of failures.slice(0, 4)) {
    console.log(`\n──── ${f.caseId} #${f.attempt} · finishReason=${f.finishReason}`);
    console.log('CAUSE :', f.cause);
    console.log('TEXTE BRUT (500 premiers car.) :');
    console.log(f.text ? f.text.slice(0, 500) : '(vide)');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
