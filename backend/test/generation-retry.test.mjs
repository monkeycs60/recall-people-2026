import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'generation-retry';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/generation-retry.ts',
    suiteName,
  });
}

test('returns the first successful result without retrying', async () => {
  const { generateWithRetries } = await loadModule();
  let calls = 0;
  const result = await generateWithRetries(async () => {
    calls += 1;
    return 'ok';
  }, { label: 'test' });
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('retries after a failure and returns the later success', async () => {
  const { generateWithRetries } = await loadModule();
  let calls = 0;
  const result = await generateWithRetries(async () => {
    calls += 1;
    if (calls < 3) throw new Error('schema validation failed');
    return 'recovered';
  }, { label: 'test' });
  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('throws the last error after maxAttempts failures', async () => {
  const { generateWithRetries } = await loadModule();
  let calls = 0;
  await assert.rejects(
    () => generateWithRetries(async () => {
      calls += 1;
      throw new Error(`failure ${calls}`);
    }, { label: 'test', maxAttempts: 3 }),
    /failure 3/,
  );
  assert.equal(calls, 3);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
