import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'reminder-frequency';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/reminder-frequency.ts',
    suiteName,
  });
}

test('exposes granular reminder presets shared by settings and contacts', async () => {
  const { REMINDER_FREQUENCY_PRESETS } = await loadModule();

  assert.deepEqual(REMINDER_FREQUENCY_PRESETS, [7, 14, 30, 60, 90, 180, 365]);
});

test('uses the account default only when the contact has no override', async () => {
  const { getEffectiveReminderFrequencyDays } = await loadModule();

  assert.equal(getEffectiveReminderFrequencyDays(null, 60), 60);
  assert.equal(getEffectiveReminderFrequencyDays(undefined, 60), 60);
  assert.equal(getEffectiveReminderFrequencyDays(14, 60), 14);
  assert.equal(getEffectiveReminderFrequencyDays(-1, 60), -1);
});

test('treats zero and unsupported negative contact overrides as account defaults', async () => {
  const { getEffectiveReminderFrequencyDays } = await loadModule();

  assert.equal(getEffectiveReminderFrequencyDays(0, 30), 30);
  assert.equal(getEffectiveReminderFrequencyDays(-2, 30), 30);
});

test('keeps explicit contact reminders active when the account default is disabled', async () => {
  const { buildStaleContactReminderFilter, getEffectiveReminderFrequencyDays } = await loadModule();

  const filter = buildStaleContactReminderFilter(0);

  assert.equal(getEffectiveReminderFrequencyDays(null, 0), -1);
  assert.deepEqual(filter.params, []);
  assert.match(filter.whereSql, /reminder_frequency_days > 0/);
  assert.doesNotMatch(filter.whereSql, /reminder_frequency_days IS NULL/);
  assert.doesNotMatch(filter.whereSql, /\?/);
});

test('includes default contacts in stale reminders when the account default is enabled', async () => {
  const { buildStaleContactReminderFilter } = await loadModule();

  const filter = buildStaleContactReminderFilter(90);

  assert.deepEqual(filter.params, [90]);
  assert.match(filter.whereSql, /reminder_frequency_days IS NULL/);
  assert.match(filter.whereSql, /\?/);
});

test('uses inclusive thresholds so UI stale state and reminders agree', async () => {
  const { buildStaleContactReminderFilter } = await loadModule();

  const filter = buildStaleContactReminderFilter(60);

  assert.match(filter.whereSql, />= reminder_frequency_days/);
  assert.match(filter.whereSql, />= \?/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
