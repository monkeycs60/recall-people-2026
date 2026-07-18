import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'posthog-privacy';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/posthog.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      packages: 'external',
    },
  });
}

test('redacts AI prompt and output content by default', async () => {
  const { aiTracingOptions } = await loadModule();

  assert.deepEqual(aiTracingOptions({ distinctId: 'user-1' }), {
    posthogDistinctId: 'user-1',
    posthogProperties: {
      product: 'recall',
      surface: 'api',
      $geoip_disable: true,
    },
    posthogPrivacyMode: true,
  });
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
