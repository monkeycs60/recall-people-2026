import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-push';

async function loadModule() {
  return loadTsModule({ entryPoint: 'lib/sync-push.ts', suiteName });
}

const mutation = (id) => ({
  id,
  entityType: 'hot_topic',
  entityId: `entity-${id}`,
  operation: 'upsert',
  payload: {},
  createdAt: '2026-10-15T13:04:32.231Z',
});

function fakeServer(SyncRequestError, { rejectedIds = [], failWith } = {}) {
  const calls = [];
  const push = async (mutations) => {
    calls.push(mutations.map((m) => m.id));
    if (failWith) throw failWith;
    if (mutations.some((m) => rejectedIds.includes(m.id))) {
      throw new SyncRequestError('Invalid request body', 400);
    }
    return { cursor: String(calls.length), appliedMutationIds: mutations.map((m) => m.id) };
  };
  return { calls, push };
}

test('a single refused mutation no longer blocks the rest of the queue', async () => {
  const { pushIsolatingRejections, SyncRequestError } = await loadModule();
  const { push } = fakeServer(SyncRequestError, { rejectedIds: ['m3'] });
  const applied = [];
  const rejected = [];

  await pushIsolatingRejections({
    mutations: ['m1', 'm2', 'm3', 'm4', 'm5'].map(mutation),
    push,
    onApplied: async (response) => { applied.push(...response.appliedMutationIds); },
    onRejected: async (m, error) => { rejected.push([m.id, error.status]); },
  });

  assert.deepEqual(applied.sort(), ['m1', 'm2', 'm4', 'm5']);
  assert.deepEqual(rejected, [['m3', 400]]);
});

test('a healthy queue is pushed in one request', async () => {
  const { pushIsolatingRejections, SyncRequestError } = await loadModule();
  const { calls, push } = fakeServer(SyncRequestError);

  await pushIsolatingRejections({
    mutations: ['m1', 'm2'].map(mutation),
    push,
    onApplied: async () => {},
    onRejected: async () => { throw new Error('nothing should be rejected'); },
  });

  assert.deepEqual(calls, [['m1', 'm2']]);
});

for (const [label, makeError] of [
  ['network failures', () => new TypeError('Network request failed')],
  ['server errors', (SyncRequestError) => new SyncRequestError('Failed to push sync mutations', 500)],
  ['expired sessions', (SyncRequestError) => new SyncRequestError('Unauthorized', 401)],
  ['rate limits', (SyncRequestError) => new SyncRequestError('Too many requests', 429)],
]) {
  test(`${label} keep the whole queue for the next sync`, async () => {
    const { pushIsolatingRejections, SyncRequestError } = await loadModule();
    const failure = makeError(SyncRequestError);
    const { calls, push } = fakeServer(SyncRequestError, { failWith: failure });

    await assert.rejects(
      pushIsolatingRejections({
        mutations: ['m1', 'm2', 'm3'].map(mutation),
        push,
        onApplied: async () => {},
        onRejected: async () => { throw new Error('nothing should be rejected'); },
      }),
      (error) => error === failure
    );
    assert.equal(calls.length, 1);
  });
}

test.after(async () => {
  await cleanTsModule(suiteName);
});
