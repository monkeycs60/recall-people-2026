import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'birthday-hot-topics';

const stubPlugin = {
  name: 'birthday-hot-topic-stubs',
  setup(build) {
    const stubs = new Map([
      ['expo-crypto', `
        let counter = 0;
        export function randomUUID() {
          counter += 1;
          return 'birthday-id-' + counter;
        }
      `],
      ['@/lib/db', `
        export async function getDatabase() {
          return globalThis.__birthdayHotTopicDb;
        }
      `],
      ['@/lib/i18n', `
        export default {
          t(key, params) {
            return key === 'upcoming.birthdayTitle'
              ? params.firstName + "'s birthday"
              : key;
          },
        };
      `],
      ['@/services/notification.service', 'export const notificationService = {};'],
      ['@/lib/analytics', `
        export const analytics = { capture() {} };
        export const AnalyticsEvent = { HOT_TOPIC_RESOLVED: 'hot_topic_resolved' };
      `],
      ['./sync-queue.service', `
        export const syncQueueService = {
          async enqueueMutation(payload) {
            globalThis.__birthdayHotTopicQueue.push(payload);
          },
        };
      `],
    ]);

    for (const specifier of stubs.keys()) {
      build.onResolve({ filter: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, () => ({
        path: specifier,
        namespace: 'birthday-hot-topic-stub',
      }));
    }

    build.onLoad({ filter: /.*/, namespace: 'birthday-hot-topic-stub' }, (args) => ({
      contents: stubs.get(args.path) ?? 'export {};',
      loader: 'js',
    }));
  },
};

async function loadModule() {
  return loadTsModule({
    entryPoint: 'services/hot-topic.service.ts',
    suiteName,
    esbuildOptions: {
      plugins: [stubPlugin],
    },
  });
}

function installDbStub(options = {}) {
  const insertedRows = new Map();
  const insertArgs = [];
  const expiredBirthdays = options.expiredBirthdays ?? [];
  const contacts = options.contacts ?? new Map();
  globalThis.__birthdayHotTopicQueue = [];
  globalThis.__birthdayHotTopicDb = {
    async getAllAsync(query) {
      if (query.includes('birthday_contact_id IS NOT NULL') && query.includes('event_date <')) {
        return expiredBirthdays;
      }
      return [];
    },
    async getFirstAsync(query, args) {
      if (query.includes('SELECT first_name')) {
        return contacts.get(args[0]) ?? null;
      }
      return insertedRows.get(args[0]) ?? null;
    },
    async runAsync(query, args) {
      if (!query.includes('INSERT INTO hot_topics')) return;

      insertArgs.push(args);
      const [
        id,
        contactId,
        title,
        context,
        status,
        eventDate,
        birthdayContactId,
        createdAt,
        updatedAt,
      ] = args;
      insertedRows.set(id, {
        id,
        contact_id: contactId,
        title,
        context,
        resolution: null,
        status,
        source_note_id: null,
        event_date: eventDate,
        notified_at: null,
        birthday_contact_id: birthdayContactId,
        created_at: createdAt,
        updated_at: updatedAt,
        resolved_at: null,
        deleted_at: null,
      });
    },
  };

  return { insertArgs };
}

test('birthday sync creates only the next birthday occurrence', async () => {
  const { hotTopicService } = await loadModule();
  const { insertArgs } = installDbStub();

  await hotTopicService.syncBirthdayHotTopics('contact-1', 'Nora', 8, 7);

  assert.equal(insertArgs.length, 1);
  assert.equal(insertArgs[0][6], 'contact-1');
});

test('birthday cleanup regenerates the next occurrence after the current birthday passes', async () => {
  const { hotTopicService } = await loadModule();
  const { insertArgs } = installDbStub({
    expiredBirthdays: [{ id: 'expired-birthday', birthday_contact_id: 'contact-1' }],
    contacts: new Map([
      ['contact-1', { first_name: 'Nora', birthday_day: 8, birthday_month: 7 }],
    ]),
  });

  await hotTopicService.cleanupPastBirthdays();

  assert.equal(insertArgs.length, 1);
  assert.equal(insertArgs[0][6], 'contact-1');
});

test('parseExtractedDate accepts valid past dates for overdue topics', async () => {
  const { hotTopicService } = await loadModule();

  const parsed = hotTopicService.parseExtractedDate('07/06/2026');
  assert.ok(parsed);

  const date = new Date(parsed);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 5);
  assert.equal(date.getDate(), 7);
  assert.equal(hotTopicService.parseExtractedDate('31/02/2026'), null);
});

test.after(async () => {
  delete globalThis.__birthdayHotTopicDb;
  delete globalThis.__birthdayHotTopicQueue;
  await cleanTsModule(suiteName);
});
