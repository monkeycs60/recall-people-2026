import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'event-date-guard';
const NOW = new Date('2026-07-05T12:00:00Z');

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/event-date-guard.ts',
    suiteName,
  });
}

test('keeps a valid near-future date', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2026-07-20', NOW), '2026-07-20');
});

test('keeps a date within the recent-past window (post-event follow-up)', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2026-06-20', NOW), '2026-06-20');
});

test('rejects null, undefined and non-ISO formats', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate(null, NOW), undefined);
  assert.equal(sanitizeEventDate(undefined, NOW), undefined);
  assert.equal(sanitizeEventDate('20/07/2026', NOW), undefined);
  assert.equal(sanitizeEventDate('demain', NOW), undefined);
});

test('rejects impossible calendar dates', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2026-02-31', NOW), undefined);
});

test('rejects far past and far future', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2025-01-15', NOW), undefined);
  assert.equal(sanitizeEventDate('2029-07-05', NOW), undefined);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
