import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'hot-topics';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/hotTopics.ts',
    suiteName,
  });
}

function topic(id, eventDate, updatedAt = '2026-01-01T10:00:00.000Z') {
  return {
    id,
    contactId: 'contact-1',
    title: id,
    status: 'active',
    eventDate,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt,
  };
}

test('sorts dated hot topics from newest to oldest and undated topics last', async () => {
  const { sortHotTopicsByEventDateDesc } = await loadModule();
  const input = [
    topic('undated-newer', undefined, '2026-05-05T10:00:00.000Z'),
    topic('older', '2026-06-03'),
    topic('newer', '2026-07-14'),
    topic('undated-older', undefined, '2026-05-01T10:00:00.000Z'),
  ];

  assert.deepEqual(
    sortHotTopicsByEventDateDesc(input).map((item) => item.id),
    ['newer', 'older', 'undated-newer', 'undated-older']
  );
  assert.deepEqual(
    input.map((item) => item.id),
    ['undated-newer', 'older', 'newer', 'undated-older']
  );
});

test('keeps only the next birthday topic per contact', async () => {
  const { filterToNextBirthdayTopic } = await loadModule();
  const input = [
    topic('regular', '2026-06-03'),
    { ...topic('birthday-2027', '2027-07-08'), birthdayContactId: 'contact-1' },
    { ...topic('birthday-2026', '2026-07-08'), birthdayContactId: 'contact-1' },
    { ...topic('birthday-past', '2025-07-08'), birthdayContactId: 'contact-1' },
  ];

  assert.deepEqual(
    filterToNextBirthdayTopic(input, new Date('2026-05-27T12:00:00.000Z')).map((item) => item.id),
    ['regular', 'birthday-2026']
  );
});

test('maps hot topic dates to neutral chips with deadline accents', async () => {
  const { getHotTopicDateTone } = await loadModule();
  const now = new Date('2026-05-31T12:00:00.000Z');

  assert.equal(getHotTopicDateTone('2026-05-30', now).name, 'overdue');
  assert.equal(getHotTopicDateTone('2026-05-31', now).name, 'imminent');
  assert.equal(getHotTopicDateTone('2026-06-02', now).name, 'imminent');
  assert.equal(getHotTopicDateTone('2026-06-05', now).name, 'thisWeek');
  assert.equal(getHotTopicDateTone('2026-06-20', now).name, 'thisMonth');
  assert.equal(getHotTopicDateTone('2026-08-15', now).name, 'thisQuarter');
  assert.equal(getHotTopicDateTone('2026-09-15', now).name, 'later');
  assert.equal(getHotTopicDateTone(undefined, now).name, 'undated');
  assert.equal(getHotTopicDateTone('not-a-date', now).name, 'undated');

  assert.deepEqual(
    [
      getHotTopicDateTone(undefined, now).backgroundColor,
      getHotTopicDateTone('2026-09-15', now).backgroundColor,
      getHotTopicDateTone('2026-08-15', now).backgroundColor,
      getHotTopicDateTone('2026-06-20', now).backgroundColor,
      getHotTopicDateTone('2026-06-05', now).backgroundColor,
      getHotTopicDateTone('2026-05-31', now).backgroundColor,
      getHotTopicDateTone('2026-05-30', now).backgroundColor,
    ],
    ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']
  );

  assert.deepEqual(
    [
      getHotTopicDateTone('2026-05-30', now).accentColor,
      getHotTopicDateTone('2026-05-31', now).accentColor,
      getHotTopicDateTone('2026-06-05', now).accentColor,
      getHotTopicDateTone('2026-06-20', now).accentColor,
      getHotTopicDateTone('2026-08-15', now).accentColor,
      getHotTopicDateTone('2026-09-15', now).accentColor,
      getHotTopicDateTone(undefined, now).accentColor,
    ],
    ['#D9483B', '#F05A3C', '#CF8A12', '#3478C8', '#5A86D9', '#9AA1B5', '#8E8AA3']
  );
});

test('counts only active overdue hot topics', async () => {
  const { countOverdueHotTopics, isHotTopicOverdue } = await loadModule();
  const now = new Date('2026-05-31T12:00:00.000Z');
  const input = [
    topic('yesterday', '2026-05-30'),
    topic('today', '2026-05-31'),
    topic('tomorrow', '2026-06-01'),
    topic('undated', undefined),
    { ...topic('resolved-yesterday', '2026-05-30'), status: 'resolved' },
  ];

  assert.equal(isHotTopicOverdue('2026-05-30', now), true);
  assert.equal(isHotTopicOverdue('2026-05-31', now), false);
  assert.equal(isHotTopicOverdue(undefined, now), false);
  assert.equal(countOverdueHotTopics(input, now), 1);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
