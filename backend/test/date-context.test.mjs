import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'date-context';
// 2026-07-09 is a Thursday (jeudi)
const NOW = new Date('2026-07-09T12:00:00Z');

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/date-context.ts',
    suiteName,
  });
}

test('marks today with its weekday name (fr)', async () => {
  const { buildCalendarContext } = await loadModule();
  const calendar = buildCalendarContext(NOW, 'fr');
  assert.match(calendar, /jeudi 2026-07-09 \(AUJOURD'HUI\)/);
});

test('lists the coming weekdays so "samedi prochain" is resolvable', async () => {
  const { buildCalendarContext } = await loadModule();
  const calendar = buildCalendarContext(NOW, 'fr');
  assert.match(calendar, /samedi 2026-07-11/);
});

test('spans exactly 7 past days and 14 future days', async () => {
  const { buildCalendarContext } = await loadModule();
  const calendar = buildCalendarContext(NOW, 'fr');
  assert.match(calendar, /jeudi 2026-07-02/);
  assert.match(calendar, /jeudi 2026-07-23/);
  assert.doesNotMatch(calendar, /2026-07-01/);
  assert.doesNotMatch(calendar, /2026-07-24/);
});

test('uses the requested language for weekday names and today marker', async () => {
  const { buildCalendarContext } = await loadModule();
  assert.match(buildCalendarContext(NOW, 'en'), /Thursday 2026-07-09 \(TODAY\)/);
  assert.match(buildCalendarContext(NOW, 'de'), /Donnerstag 2026-07-09 \(HEUTE\)/);
  assert.match(buildCalendarContext(NOW, 'es'), /jueves 2026-07-09 \(HOY\)/);
  assert.match(buildCalendarContext(NOW, 'it'), /giovedì 2026-07-09 \(OGGI\)/);
});

test('falls back to French for unknown languages', async () => {
  const { buildCalendarContext } = await loadModule();
  assert.match(buildCalendarContext(NOW, 'pt'), /jeudi 2026-07-09 \(AUJOURD'HUI\)/);
});

test('crosses month boundaries correctly', async () => {
  const { buildCalendarContext } = await loadModule();
  const calendar = buildCalendarContext(new Date('2026-07-31T12:00:00Z'), 'fr');
  assert.match(calendar, /samedi 2026-08-01/);
});

test('is based on UTC regardless of the time of day', async () => {
  const { buildCalendarContext } = await loadModule();
  const lateEvening = buildCalendarContext(new Date('2026-07-09T23:30:00Z'), 'fr');
  assert.match(lateEvening, /jeudi 2026-07-09 \(AUJOURD'HUI\)/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
