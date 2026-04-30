import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'question-text';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/questionText.ts',
    suiteName,
  });
}

test('decodes URL-encoded spaces from assistant questions', async () => {
  const { normalizeQuestionText } = await loadModule();

  assert.equal(
    normalizeQuestionText('Qui%20relancer%20vendredi'),
    'Qui relancer vendredi'
  );
});

test('keeps regular percent text unchanged', async () => {
  const { normalizeQuestionText } = await loadModule();

  assert.equal(normalizeQuestionText('Objectif 100% prêt'), 'Objectif 100% prêt');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
