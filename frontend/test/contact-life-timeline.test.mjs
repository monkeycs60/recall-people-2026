import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const suiteName = 'contact-life-timeline';
const comingUpScreenPath = resolve(__dirname, '../app/contact/[id]/coming-up.tsx');
const timelineEventEditSheetPath = resolve(__dirname, '../components/contact/TimelineEventEditSheet.tsx');
const localePaths = ['en', 'fr', 'es', 'de', 'it'].map((locale) =>
  resolve(__dirname, `../locales/${locale}.json`)
);

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/contactLifeTimeline.ts',
    suiteName,
  });
}

function topic(id, status, eventDate, resolvedAt, overrides = {}) {
  return {
    id,
    contactId: 'contact-1',
    title: id,
    context: `${id} context`,
    status,
    eventDate,
    resolvedAt,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

test('splits past topics before today and active upcoming topics after today in timeline order', async () => {
  const { getContactLifeTimelineSections } = await loadModule();
  const contact = {
    id: 'contact-1',
    firstName: 'Nora',
    hotTopics: [
      topic('overdue-active', 'active', '2026-05-29', undefined),
      topic('workshop', 'active', '2026-06-18', undefined),
      topic('oldest-resolved', 'resolved', '2026-06-01', '2026-05-13T12:00:00.000Z'),
      topic('latest-resolved', 'resolved', '2026-06-10', '2026-05-26T12:00:00.000Z'),
      topic('undated-resolved', 'resolved', undefined, undefined),
    ],
    birthdayDay: 8,
    birthdayMonth: 1,
    birthdayYear: 1993,
  };

  const sections = getContactLifeTimelineSections(contact, new Date('2026-06-01T12:00:00.000Z'));

  assert.deepEqual(sections.past.map((entry) => entry.id), [
    'oldest-resolved',
    'latest-resolved',
    'overdue-active',
  ]);
  assert.deepEqual(sections.upcoming.map((entry) => entry.id), [
    'workshop',
    'birthday-contact-1',
  ]);
  assert.equal(sections.past[0].timelineStatus, 'resolved');
  assert.equal(sections.past[2].timelineStatus, 'active');
  assert.equal(sections.upcoming[0].timelineStatus, 'active');
  assert.equal(sections.past[0].date.toISOString(), '2026-05-13T12:00:00.000Z');
});

test('keeps active undated topics visible in their own timeline section', async () => {
  const { getContactLifeTimelineSections } = await loadModule();
  const contact = {
    id: 'contact-1',
    firstName: 'Nora',
    hotTopics: [
      topic('dated', 'active', '2026-06-18', undefined),
      topic('older-undated', 'active', undefined, undefined, {
        createdAt: '2026-05-01T09:00:00.000Z',
        updatedAt: '2026-05-02T09:00:00.000Z',
      }),
      topic('recent-undated', 'active', undefined, undefined, {
        createdAt: '2026-05-03T09:00:00.000Z',
        updatedAt: '2026-05-04T09:00:00.000Z',
      }),
      topic('resolved-undated', 'resolved', undefined, undefined),
    ],
  };

  const sections = getContactLifeTimelineSections(contact, new Date('2026-06-01T12:00:00.000Z'));

  assert.deepEqual(sections.upcoming.map((entry) => entry.id), ['dated']);
  assert.deepEqual(sections.undated.map((entry) => entry.id), ['recent-undated', 'older-undated']);
});

test('contact life screen anchors initial scroll on the today marker', async () => {
  const source = await readFile(comingUpScreenPath, 'utf8');

  assert.match(source, /todayMarkerY/);
  assert.match(source, /scrollTo\(\{\s*y:\s*Math\.max\(0,\s*todayMarkerY - 8\),\s*animated:\s*false\s*\}\)/s);
  assert.match(source, /onLayout=\{\(event\) => setTodayMarkerY\(event\.nativeEvent\.layout\.y\)\}/);
});

test('marks birthday entries so the contact life screen can keep them read-only', async () => {
  const { getContactLifeTimelineSections } = await loadModule();
  const contact = {
    id: 'contact-1',
    firstName: 'Nora',
    hotTopics: [
      topic('birthday-party', 'active', '2026-06-08', undefined, {
        birthdayContactId: 'contact-1',
      }),
      topic('conference', 'active', '2026-07-12', undefined),
    ],
  };

  const sections = getContactLifeTimelineSections(contact, new Date('2026-06-01T12:00:00.000Z'));

  assert.equal(sections.upcoming.find((entry) => entry.id === 'birthday-party')?.isBirthday, true);
  assert.equal(sections.upcoming.find((entry) => entry.id === 'conference')?.isBirthday, false);
});

test('parses date-only event dates as local calendar dates', async () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'America/Los_Angeles';

  try {
    const { getContactLifeTimelineSections } = await loadModule();
    const contact = {
      id: 'contact-1',
      firstName: 'Nora',
      hotTopics: [
        topic('conference', 'active', '2026-06-18', undefined),
      ],
    };

    const sections = getContactLifeTimelineSections(contact, new Date('2026-06-01T12:00:00.000Z'));
    const [conference] = sections.upcoming;

    assert.equal(conference.date.getFullYear(), 2026);
    assert.equal(conference.date.getMonth(), 5);
    assert.equal(conference.date.getDate(), 18);
  } finally {
    if (previousTimezone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimezone;
    }
  }
});

test('contact life screen exposes editing only for active non-birthday timeline events', async () => {
  const source = await readFile(comingUpScreenPath, 'utf8');

  assert.match(source, /isBirthday:\s*entry\.isBirthday/);
  assert.match(source, /timelineSections\.past\.map/);
  assert.match(source, /timelineSections\.undated\.map/);
  assert.match(source, /contactComingUp\.undatedSection/);
  assert.match(source, /canEdit=\{entry\.timelineStatus === 'active' && !entry\.isBirthday\}/);
  assert.match(source, /onEdit=\{handleEditTimelineEntry\}/);
  assert.match(source, /TimelineEventEditSheet/);
});

test('contact life screen saves edited events and refreshes their reminders', async () => {
  const source = await readFile(comingUpScreenPath, 'utf8');

  assert.match(source, /useUpdateHotTopic\(/);
  assert.match(source, /notificationService\.cancelEventRemindersByEventId\(entry\.id\)/);
  assert.match(source, /if \(values\.eventDate\) \{\s*await notificationService\.scheduleEventReminder\(\s*entry\.id,\s*values\.eventDate,\s*values\.title,/s);
});

test('timeline event edit sheet edits title, context, and date', async () => {
  const source = await readFile(timelineEventEditSheetPath, 'utf8');

  assert.match(source, /BottomSheetModal/);
  assert.match(source, /BottomSheetTextInput/);
  assert.match(source, /DateTimePicker/);
  assert.match(source, /contactComingUp\.editEventTitle/);
  assert.match(source, /contactComingUp\.eventDate/);
});

test('timeline event edit sheet preserves an absent date until the user selects one', async () => {
  const source = await readFile(timelineEventEditSheetPath, 'utf8');

  assert.match(source, /eventDate\?: string/);
  assert.match(source, /useState\(\(\) => cloneDate\(event\?\.date\)\)/);
  assert.match(source, /eventDate: date \? formatDateForStorage\(date\) : undefined/);
  assert.match(source, /contactComingUp\.undated/);
});

test('timeline event edit sheet opens compact instead of expanding for keyboard focus', async () => {
  const source = await readFile(timelineEventEditSheetPath, 'utf8');

  assert.match(source, /keyboardBehavior="interactive"/);
  assert.doesNotMatch(source, /keyboardBehavior="fillParent"/);
  assert.doesNotMatch(source, /\sautoFocus\b/);
  assert.doesNotMatch(source, /'72%'/);
});

test('timeline event edit strings are translated in every supported locale', async () => {
  for (const localePath of localePaths) {
    const source = await readFile(localePath, 'utf8');
    const translations = JSON.parse(source);

    for (const key of [
      'editEventTitle',
      'eventTitleLabel',
      'eventTitlePlaceholder',
      'eventContextLabel',
      'eventContextPlaceholder',
      'eventDate',
      'undated',
      'undatedSection',
    ]) {
      assert.equal(typeof translations.contactComingUp[key], 'string', `${localePath} missing ${key}`);
    }
  }
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
