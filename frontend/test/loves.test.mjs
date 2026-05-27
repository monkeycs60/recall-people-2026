import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'loves';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/loves.ts',
    suiteName,
  });
}

test('merges extracted loves without duplicating existing preferences', async () => {
  const { mergeLoves } = await loadModule();

  assert.deepEqual(
    mergeLoves(['Ceramics', 'Quiet coffee'], [' ceramics ', 'Sci-fi', '', 'quiet Coffee']),
    ['Ceramics', 'Quiet coffee', 'Sci-fi']
  );
});

test('keeps the loves list compact for profile chips', async () => {
  const { mergeLoves } = await loadModule();

  assert.deepEqual(
    mergeLoves(
      ['Ceramics', 'Quiet coffee'],
      ['Sci-fi', 'Morning runs', 'Thai food', 'Indie films', 'Gardening']
    ),
    ['Ceramics', 'Quiet coffee', 'Sci-fi', 'Morning runs', 'Thai food', 'Indie films']
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
