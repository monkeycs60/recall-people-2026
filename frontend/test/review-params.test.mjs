import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'review-params';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/reviewParams.ts',
    suiteName,
  });
}

test('missing review contact id falls back to a new contact when extraction has no id', async () => {
  const { resolveReviewContactId } = await loadModule();

  assert.equal(resolveReviewContactId(undefined, null), 'new');
  assert.equal(resolveReviewContactId('', undefined), 'new');
});

test('missing review contact id falls back to the extracted existing contact id', async () => {
  const { resolveReviewContactId } = await loadModule();

  assert.equal(resolveReviewContactId(undefined, 'contact-123'), 'contact-123');
});

test('explicit review contact id wins over the extracted contact id', async () => {
  const { resolveReviewContactId } = await loadModule();

  assert.equal(resolveReviewContactId('new', 'contact-123'), 'new');
  assert.equal(resolveReviewContactId(['contact-456'], 'contact-123'), 'contact-456');
});

test('review string params normalize arrays and missing values', async () => {
  const { resolveReviewStringParam } = await loadModule();

  assert.equal(resolveReviewStringParam(['first', 'second']), 'first');
  assert.equal(resolveReviewStringParam(undefined), '');
  assert.equal(resolveReviewStringParam(undefined, 'fallback'), 'fallback');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
