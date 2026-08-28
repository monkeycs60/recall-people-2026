import assert from 'node:assert/strict';
import { dirname } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const suiteName = 'hot-topic-resolution';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/hotTopicResolution.ts',
    suiteName,
  });
}

test.after(async () => {
  await cleanTsModule(suiteName);
});

test('uses the selected local calendar day as the resolution timestamp', async () => {
  const { getResolutionValues } = await loadModule();

  const values = getResolutionValues('2026-08-26');
  const resolvedDate = new Date(values.resolvedAt);

  assert.equal(values.eventDate, '2026-08-26');
  assert.equal(resolvedDate.getFullYear(), 2026);
  assert.equal(resolvedDate.getMonth(), 7);
  assert.equal(resolvedDate.getDate(), 26);
});

test('rejects a resolution date after today', async () => {
  const { validateResolutionDate } = await loadModule();

  assert.equal(validateResolutionDate('2026-08-29', new Date(2026, 7, 28)), false);
  assert.equal(validateResolutionDate('2026-08-28', new Date(2026, 7, 28)), true);
  assert.equal(validateResolutionDate('2026-08-12', new Date(2026, 7, 28)), true);
});

test('lists every active topic in review and preselects only extracted resolutions', async () => {
  const { buildReviewResolutionTopics } = await loadModule();
  const topics = [
    { id: 'dated', title: 'Conference', status: 'active', eventDate: '2026-09-01' },
    { id: 'undated', title: 'Move', status: 'active' },
  ];
  const extracted = [{ id: 'undated', existingTopicId: 'undated', resolution: 'Move completed' }];

  const result = buildReviewResolutionTopics(topics, extracted);

  assert.deepEqual(result.map(({ id, proposedResolution }) => ({ id, proposedResolution })), [
    { id: 'dated', proposedResolution: '' },
    { id: 'undated', proposedResolution: 'Move completed' },
  ]);
});
