import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'contact-sort-preference-service';

const stubPlugin = {
  name: 'contact-sort-preference-stubs',
  setup(build) {
    build.onResolve({ filter: /^@\/lib\/db$/ }, () => ({
      path: '@/lib/db',
      namespace: 'contact-sort-preference-stub',
    }));

    build.onResolve({ filter: /^@\/utils\/contactSort$/ }, () => ({
      path: '@/utils/contactSort',
      namespace: 'contact-sort-preference-stub',
    }));

    build.onLoad({ filter: /.*/, namespace: 'contact-sort-preference-stub' }, (args) => {
      if (args.path === '@/lib/db') {
        return {
          contents: 'export async function getDatabase() { return globalThis.__contactSortPreferenceDb; }',
          loader: 'js',
        };
      }

      return {
          contents: `
          export const CONTACT_SORT_DEFAULT_MODE = 'recent-contact';
          export const CONTACT_SORT_MODES = ['recent-contact', 'next-deadline', 'upcoming-birthday', 'overdue', 'alphabetical'];
          export function isContactSortMode(value) {
            return CONTACT_SORT_MODES.includes(value);
          }
        `,
        loader: 'js',
      };
    });
  },
};

async function loadModule() {
  return loadTsModule({
    entryPoint: 'services/contact-sort-preference.service.ts',
    suiteName,
    esbuildOptions: {
      plugins: [stubPlugin],
    },
  });
}

function installDbStub(initialValue = null) {
  let storedValue = initialValue;
  const calls = [];

  globalThis.__contactSortPreferenceDb = {
    async execAsync(query) {
      calls.push(['exec', query]);
    },
    async getFirstAsync(query, args) {
      calls.push(['getFirst', query, args]);
      return storedValue === null ? null : { value: storedValue };
    },
    async runAsync(query, args) {
      calls.push(['run', query, args]);
      storedValue = args[1];
    },
  };

  return {
    calls,
    get storedValue() {
      return storedValue;
    },
  };
}

test('returns the default sort mode when no preference is saved', async () => {
  const { contactSortPreferenceService } = await loadModule();
  installDbStub();

  assert.equal(await contactSortPreferenceService.get(), 'recent-contact');
});

test('ignores invalid stored sort values', async () => {
  const { contactSortPreferenceService } = await loadModule();
  installDbStub('not-a-mode');

  assert.equal(await contactSortPreferenceService.get(), 'recent-contact');
});

test('falls back from the removed hot topic sort preference', async () => {
  const { contactSortPreferenceService } = await loadModule();
  installDbStub('hot-topics');

  assert.equal(await contactSortPreferenceService.get(), 'recent-contact');
});

test('persists the selected sort mode in SQLite preferences', async () => {
  const { contactSortPreferenceService } = await loadModule();
  const db = installDbStub();

  await contactSortPreferenceService.set('overdue');

  assert.equal(db.storedValue, 'overdue');
  assert.ok(db.calls.some((call) => call[0] === 'exec' && call[1].includes('CREATE TABLE IF NOT EXISTS app_preferences')));
});

test.after(async () => {
  delete globalThis.__contactSortPreferenceDb;
  await cleanTsModule(suiteName);
});
