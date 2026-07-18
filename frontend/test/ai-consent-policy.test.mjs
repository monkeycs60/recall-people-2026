import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'ai-consent-policy';
const gateSuiteName = 'ai-consent-gate';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/ai-consent-policy.ts',
    suiteName,
  });
}

async function loadGateModule() {
  return loadTsModule({
    entryPoint: 'lib/ai-consent.ts',
    suiteName: gateSuiteName,
    esbuildOptions: {
      plugins: [
        {
          name: 'settings-store-test-double',
          setup(build) {
            build.onResolve(
              { filter: /^@\/stores\/settings-store$/ },
              () => ({ path: 'settings-store-test-double', namespace: 'test-double' })
            );
            build.onLoad(
              { filter: /.*/, namespace: 'test-double' },
              () => ({
                contents: 'export const useSettingsStore = { getState: () => globalThis.__aiConsentTestState };',
                loader: 'js',
              })
            );
          },
        },
      ],
    },
  });
}

test('requires consent for every third-party AI endpoint', async () => {
  const { endpointRequiresAIConsent } = await loadModule();

  for (const endpoint of [
    '/api/ask',
    '/api/detect-contact',
    '/api/extract',
    '/api/search',
    '/api/similarity/batch',
    '/api/summary',
    '/api/suggested-questions',
    '/api/transcribe',
    '/api/seed/generate',
    '/api/avatar/generate',
    '/api/avatar/generate-from-hints',
    '/api/avatar/user/generate',
  ]) {
    assert.equal(endpointRequiresAIConsent(endpoint), true, endpoint);
  }
});

test('does not block non-AI account and sync endpoints', async () => {
  const { endpointRequiresAIConsent } = await loadModule();

  for (const endpoint of [
    '/auth/account',
    '/api/sync/push',
    '/api/subscription/status',
    '/api/settings',
    '/api/avatar/upload',
  ]) {
    assert.equal(endpointRequiresAIConsent(endpoint), false, endpoint);
  }
});

test('opens consent only when an AI action requests it and resumes after acceptance', async () => {
  let promptRequests = 0;
  globalThis.__aiConsentTestState = {
    hasAcceptedAIConsent: false,
    aiConsentVersion: '2026-07-17',
    requestAIConsent: () => {
      promptRequests += 1;
    },
  };

  const { requireAIConsent, resolveAIConsentRequest } = await loadGateModule();
  const guardedAction = requireAIConsent();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(promptRequests, 1);
  resolveAIConsentRequest(true);
  await guardedAction;
});

test('cancels the guarded action when contextual consent is dismissed', async () => {
  globalThis.__aiConsentTestState = {
    hasAcceptedAIConsent: false,
    aiConsentVersion: '2026-07-17',
    requestAIConsent: () => {},
  };

  const { requireAIConsent, resolveAIConsentRequest } = await loadGateModule();
  const guardedAction = requireAIConsent();
  resolveAIConsentRequest(false);

  await assert.rejects(guardedAction, { name: 'AIConsentRequiredError' });
});

test.after(async () => {
  await cleanTsModule(suiteName);
  await cleanTsModule(gateSuiteName);
  delete globalThis.__aiConsentTestState;
});
