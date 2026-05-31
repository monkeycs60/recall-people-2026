import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const suiteName = 'catch-up';
const frontendRoot = resolve(__dirname, '..');
const localeCodes = ['en', 'fr', 'es', 'it', 'de'];

function contact(id, firstName) {
  return {
    id,
    firstName,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
  };
}

function topic(id, contactId, eventDate, status = 'active') {
  return {
    id,
    contactId,
    title: id,
    status,
    eventDate,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
  };
}

test('builds one catch-up item per active overdue topic, sorted by oldest due date first', async () => {
  const { getOverdueCatchupItems } = await loadTsModule({
    entryPoint: 'utils/catchup.ts',
    suiteName,
  });
  const contacts = [contact('contact-1', 'Nora'), contact('contact-2', 'Maya')];
  const previews = new Map([
    ['contact-1', {
      hotTopics: [
        topic('yesterday', 'contact-1', '2026-05-30'),
        topic('today', 'contact-1', '2026-05-31'),
        topic('resolved', 'contact-1', '2026-05-20', 'resolved'),
      ],
    }],
    ['contact-2', {
      hotTopics: [
        topic('older', 'contact-2', '2026-05-26'),
      ],
    }],
  ]);

  const items = getOverdueCatchupItems(contacts, previews, new Date('2026-05-31T12:00:00.000Z'));

  assert.deepEqual(
    items.map((item) => ({
      contactId: item.contact.id,
      topicId: item.topic.id,
      daysOverdue: item.daysOverdue,
    })),
    [
      { contactId: 'contact-2', topicId: 'older', daysOverdue: 5 },
      { contactId: 'contact-1', topicId: 'yesterday', daysOverdue: 1 },
    ]
  );
});

test('scopes a focused recording to the selected hot topic only', async () => {
  const { getRecordingHotTopics } = await loadTsModule({
    entryPoint: 'utils/recordingContext.ts',
    suiteName,
  });
  const activeTopics = [
    topic('topic-1', 'contact-1', '2026-05-26'),
    topic('topic-2', 'contact-1', '2026-05-27'),
  ];

  assert.deepEqual(
    getRecordingHotTopics(activeTopics, 'topic-2').map((item) => item.id),
    ['topic-2']
  );
  assert.deepEqual(
    getRecordingHotTopics(activeTopics, null).map((item) => item.id),
    ['topic-1', 'topic-2']
  );
  assert.deepEqual(
    getRecordingHotTopics(activeTopics, 'missing-topic').map((item) => item.id),
    ['topic-1', 'topic-2']
  );
});

test('home overdue banner opens the catch-up route instead of a contact profile', async () => {
  const source = await readFile(resolve(frontendRoot, 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(source, /router\.push\(['"]\/catch-up['"]\)/);
  assert.doesNotMatch(source, /handleOpenFirstOverdueContact/);
});

test('catch-up screen supports per-topic manual resolve and per-topic recording only', async () => {
  const source = await readFile(resolve(frontendRoot, 'app/catch-up.tsx'), 'utf8');

  assert.match(source, /hotTopicService\.resolve/);
  assert.match(source, /setPreselectedHotTopicId\(item\.topic\.id\)/);
  assert.match(source, /catchUp\.resolveTitle/);
  assert.match(source, /catchUp\.allCaughtUpTitle/);
  assert.doesNotMatch(source, /Record one note for all/i);
});

test('catch-up strings are translated in every supported language', async () => {
  const requiredKeys = [
    'title',
    'subtitle',
    'needsYouNow',
    'daysOverdue_one',
    'daysOverdue_other',
    'resolveTitle',
    'outcomeLabel',
    'outcomePlaceholder',
    'quickWentWell',
    'quickDidIt',
    'quickCancelled',
    'resolveAndSave',
    'resolveWithoutNote',
    'allCaughtUpTitle',
    'allCaughtUpBody',
    'backToContacts',
  ];

  for (const localeCode of localeCodes) {
    const localePath = resolve(frontendRoot, `locales/${localeCode}.json`);
    const locale = JSON.parse(await readFile(localePath, 'utf8'));

    for (const key of requiredKeys) {
      assert.equal(typeof locale.catchUp[key], 'string', `${localeCode}: ${key}`);
      assert.ok(locale.catchUp[key].trim().length > 0, `${localeCode}: ${key}`);
    }
  }
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
