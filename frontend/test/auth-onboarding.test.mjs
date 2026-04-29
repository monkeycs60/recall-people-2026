import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'auth-onboarding';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/auth-onboarding.ts',
    suiteName,
  });
}

test('resets first-run settings when auth response says the user is new', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(shouldResetFirstRunSettings({ isNewUser: true }), true);
});

test('does not reset first-run settings for returning auth users', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(shouldResetFirstRunSettings({ isNewUser: false }), false);
});

test('does not let the missing-flag fallback override an explicit returning user', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(
    shouldResetFirstRunSettings(
      { isNewUser: false },
      { assumeNewUserWhenMissing: true },
    ),
    false,
  );
});

test('can assume explicit credential registration is new when older APIs omit the flag', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(
    shouldResetFirstRunSettings({}, { assumeNewUserWhenMissing: true }),
    true,
  );
});

test('defaults to keeping first-run settings when the auth response omits the new-user flag', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(shouldResetFirstRunSettings({}), false);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
