import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'contact-sort';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/contactSort.ts',
    suiteName,
  });
}

function contact(id, firstName, overrides = {}) {
  return {
    id,
    firstName,
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  };
}

function topic(id, contactId, overrides = {}) {
  return {
    id,
    contactId,
    title: id,
    status: 'active',
    createdAt: '2026-01-01T09:00:00.000Z',
    updatedAt: '2026-01-01T09:00:00.000Z',
    ...overrides,
  };
}

test('sorts by most recent contact interaction by default', async () => {
  const { CONTACT_SORT_DEFAULT_MODE, sortContacts } = await loadModule();
  const contacts = [
    contact('old', 'Nora', { lastContactAt: '2026-05-01T09:00:00.000Z' }),
    contact('new', 'Maya', { lastContactAt: '2026-05-31T09:00:00.000Z' }),
    contact('none', 'Alex'),
  ];

  assert.equal(CONTACT_SORT_DEFAULT_MODE, 'recent-contact');
  assert.deepEqual(
    sortContacts(contacts, new Map(), CONTACT_SORT_DEFAULT_MODE).map((item) => item.id),
    ['new', 'old', 'none']
  );
});

test('does not expose the removed hot topic sort mode', async () => {
  const { CONTACT_SORT_MODES, isContactSortMode } = await loadModule();

  assert.equal(CONTACT_SORT_MODES.includes('hot-topics'), false);
  assert.equal(isContactSortMode('hot-topics'), false);
});

test('sorts by nearest upcoming deadline', async () => {
  const { sortContacts } = await loadModule();
  const contacts = [contact('nora', 'Nora'), contact('maya', 'Maya'), contact('alex', 'Alex')];
  const previews = new Map([
    ['nora', { hotTopics: [topic('nora-event', 'nora', { eventDate: '2026-06-20' })] }],
    ['maya', { hotTopics: [topic('maya-event', 'maya', { eventDate: '2026-06-05' })] }],
  ]);

  assert.deepEqual(
    sortContacts(contacts, previews, 'next-deadline', new Date('2026-06-03T12:00:00.000Z')).map((item) => item.id),
    ['maya', 'nora', 'alex']
  );
});

test('sorts overdue contacts by oldest missed event first', async () => {
  const { sortContacts } = await loadModule();
  const contacts = [contact('nora', 'Nora'), contact('maya', 'Maya'), contact('alex', 'Alex')];
  const previews = new Map([
    ['nora', { hotTopics: [topic('nora-overdue', 'nora', { eventDate: '2026-05-31' })] }],
    ['maya', { hotTopics: [topic('maya-overdue', 'maya', { eventDate: '2026-05-20' })] }],
    ['alex', { hotTopics: [topic('alex-future', 'alex', { eventDate: '2026-06-10' })] }],
  ]);

  assert.deepEqual(
    sortContacts(contacts, previews, 'overdue', new Date('2026-06-03T12:00:00.000Z')).map((item) => item.id),
    ['maya', 'nora', 'alex']
  );
});

test('sorts birthday contacts by next birthday occurrence', async () => {
  const { sortContacts } = await loadModule();
  const contacts = [
    contact('july', 'Nora', { birthdayDay: 2, birthdayMonth: 7 }),
    contact('june', 'Maya', { birthdayDay: 10, birthdayMonth: 6 }),
    contact('none', 'Alex'),
  ];

  assert.deepEqual(
    sortContacts(contacts, new Map(), 'upcoming-birthday', new Date('2026-06-03T12:00:00.000Z')).map((item) => item.id),
    ['june', 'july', 'none']
  );
});

test('sorts alphabetically by display name', async () => {
  const { sortContacts } = await loadModule();
  const contacts = [
    contact('z', 'Zoey'),
    contact('a', 'Alex'),
    contact('m', 'Maya'),
  ];

  assert.deepEqual(
    sortContacts(contacts, new Map(), 'alphabetical').map((item) => item.id),
    ['a', 'm', 'z']
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
