import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'notification-schedule';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/notification-schedule.ts',
    suiteName,
  });
}

test('builds explicit Expo date triggers', async () => {
  const { buildDateNotificationTrigger } = await loadModule();
  const date = new Date('2026-05-04T09:00:00+02:00');

  assert.deepEqual(buildDateNotificationTrigger(date), {
    type: 'date',
    date,
  });
});

test('schedules event reminders the day before at 19:00', async () => {
  const { getEventReminderTriggerDate } = await loadModule();

  assert.equal(
    getEventReminderTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00')
    )?.toISOString(),
    new Date('2026-05-06T19:00:00+02:00').toISOString()
  );
});

test('does not schedule event reminders in the past', async () => {
  const { getEventReminderTriggerDate } = await loadModule();

  assert.equal(
    getEventReminderTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-06T20:00:00+02:00')
    ),
    null
  );
});

test('uses the current Monday when digest is enabled before 09:00', async () => {
  const { getWeeklyDigestTriggerDate } = await loadModule();

  assert.equal(
    getWeeklyDigestTriggerDate(new Date('2026-05-04T08:30:00+02:00')).toISOString(),
    new Date('2026-05-04T09:00:00+02:00').toISOString()
  );
});

test('uses next Monday when digest is enabled after the weekly slot', async () => {
  const { getWeeklyDigestTriggerDate } = await loadModule();

  assert.equal(
    getWeeklyDigestTriggerDate(new Date('2026-05-04T09:01:00+02:00')).toISOString(),
    new Date('2026-05-11T09:00:00+02:00').toISOString()
  );
});

test('schedules follow-up reminders tomorrow morning', async () => {
  const { getNotSeenReminderTriggerDate, getPostEventFollowUpTriggerDate } = await loadModule();
  const now = new Date('2026-04-30T18:20:00+02:00');
  const expected = new Date('2026-05-01T10:00:00+02:00').toISOString();

  assert.equal(getNotSeenReminderTriggerDate(now).toISOString(), expected);
  assert.equal(getPostEventFollowUpTriggerDate(now).toISOString(), expected);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});

