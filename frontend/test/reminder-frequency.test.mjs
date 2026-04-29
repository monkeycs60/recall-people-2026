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
const outdir = resolve(frontendRoot, '.tmp-tests', 'reminder-frequency');
const outfile = resolve(outdir, 'reminder-frequency.mjs');

async function loadModule() {
  await rm(outdir, { force: true, recursive: true });
  await mkdir(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [resolve(frontendRoot, 'lib/reminder-frequency.ts')],
    outfile,
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('exposes granular reminder presets shared by settings and contacts', async () => {
  const { REMINDER_FREQUENCY_PRESETS } = await loadModule();

  assert.deepEqual(REMINDER_FREQUENCY_PRESETS, [7, 14, 30, 60, 90, 180, 365]);
});

test('uses the account default only when the contact has no override', async () => {
  const { getEffectiveReminderFrequencyDays } = await loadModule();

  assert.equal(getEffectiveReminderFrequencyDays(null, 60), 60);
  assert.equal(getEffectiveReminderFrequencyDays(14, 60), 14);
  assert.equal(getEffectiveReminderFrequencyDays(-1, 60), -1);
});

test('keeps explicit contact reminders active when the account default is disabled', async () => {
  const { buildStaleContactReminderFilter, getEffectiveReminderFrequencyDays } = await loadModule();

  const filter = buildStaleContactReminderFilter(0);

  assert.equal(getEffectiveReminderFrequencyDays(null, 0), -1);
  assert.deepEqual(filter.params, []);
  assert.match(filter.whereSql, /reminder_frequency_days > 0/);
  assert.doesNotMatch(filter.whereSql, /reminder_frequency_days IS NULL/);
});

test('includes default contacts in stale reminders when the account default is enabled', async () => {
  const { buildStaleContactReminderFilter } = await loadModule();

  const filter = buildStaleContactReminderFilter(90);

  assert.deepEqual(filter.params, [90]);
  assert.match(filter.whereSql, /reminder_frequency_days IS NULL/);
});

test.after(async () => {
  await rm(outdir, { force: true, recursive: true });
});
