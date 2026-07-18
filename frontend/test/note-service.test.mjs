import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'note-service';

const stubPlugin = {
  name: 'note-service-stubs',
  setup(build) {
    const stubs = new Map([
      ['expo-crypto', 'export function randomUUID() { return "note-id-1"; }'],
      ['@/lib/db', `
        export async function getDatabase() {
          return globalThis.__noteServiceDb;
        }
      `],
      ['@/lib/analytics', `
        export const analytics = { capture() {} };
        export const AnalyticsEvent = {
          NOTE_DELETED: 'note_deleted',
          NOTE_EDITED: 'note_edited',
        };
      `],
      ['./sync-queue.service', `
        export const syncQueueService = {
          async enqueueMutation(payload) {
            globalThis.__noteServiceQueue.push(payload);
          },
        };
      `],
    ]);

    for (const specifier of stubs.keys()) {
      build.onResolve({ filter: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, () => ({
        path: specifier,
        namespace: 'note-service-stub',
      }));
    }

    build.onLoad({ filter: /.*/, namespace: 'note-service-stub' }, (args) => ({
      contents: stubs.get(args.path) ?? 'export {};',
      loader: 'js',
    }));
  },
};

async function loadModule() {
  return loadTsModule({
    entryPoint: 'services/note.service.ts',
    suiteName,
    esbuildOptions: {
      plugins: [stubPlugin],
    },
  });
}

function installDbStub() {
  const insertArgs = [];
  globalThis.__noteServiceQueue = [];
  globalThis.__noteServiceDb = {
    async runAsync(query, args) {
      if (query.includes('INSERT INTO notes')) {
        insertArgs.push(args);
      }
    },
    async getFirstAsync() {
      return null;
    },
  };

  return { insertArgs };
}

test('creates notes with an empty transcription string instead of null', async () => {
  const { noteService } = await loadModule();
  const { insertArgs } = installDbStub();

  const note = await noteService.create({
    contactId: 'contact-1',
    title: 'Empty note',
  });

  assert.equal(insertArgs.length, 1);
  assert.equal(insertArgs[0][5], '');
  assert.equal(note.transcription, '');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
