import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '..');
const requireFromBackend = createRequire(resolve(frontendRoot, '../backend/package.json'));
const esbuild = requireFromBackend('esbuild');
const outdir = resolve(frontendRoot, '.tmp-tests');
const outfile = resolve(outdir, 'group-cache.mjs');

async function loadModule() {
  await rm(outdir, { force: true, recursive: true });
  await mkdir(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [resolve(frontendRoot, 'lib/group-cache.ts')],
    outfile,
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
  });
  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
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

test.after(async () => {
  await rm(outdir, { force: true, recursive: true });
});
