import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '..');
const requireFromBackend = createRequire(resolve(frontendRoot, '../backend/package.json'));
const esbuild = requireFromBackend('esbuild');
const outdir = resolve(frontendRoot, '.tmp-tests');
const outfile = resolve(outdir, 'auth-onboarding.mjs');

async function loadModule() {
  await rm(outdir, { force: true, recursive: true });
  await mkdir(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [resolve(frontendRoot, 'lib/auth-onboarding.ts')],
    outfile,
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('resets first-run settings when auth response says the user is new', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(shouldResetFirstRunSettings({ isNewUser: true }), true);
});

test('does not reset first-run settings for returning auth users', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(shouldResetFirstRunSettings({ isNewUser: false }), false);
});

test('can assume explicit credential registration is new when older APIs omit the flag', async () => {
  const { shouldResetFirstRunSettings } = await loadModule();

  assert.equal(
    shouldResetFirstRunSettings({}, { assumeNewUserWhenMissing: true }),
    true,
  );
});

test.after(async () => {
  await rm(outdir, { force: true, recursive: true });
});
