import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'account-db';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/account-db.ts',
    suiteName,
  });
}

test('builds a stable account-specific database name', async () => {
  const { getAccountDatabaseName } = await loadModule();

  assert.equal(getAccountDatabaseName('user-123'), getAccountDatabaseName('user-123'));
  assert.match(getAccountDatabaseName('user-123'), /^recall_people_[a-f0-9]{8}\.db$/);
});

test('keeps different accounts in different local databases', async () => {
  const { getAccountDatabaseName } = await loadModule();

  assert.notEqual(getAccountDatabaseName('user-a'), getAccountDatabaseName('user-b'));
});

test('keeps e2e databases separate from regular account databases', async () => {
  const { getAccountDatabaseName } = await loadModule();

  assert.match(getAccountDatabaseName('user-123', true), /^recall_people_test_[a-f0-9]{8}\.db$/);
  assert.notEqual(getAccountDatabaseName('user-123'), getAccountDatabaseName('user-123', true));
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
