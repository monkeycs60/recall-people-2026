import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'onboarding-flow';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/onboarding-flow.ts',
    suiteName,
  });
}

test('keeps only language selection in first-run onboarding', async () => {
  const { ONBOARDING_SLIDES } = await loadModule();

  assert.deepEqual(ONBOARDING_SLIDES.map((slide) => slide.type), ['language']);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
