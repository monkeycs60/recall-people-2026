import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-routes';
const testUser = { id: 'user-1', email: 'ada@example.com', name: 'Ada' };

function validContactMutation(overrides = {}) {
  const now = '2026-05-09T10:00:00.000Z';
  return {
    id: 'mutation-contact-1',
    entityType: 'contact',
    entityId: 'contact-1',
    operation: 'upsert',
    createdAt: now,
    payload: {
      id: 'contact-1',
      firstName: 'Ada',
      lastName: null,
      gender: 'unknown',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    ...overrides,
  };
}

function validNoteMutation(overrides = {}) {
  const now = '2026-05-09T10:01:00.000Z';
  return {
    id: 'mutation-note-1',
    entityType: 'note',
    entityId: 'note-1',
    operation: 'upsert',
    createdAt: now,
    payload: {
      id: 'note-1',
      contactId: 'contact-1',
      title: 'Coffee',
      transcription: 'Talked about the analytical engine',
      audioDurationMs: 1234,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    ...overrides,
  };
}

function validInitializeBody() {
  return { mutations: [validContactMutation()] };
}

async function loadSyncRoutes() {
  return loadTsModule({
    entryPoint: 'src/routes/sync.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      plugins: [{
        name: 'sync-route-test-deps',
        setup(build) {
          build.onResolve({ filter: /^\.\.\/middleware\/auth$/ }, () => ({ path: 'auth-mock', namespace: 'sync-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/db$/ }, () => ({ path: 'db-mock', namespace: 'sync-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/sync-encryption$/ }, () => ({ path: 'encryption-mock', namespace: 'sync-test' }));
          build.onLoad({ filter: /^auth-mock$/, namespace: 'sync-test' }, () => ({
            loader: 'js',
            contents: 'export const authMiddleware = async (c, next) => { c.set("user", globalThis.__syncTestUser); await next(); };',
          }));
          build.onLoad({ filter: /^db-mock$/, namespace: 'sync-test' }, () => ({
            loader: 'js',
            contents: 'export const getPrisma = () => globalThis.__syncTestPrisma;',
          }));
          build.onLoad({ filter: /^encryption-mock$/, namespace: 'sync-test' }, () => ({
            loader: 'js',
            contents: `
              export const encryptString = async (_key, value) => "encrypted:" + value;
              export const decryptString = async (_key, value) => value.replace(/^encrypted:/, "");
              export const encryptNullableString = async (_key, value) => value == null ? null : "encrypted:" + value;
              export const decryptNullableString = async (_key, value) => value == null ? null : value.replace(/^encrypted:/, "");
              export const encryptJson = async (_key, value) => "encrypted:" + JSON.stringify(value);
              export const decryptJson = async (_key, value) => JSON.parse(value.replace(/^encrypted:/, ""));
            `,
          }));
        },
      }],
    },
  });
}

async function requestSync(path, prisma, options = {}) {
  globalThis.__syncTestUser = options.user ?? testUser;
  globalThis.__syncTestPrisma = prisma;
  const { syncRoutes } = await loadSyncRoutes();
  const app = new Hono();
  app.route('/api/sync', syncRoutes);

  return app.request(path, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }, {
    DATABASE_URL: 'postgres://test',
    JWT_SECRET: 'test-secret',
    SYNC_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  });
}

test('GET /bootstrap reports empty server state for a new account', async () => {
  const prisma = {
    syncChange: {
      findFirst: async (args) => {
        assert.deepEqual(args.where, { userId: testUser.id });
        return null;
      },
    },
  };

  const response = await requestSync('/api/sync/bootstrap', prisma);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    hasServerData: false,
    cursor: '0',
  });
});

test('POST /initialize rejects when server already has data', async () => {
  const prisma = {
    syncChange: {
      findFirst: async () => ({ sequence: 7n }),
    },
  };

  const response = await requestSync('/api/sync/initialize', prisma, {
    method: 'POST',
    body: validInitializeBody(),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'Server sync state already exists' });
});

test('POST /initialize encrypts sensitive contact fields and creates changes in a transaction', async () => {
  const calls = [];
  const prisma = {
    syncChange: {
      findFirst: async () => null,
    },
    $transaction: async (callback) => {
      return callback({
        syncedContact: {
          findFirst: async (args) => {
            calls.push(['contact.findFirst', args]);
            return null;
          },
          upsert: async (args) => {
            calls.push(['contact.upsert', args]);
            return args.create;
          },
        },
        syncChange: {
          create: async (args) => {
            calls.push(['change.create', args]);
            return { sequence: 12n };
          },
        },
      });
    },
  };

  const response = await requestSync('/api/sync/initialize', prisma, {
    method: 'POST',
    body: { mutations: [validContactMutation()] },
  });
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(json, { cursor: '12', appliedMutationIds: ['mutation-contact-1'] });
  assert.equal(calls[0][0], 'contact.findFirst');
  assert.deepEqual(calls[0][1].where, { id: 'contact-1' });
  assert.equal(calls[1][0], 'contact.upsert');
  assert.equal(calls[1][1].where.id, 'contact-1');
  assert.equal(calls[1][1].create.userId, testUser.id);
  assert.equal(calls[1][1].create.encryptedFirstName, 'encrypted:Ada');
  assert.equal(calls[1][1].create.firstName, undefined);
  assert.deepEqual(calls[2][1].data, {
    userId: testUser.id,
    entityType: 'contact',
    entityId: 'contact-1',
    operation: 'upsert',
  });
});

