import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-date-utils';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/sync-date.ts',
    suiteName,
  });
}

test('normalizes legacy SQLite timestamps before sending them to sync API', async () => {
  const { toSyncIsoDate } = await loadModule();

  assert.equal(
    toSyncIsoDate('2026-05-09 14:30:12'),
    '2026-05-09T14:30:12Z'
  );
});

test('keeps existing ISO timestamps and nullable timestamps stable', async () => {
  const { toNullableSyncIsoDate, toSyncIsoDate } = await loadModule();
  const iso = '2026-05-09T14:30:12.000Z';

  assert.equal(toSyncIsoDate(iso), iso);
  assert.equal(toNullableSyncIsoDate(null), null);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
