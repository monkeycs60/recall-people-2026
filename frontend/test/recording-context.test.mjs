import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'recording-context';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/recordingContext.ts',
    suiteName,
  });
}

const TOPICS = [
  { id: 'a', title: 'Entretien', eventDate: '2026-07-08', status: 'active' },
  { id: 'b', title: 'Déménagement', eventDate: null, status: 'active' },
];

test('returns the preselected topic id, title and eventDate', async () => {
  const { getRespondingToTopic } = await loadModule();

  assert.deepEqual(getRespondingToTopic(TOPICS, 'a'), {
    id: 'a',
    title: 'Entretien',
    eventDate: '2026-07-08',
  });
});

test('returns the topic even when its eventDate is null', async () => {
  const { getRespondingToTopic } = await loadModule();

  assert.deepEqual(getRespondingToTopic(TOPICS, 'b'), {
    id: 'b',
    title: 'Déménagement',
    eventDate: null,
  });
});

test('returns undefined when the preselected id is not found', async () => {
  const { getRespondingToTopic } = await loadModule();

  assert.equal(getRespondingToTopic(TOPICS, 'zzz'), undefined);
});

test('returns undefined when there is no preselected id', async () => {
  const { getRespondingToTopic } = await loadModule();

  assert.equal(getRespondingToTopic(TOPICS, null), undefined);
});

test('does not break getRecordingHotTopics', async () => {
  const { getRecordingHotTopics } = await loadModule();

  assert.deepEqual(getRecordingHotTopics(TOPICS, 'a'), [TOPICS[0]]);
  assert.deepEqual(getRecordingHotTopics(TOPICS, null), TOPICS);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
