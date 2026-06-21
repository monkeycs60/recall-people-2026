import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localeDir = resolve(__dirname, '../locales');
const localeCodes = ['de', 'en', 'es', 'fr', 'it'];

const compactCountPattern = /\{\{count\}\}[djgmTMyya]$/;

async function loadLocale(code) {
  return JSON.parse(await readFile(resolve(localeDir, `${code}.json`), 'utf8'));
}

test('contact upcoming relative labels use full time unit words', async () => {
  for (const code of localeCodes) {
    const locale = await loadLocale(code);
    const labels = [
      locale.contactComingUp.inDays_one,
      locale.contactComingUp.inDays_other,
      locale.contactComingUp.inMonths_one,
      locale.contactComingUp.inMonths_other,
    ];

    for (const label of labels) {
      assert.equal(typeof label, 'string', `${code} missing full relative label`);
      assert.doesNotMatch(label, compactCountPattern, `${code}: ${label}`);
    }
  }
});

test('contact notes known-for stats use full time unit words', async () => {
  for (const code of localeCodes) {
    const locale = await loadLocale(code);
    const labels = [
      locale.contactNotes.statKnownDays_one,
      locale.contactNotes.statKnownDays_other,
      locale.contactNotes.statKnownMonths_one,
      locale.contactNotes.statKnownMonths_other,
      locale.contactNotes.statKnownYears_one,
      locale.contactNotes.statKnownYears_other,
    ];

    for (const label of labels) {
      assert.equal(typeof label, 'string', `${code} missing known-for label`);
      assert.doesNotMatch(label, compactCountPattern, `${code}: ${label}`);
    }
  }
});