test('POST /push scopes ownership checks by authenticated user before mutating notes', async () => {
  const calls = [];
  const prisma = {
    $transaction: async (callback) => {
      return callback({
        syncedContact: {
          findFirst: async (args) => {
            calls.push(['contact.findFirst', args]);
            return { id: 'contact-1', userId: testUser.id };
          },
        },
        syncedNote: {
          findFirst: async (args) => {
            calls.push(['note.findFirst', args]);
            return null;
          },
          upsert: async (args) => {
            calls.push(['note.upsert', args]);
            return args.create;
          },
        },
        syncChange: {
          create: async (args) => {
            calls.push(['change.create', args]);
            return { sequence: 20n };
          },
        },
      });
    },
  };

  const response = await requestSync('/api/sync/push', prisma, {
    method: 'POST',
    body: { mutations: [validNoteMutation()] },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { cursor: '20', appliedMutationIds: ['mutation-note-1'] });
  assert.deepEqual(calls[0][1].where, { id: 'contact-1', userId: testUser.id });
  assert.deepEqual(calls[1][1].where, { id: 'note-1' });
  assert.equal(calls[2][1].create.userId, testUser.id);
  assert.equal(calls[2][1].create.encryptedTranscription, 'encrypted:Talked about the analytical engine');
});

test('POST /push rejects mutations that reference another user row', async () => {
  const prisma = {
    $transaction: async (callback) => {
      return callback({
        syncedContact: {
          findFirst: async () => null,
        },
      });
    },
  };

  const response = await requestSync('/api/sync/push', prisma, {
    method: 'POST',
    body: { mutations: [validNoteMutation()] },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'Referenced contact does not belong to user' });
});

test('GET /changes returns decrypted changes after a cursor', async () => {
  const prisma = {
    syncChange: {
      findMany: async (args) => {
        assert.deepEqual(args.where, { userId: testUser.id, sequence: { gt: 5n } });
        return [
          { sequence: 6n, entityType: 'contact', entityId: 'contact-1', operation: 'upsert' },
          { sequence: 7n, entityType: 'note', entityId: 'note-1', operation: 'delete' },
        ];
      },
    },
    syncedContact: {
      findFirst: async (args) => {
        assert.deepEqual(args.where, { id: 'contact-1', userId: testUser.id });
        return {
          id: 'contact-1',
          encryptedFirstName: 'encrypted:Ada',
          encryptedLastName: null,
          encryptedNickname: null,
          encryptedPhone: null,
          encryptedEmail: null,
          encryptedAiSummary: null,
          encryptedSuggestedQuestions: null,
          encryptedMeetingContext: null,
          avatarUrl: null,
          gender: 'unknown',
          birthdayDay: null,
          birthdayMonth: null,
          birthdayYear: null,
          reminderFrequencyDays: null,
          lastContactAt: null,
          createdAt: new Date('2026-05-09T10:00:00.000Z'),
          updatedAt: new Date('2026-05-09T10:00:00.000Z'),
          deletedAt: null,
        };
      },
    },
    syncedNote: {
      findFirst: async () => ({
        id: 'note-1',
        contactId: 'contact-1',
        encryptedTitle: 'encrypted:Coffee',
        encryptedTranscription: 'encrypted:Deleted note',
        audioDurationMs: null,
        createdAt: new Date('2026-05-09T10:01:00.000Z'),
        updatedAt: new Date('2026-05-09T10:02:00.000Z'),
        deletedAt: new Date('2026-05-09T10:03:00.000Z'),
      }),
    },
  };

  const response = await requestSync('/api/sync/changes?cursor=5', prisma);
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.cursor, '7');
  assert.deepEqual(json.changes.map((change) => ({
    sequence: change.sequence,
    entityType: change.entityType,
    operation: change.operation,
    firstName: change.payload.firstName,
    transcription: change.payload.transcription,
  })), [
    { sequence: '6', entityType: 'contact', operation: 'upsert', firstName: 'Ada', transcription: undefined },
    { sequence: '7', entityType: 'note', operation: 'delete', firstName: undefined, transcription: 'Deleted note' },
  ]);
});

test.after(async () => {
  delete globalThis.__syncTestUser;
  delete globalThis.__syncTestPrisma;
  await cleanTsModule(suiteName);
});
