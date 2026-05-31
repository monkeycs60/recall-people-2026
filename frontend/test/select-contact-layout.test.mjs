import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const selectContactScreenPath = resolve(__dirname, '../app/select-contact.tsx');
const localeCodes = ['en', 'fr', 'es', 'it', 'de'];

test('select contact screen presents distinct decision cards for matches and new people', async () => {
  const source = await readFile(selectContactScreenPath, 'utf8');

  assert.match(source, /highlightedSuggestedContact/);
  assert.match(source, /styles\.existingSuggestionCard/);
  assert.match(source, /styles\.newPersonCard/);
  assert.match(source, /selectContact\.alreadyInContacts/);
  assert.match(source, /selectContact\.newPersonStatus/);
  assert.match(source, /selectContact\.addNoteToContact/);
  assert.match(source, /selectContact\.orChooseExisting/);
  assert.match(source, /<CheckCircle2/);
  assert.match(source, /<Plus/);
  assert.match(source, /<Pencil/);
  assert.match(source, /<ArrowRight/);
  assert.doesNotMatch(source, /t\('selectContact\.suggested'\)/);
});

test('select contact redesign strings are translated in every supported language', async () => {
  const requiredKeys = [
    'alreadyInContacts',
    'newPersonStatus',
    'addNoteToContact',
    'notThem',
    'createANewContact',
    'orChooseExisting',
    'openTopics_one',
    'openTopics_other',
    'seenAgo',
  ];

  for (const localeCode of localeCodes) {
    const localePath = resolve(__dirname, `../locales/${localeCode}.json`);
    const locale = JSON.parse(await readFile(localePath, 'utf8'));

    for (const key of requiredKeys) {
      assert.equal(typeof locale.selectContact[key], 'string', `${localeCode}: ${key}`);
      assert.ok(locale.selectContact[key].trim().length > 0, `${localeCode}: ${key}`);
    }
  }
});
