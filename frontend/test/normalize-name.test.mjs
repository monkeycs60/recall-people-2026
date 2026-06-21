import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'normalize-name';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/normalizeName.ts',
    suiteName,
  });
}

test('normalizeName strips diacritics so accented variants match', async () => {
  const { normalizeName } = await loadModule();
  assert.equal(normalizeName('José'), 'jose');
  assert.equal(normalizeName('Éloïse'), 'eloise');
  assert.equal(normalizeName('José'), normalizeName('Jose'));
});

test('normalizeName folds case and collapses whitespace', async () => {
  const { normalizeName } = await loadModule();
  assert.equal(normalizeName('  JEAN   Pierre '), 'jean pierre');
  assert.equal(normalizeName('Anne-Marie'), 'anne-marie');
  assert.equal(normalizeName('MIKE'), normalizeName(' mike '));
});

test('normalizeName returns empty string for missing values', async () => {
  const { normalizeName } = await loadModule();
  assert.equal(normalizeName(''), '');
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(undefined), '');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
