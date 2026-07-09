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
  const expected = new Date('2026-05-01T08:30:00+02:00').toISOString();

  assert.equal(getNotSeenReminderTriggerDate(now).toISOString(), expected);
  assert.equal(getPostEventFollowUpTriggerDate(now).toISOString(), expected);
});

test('parses and formats reminder times with fallback', async () => {
  const { parseReminderTime, formatReminderTime, DEFAULT_EVENING_REMINDER_TIME } = await loadModule();

  assert.deepEqual(parseReminderTime('19:00', DEFAULT_EVENING_REMINDER_TIME), { hour: 19, minute: 0 });
  assert.deepEqual(parseReminderTime('8:30', DEFAULT_EVENING_REMINDER_TIME), { hour: 8, minute: 30 });
  assert.deepEqual(parseReminderTime('25:00', DEFAULT_EVENING_REMINDER_TIME), DEFAULT_EVENING_REMINDER_TIME);
  assert.deepEqual(parseReminderTime('garbage', DEFAULT_EVENING_REMINDER_TIME), DEFAULT_EVENING_REMINDER_TIME);
  assert.equal(formatReminderTime({ hour: 8, minute: 30 }), '08:30');
});

test('event evening reminder honors a custom evening time', async () => {
  const { getEventReminderTriggerDate } = await loadModule();

  assert.equal(
    getEventReminderTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00'),
      { hour: 20, minute: 15 }
    )?.toISOString(),
    new Date('2026-05-06T20:15:00+02:00').toISOString()
  );
});

test('schedules a morning-of-event reminder at the configured morning time', async () => {
  const { getEventDayMorningTriggerDate } = await loadModule();

  assert.equal(
    getEventDayMorningTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00')
    )?.toISOString(),
    new Date('2026-05-07T08:30:00+02:00').toISOString()
  );

  assert.equal(
    getEventDayMorningTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-07T09:00:00+02:00')
    ),
    null
  );
});

test('schedules a birthday week-ahead reminder 7 days before at morning time', async () => {
  const { getBirthdayWeekAheadTriggerDate } = await loadModule();

  assert.equal(
    getBirthdayWeekAheadTriggerDate(
      '2026-05-14T00:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00')
    )?.toISOString(),
    new Date('2026-05-07T08:30:00+02:00').toISOString()
  );

  assert.equal(
    getBirthdayWeekAheadTriggerDate(
      '2026-05-14T00:00:00+02:00',
      new Date('2026-05-08T10:00:00+02:00')
    ),
    null
  );
});

test('next morning occurrence is today before the slot, tomorrow after', async () => {
  const { getNextMorningOccurrence } = await loadModule();

  assert.equal(
    getNextMorningOccurrence(new Date('2026-05-05T07:00:00+02:00'), { hour: 8, minute: 30 }).toISOString(),
    new Date('2026-05-05T08:30:00+02:00').toISOString()
  );
  assert.equal(
    getNextMorningOccurrence(new Date('2026-05-05T21:00:00+02:00'), { hour: 8, minute: 30 }).toISOString(),
    new Date('2026-05-06T08:30:00+02:00').toISOString()
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});

