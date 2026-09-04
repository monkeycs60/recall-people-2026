import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const routes = resolve(__dirname, '../src/routes');

/**
 * Les routes structurees passent au modele deux contrats concurrents : le
 * json_schema derive du schema Zod, et le bloc FORMAT JSON du prompt. Quand ils
 * divergent, gpt-oss suit le prompt et la validation Zod rejette la reponse.
 */

/** Cles de premier niveau d'un litteral `z.object({...})`, par comptage d'accolades. */
const topLevelKeys = (source, schemaName) => {
  const opening = source.match(
    new RegExp(`(?:export )?const ${schemaName} = z\\.object\\(\\{`)
  );
  assert.ok(opening, `${schemaName} introuvable`);

  let index = opening.index + opening[0].length;
  let depth = 1;
  let quote = null;
  let escaped = false;
  let atDepthOne = '';

  while (index < source.length && depth > 0) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if ('{(['.includes(char)) {
      depth += 1;
    } else if ('})]'.includes(char)) {
      depth -= 1;
    }
    if (depth === 1 && !quote) atDepthOne += char;
    index += 1;
  }

  const keys = [...atDepthOne.matchAll(/(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]);
  return { keys: [...new Set(keys)], start: opening.index, end: index };
};

const STRUCTURED_ROUTES = [
  ['extract.ts', 'extractionSchema'],
  ['ask.ts', 'askResponseSchema'],
  ['search.ts', 'searchResultSchema'],
  ['summary.ts', 'summarySchema'],
  ['similarity.ts', 'similaritySchema'],
  ['detect-contact.ts', 'detectionSchema'],
];

test('a prompt that spells out a JSON contract spells out every schema field', async (t) => {
  for (const [file, schemaName] of STRUCTURED_ROUTES) {
    await t.test(`${file} · ${schemaName}`, async () => {
      const source = await readFile(resolve(routes, file), 'utf8');
      const { keys, start, end } = topLevelKeys(source, schemaName);
      const prompts = source.slice(0, start) + source.slice(end);

      const quoted = keys.filter((key) => prompts.includes(`"${key}"`));
      if (quoted.length === 0) return; // pas de contrat JSON dans le prompt

      const missing = keys.filter((key) => !prompts.includes(`"${key}"`));
      assert.deepEqual(
        missing,
        [],
        `${file}: le prompt décrit un JSON mais omet ${missing.join(', ')}`
      );
    });
  }
});

test('the single JSON contract skeleton covers every extraction field', async () => {
  const source = await readFile(resolve(routes, 'extract.ts'), 'utf8');
  const { keys } = topLevelKeys(source, 'extractionSchema');

  const skeleton = source.match(/const buildFormatJson = \(labels: FormatJsonLabels\): string => `([\s\S]*?)`;/);
  assert.ok(skeleton, 'buildFormatJson introuvable');

  const missing = keys.filter((key) => !skeleton[1].includes(`"${key}"`));
  assert.deepEqual(missing, [], `le squelette omet ${missing.join(', ')}`);
});

test('all five languages render the contract from that single skeleton', async () => {
  const source = await readFile(resolve(routes, 'extract.ts'), 'utf8');
  const callSites = [...source.matchAll(/formatJson: buildFormatJson\(\{/g)];
  assert.equal(callSites.length, 5, 'chaque langue doit passer par buildFormatJson');

  const inlined = [...source.matchAll(/formatJson: `/g)];
  assert.equal(inlined.length, 0, 'aucun bloc JSON ne doit être réécrit à la main');
});
