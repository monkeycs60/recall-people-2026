import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'group-cache';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/group-cache.ts',
    suiteName,
  });
}

const friendGroup = {
  id: 'friend',
  name: 'Friend',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const colleagueGroup = {
  id: 'colleague',
  name: 'colleague',
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const yogaGroup = {
  id: 'yoga',
  name: 'Yoga',
  createdAt: '2026-01-03T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
};

test('merges a created group into the cached group list in display order', async () => {
  const { mergeGroupIntoGroupsCache } = await loadModule();

  assert.deepEqual(
    mergeGroupIntoGroupsCache([friendGroup], colleagueGroup).map((group) => group.id),
    ['colleague', 'friend'],
  );
});

test('merges a group into an empty cache when no cached groups are available', async () => {
  const { mergeGroupIntoGroupsCache } = await loadModule();

  assert.deepEqual(mergeGroupIntoGroupsCache(undefined, friendGroup), [friendGroup]);
});

test('sorts merged groups case-insensitively for stable display order', async () => {
  const { mergeGroupIntoGroupsCache } = await loadModule();
  const alphaGroup = {
    id: 'alpha',
    name: 'alpha',
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z',
  };

  assert.deepEqual(
    mergeGroupIntoGroupsCache([yogaGroup, friendGroup], alphaGroup).map((group) => group.id),
    ['alpha', 'friend', 'yoga'],
  );
});

test('replaces an existing cached group instead of duplicating it', async () => {
  const { mergeGroupIntoGroupsCache } = await loadModule();

  assert.deepEqual(
    mergeGroupIntoGroupsCache([friendGroup], { ...friendGroup, name: 'Friends' }),
    [{ ...friendGroup, name: 'Friends' }],
  );
});

test('selects the contact groups from cached groups after an association change', async () => {
  const { selectContactGroupsFromCache } = await loadModule();

  assert.deepEqual(
    selectContactGroupsFromCache(
      [friendGroup, colleagueGroup, yogaGroup],
      ['yoga', 'colleague'],
    ).map((group) => group.id),
    ['colleague', 'yoga'],
  );
});

test('ignores unknown contact group ids when selecting from cache', async () => {
  const { selectContactGroupsFromCache } = await loadModule();

  assert.deepEqual(
    selectContactGroupsFromCache([friendGroup], ['missing', 'friend']).map((group) => group.id),
    ['friend'],
  );
});

test('returns no selected groups when the group cache is empty', async () => {
  const { selectContactGroupsFromCache } = await loadModule();

  assert.deepEqual(selectContactGroupsFromCache(undefined, ['friend']), []);
});

test('builds group chips with contact counts from the counts query', async () => {
  const { buildGroupChips } = await loadModule();

  assert.deepEqual(
    buildGroupChips({
      allGroups: [friendGroup, colleagueGroup],
      contactCountByGroupId: { friend: 2 },
      allGroupLabel: 'Tous',
      totalContactsCount: 4,
    }),
    [
      { id: null, name: 'Tous', count: 4 },
      { id: 'friend', name: 'Friend', count: 2 },
      { id: 'colleague', name: 'colleague', count: 0 },
    ],
  );
});

test('builds the all-groups chip even when there are no groups', async () => {
  const { buildGroupChips } = await loadModule();

  assert.deepEqual(
    buildGroupChips({
      allGroups: [],
      contactCountByGroupId: {},
      allGroupLabel: 'All',
      totalContactsCount: 0,
    }),
    [{ id: null, name: 'All', count: 0 }],
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
