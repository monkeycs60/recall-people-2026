import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const summaryRoutePath = resolve(__dirname, '../src/routes/summary.ts');

test('summary prompt focuses on durable essentials instead of next follow-ups', async () => {
  const source = await readFile(summaryRoutePath, 'utf8');

  const forbiddenPriorityPhrases = [
    'prochain suivi concret',
    "ce qu'il faut suivre maintenant",
    'événements à venir importants',
    'next concrete follow-up',
    'important upcoming events',
    'próximo seguimiento concreto',
    'eventos importantes próximos',
    'prossimo follow-up concreto',
    'eventi importanti in arrivo',
    'nächste konkrete Nachfrage',
    'bevorstehende Ereignisse',
  ];

  for (const phrase of forbiddenPriorityPhrases) {
    assert.doesNotMatch(source, new RegExp(phrase, 'i'), phrase);
  }

  assert.match(source, /durable|stable/i);
});
