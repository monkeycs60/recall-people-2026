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

test.after(async () => {
  await cleanTsModule(suiteName);
});
