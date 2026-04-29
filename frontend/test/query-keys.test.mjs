import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'query-keys';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/query-keys.ts',
    suiteName,
  });
}

test('builds stable contact query keys', async () => {
  const { queryKeys } = await loadModule();

  assert.deepEqual(queryKeys.contacts.all, ['contacts']);
  assert.deepEqual(queryKeys.contacts.list(), ['contacts', 'list']);
  assert.deepEqual(queryKeys.contacts.detail('contact-1'), ['contacts', 'detail', 'contact-1']);
  assert.deepEqual(queryKeys.contacts.previews(), ['contacts', 'previews']);
});

test('builds stable group query keys with dynamic identifiers', async () => {
  const { queryKeys } = await loadModule();

  assert.deepEqual(queryKeys.groups.all, ['groups']);
  assert.deepEqual(queryKeys.groups.list(), ['groups', 'list']);
  assert.deepEqual(queryKeys.groups.detail('group-1'), ['groups', 'detail', 'group-1']);
  assert.deepEqual(queryKeys.groups.forContact('contact-1'), ['groups', 'forContact', 'contact-1']);
  assert.deepEqual(queryKeys.groups.contactIds('group-1'), ['groups', 'contactIds', 'group-1']);
  assert.deepEqual(queryKeys.groups.contactCounts(), ['groups', 'contactCounts']);
});

test('builds stable per-contact query keys for related resources', async () => {
  const { queryKeys } = await loadModule();

  assert.deepEqual(queryKeys.facts.byContact('contact-1'), ['facts', 'byContact', 'contact-1']);
  assert.deepEqual(queryKeys.hotTopics.byContact('contact-1'), ['hotTopics', 'byContact', 'contact-1']);
  assert.deepEqual(queryKeys.memories.byContact('contact-1'), ['memories', 'byContact', 'contact-1']);
  assert.deepEqual(queryKeys.notes.byContact('contact-1'), ['notes', 'byContact', 'contact-1']);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
