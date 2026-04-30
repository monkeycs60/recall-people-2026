import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'meeting-context';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/meetingContext.ts',
    suiteName,
  });
}

function note(transcription, createdAt = '2026-01-01T10:00:00.000Z') {
  return {
    id: crypto.randomUUID(),
    contactId: 'contact-1',
    title: 'First note',
    transcription,
    createdAt,
    updatedAt: createdAt,
  };
}

test('uses structured AI meeting context before legacy note parsing', async () => {
  const { getMeetingContext } = await loadModule();

  assert.deepEqual(
    getMeetingContext(
      [note('Contexte de rencontre : ancien meetup produit')],
      'Rencontré au Web Summit via Anna'
    ),
    {
      context: 'Rencontré au Web Summit via Anna',
      source: 'structured',
    }
  );
});

test('keeps a multilingual legacy fallback for older notes', async () => {
  const { getMeetingContext } = await loadModule();

  const cases = [
    ['Contexte de rencontre : au meetup produit via Sarah.', 'Au meetup produit via Sarah'],
    ['We met at Web Summit through Anna.', 'Web Summit through Anna'],
    ['Nos conocimos en South Summit a través de Lucia.', 'South Summit a través de Lucia'],
    ["Ci siamo conosciuti al Salone del Mobile tramite Marco.", 'Salone del Mobile tramite Marco'],
    ['Wir haben uns bei der Bits & Pretzels über Max kennengelernt.', 'Der Bits & Pretzels über Max'],
  ];

  for (const [transcription, expected] of cases) {
    assert.equal(getMeetingContext([note(transcription)])?.context, expected);
  }
});

test('does not treat a simple recent meetup as first meeting context', async () => {
  const { getMeetingContext } = await loadModule();

  assert.equal(
    getMeetingContext([note("On s'est vus hier, elle cherche un appartement.")]),
    null
  );
});

test('applies AI extracted context only when no structured context exists yet', async () => {
  const { shouldApplyExtractedMeetingContext } = await loadModule();

  assert.equal(
    shouldApplyExtractedMeetingContext('Rencontré au Web Summit', undefined),
    true
  );
  assert.equal(
    shouldApplyExtractedMeetingContext('Rencontré au Web Summit', 'Rencontré chez Stripe'),
    false
  );
  assert.equal(
    shouldApplyExtractedMeetingContext(undefined, 'Rencontré chez Stripe'),
    false
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
