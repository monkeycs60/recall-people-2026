import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'notification-routing';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/notification-routing.ts',
    suiteName,
  });
}

test('routes contact notifications directly to contact detail', async () => {
  const { getNotificationRoute } = await loadModule();

  assert.deepEqual(getNotificationRoute({ contactId: 'contact-1' }), {
    type: 'contact',
    contactId: 'contact-1',
  });
});

test('routes event notifications through the hot topic lookup', async () => {
  const { getNotificationRoute } = await loadModule();

  assert.deepEqual(getNotificationRoute({ eventId: 'event-1' }), {
    type: 'event',
    eventId: 'event-1',
  });
});

test('routes weekly digest notifications to upcoming', async () => {
  const { getNotificationRoute } = await loadModule();

  assert.deepEqual(getNotificationRoute({ type: 'weekly_digest' }), {
    type: 'upcoming',
  });
  assert.deepEqual(getNotificationRoute({ screen: 'upcoming' }), {
    type: 'upcoming',
  });
});

test('ignores unknown notification payloads', async () => {
  const { getNotificationRoute } = await loadModule();

  assert.equal(getNotificationRoute({ type: 'unknown' }), null);
  assert.equal(getNotificationRoute(null), null);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
