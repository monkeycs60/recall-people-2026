import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'extraction-feedback';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/extractionFeedback.ts',
    suiteName,
  });
}

function buildExtraction(overrides = {}) {
  return {
    contactIdentified: {
      id: null,
      firstName: 'Marie',
      lastName: 'Durand',
      confidence: 'high',
      needsDisambiguation: false,
    },
    noteTitle: 'Entretien Google',
    contactInfo: {
      phone: '0612345678',
      email: undefined,
      birthday: undefined,
    },
    loves: ['Céramique', 'Café calme'],
    newHotTopics: [],
    hotTopics: [
      { title: 'Entretien Google', context: 'Passe un entretien', suggestedDate: '15/06/2026' },
      { title: 'Déménagement Lyon', context: 'Cherche un appart', suggestedDate: undefined },
    ],
    resolvedTopics: [
      { id: 'topic-1', existingTopicId: 'topic-1', resolution: 'Elle a été prise' },
    ],
    facts: [
      { factType: 'work', factKey: 'Entreprise', factValue: 'Google', action: 'add' },
    ],
    memories: [
      { description: 'Café ensemble au Marais', eventDate: undefined, isShared: true },
    ],
    suggestedGroups: [{ name: 'Amis', isNew: false, existingId: 'group-1' }],
    ...overrides,
  };
}

function buildUntouchedFinalState(extraction) {
  return {
    facts: extraction.facts.map((fact) => ({ ...fact })),
    selectedFactIndexes: extraction.facts.map((_, index) => index),
    hotTopics: extraction.hotTopics.map((topic) => ({ ...topic })),
    selectedHotTopicIndexes: extraction.hotTopics.map((_, index) => index),
    hotTopicDates: Object.fromEntries(
      extraction.hotTopics.map((topic, index) => [
        index,
        { enabled: true, date: topic.suggestedDate || '' },
      ])
    ),
    memories: extraction.memories.map((memory) => ({ ...memory })),
    selectedMemoryIndexes: extraction.memories.map((_, index) => index),
    resolvedTopics: extraction.resolvedTopics.map((topic) => ({ ...topic })),
    loves: [...(extraction.loves || [])],
    groups: (extraction.suggestedGroups || []).map((group) => ({ ...group })),
    contactInfo: {
      phone: extraction.contactInfo?.phone || null,
      email: extraction.contactInfo?.email || null,
      birthday: extraction.contactInfo?.birthday || null,
    },
    name: 'Marie Durand',
    transcription: 'Marie passe un entretien chez Google.',
  };
}

test('an untouched review reports full acceptance and zero corrections', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.deepEqual(feedback.facts, { extracted: 1, kept: 1, edited: 0 });
  assert.deepEqual(feedback.hotTopics, {
    extracted: 2,
    kept: 2,
    edited: 0,
    datesChanged: 0,
    remindersDisabled: 0,
  });
  assert.deepEqual(feedback.memories, { extracted: 1, kept: 1, edited: 0 });
  assert.deepEqual(feedback.resolvedTopics, { extracted: 1, kept: 1, resolutionsEdited: 0 });
  assert.deepEqual(feedback.loves, { extracted: 2, kept: 2, added: 0 });
  assert.deepEqual(feedback.groups, { suggested: 1, kept: 1, added: 0 });
  assert.equal(feedback.contactInfoEdited, false);
  assert.equal(feedback.nameEdited, false);
  assert.equal(feedback.transcriptionEdited, false);
});

test('deselecting a hot topic and editing a fact are counted separately', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.selectedHotTopicIndexes = [0];
  finalState.facts[0].factValue = 'Alphabet';

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.equal(feedback.hotTopics.kept, 1);
  assert.equal(feedback.hotTopics.edited, 0);
  assert.deepEqual(feedback.facts, { extracted: 1, kept: 1, edited: 1 });
});

test('a hot topic edited but deselected does not count as edited', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.hotTopics[1].title = 'Déménagement Paris';
  finalState.selectedHotTopicIndexes = [0];

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.equal(feedback.hotTopics.edited, 0);
});

test('manually added loves are reported as additions (documented misses)', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.loves = ['Céramique', 'Randonnée'];

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.deepEqual(feedback.loves, { extracted: 2, kept: 1, added: 1 });
});

test('love comparison ignores case and surrounding whitespace', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.loves = ['  céramique ', 'CAFÉ CALME'];

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.deepEqual(feedback.loves, { extracted: 2, kept: 2, added: 0 });
});

test('changing a suggested date and disabling a reminder are tracked', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.hotTopicDates[0] = { enabled: true, date: '20/06/2026' };
  finalState.hotTopicDates[1] = { enabled: false, date: '' };

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.equal(feedback.hotTopics.datesChanged, 1);
  assert.equal(feedback.hotTopics.remindersDisabled, 1);
});

test('manually added groups are reported as additions', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.groups = [
    { name: 'Amis', isNew: false, existingId: 'group-1' },
    { name: 'Running', isNew: true },
  ];

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.deepEqual(feedback.groups, { suggested: 1, kept: 1, added: 1 });
});

test('clearing an extracted phone number flags contact info as edited', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.contactInfo.phone = null;

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.equal(feedback.contactInfoEdited, true);
});

test('an edited transcription is flagged so downstream analysis can filter re-extractions', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.transcription = 'Marie passe un entretien chez Google la semaine prochaine.';

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.equal(feedback.transcriptionEdited, true);
});

test('renaming the contact flags the name as edited', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction();
  const finalState = buildUntouchedFinalState(extraction);

  finalState.name = 'Marie Dupont';

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.equal(feedback.nameEdited, true);
});

test('deriveInitialContactName prefers full name, then nickname, then first name', async () => {
  const { deriveInitialContactName } = await loadModule();

  assert.equal(
    deriveInitialContactName({
      firstName: 'Marie',
      lastName: 'Durand',
      suggestedNickname: 'Mamar',
    }),
    'Marie Durand'
  );
  assert.equal(
    deriveInitialContactName({
      firstName: 'Marie',
      suggestedNickname: 'Mamar',
    }),
    'Mamar'
  );
  assert.equal(deriveInitialContactName({ firstName: 'Marie' }), 'Marie');
});

test('sections missing from the extraction produce zeroed counts', async () => {
  const { computeExtractionFeedback } = await loadModule();
  const extraction = buildExtraction({
    loves: undefined,
    hotTopics: undefined,
    facts: undefined,
    memories: undefined,
    suggestedGroups: undefined,
    resolvedTopics: [],
    contactInfo: undefined,
  });
  const finalState = {
    facts: [],
    selectedFactIndexes: [],
    hotTopics: [],
    selectedHotTopicIndexes: [],
    hotTopicDates: {},
    memories: [],
    selectedMemoryIndexes: [],
    resolvedTopics: [],
    loves: [],
    groups: [],
    contactInfo: { phone: null, email: null, birthday: null },
    name: 'Marie Durand',
    transcription: 'Marie passe un entretien chez Google.',
  };

  const feedback = computeExtractionFeedback(
    extraction,
    finalState,
    'Marie passe un entretien chez Google.'
  );

  assert.deepEqual(feedback.facts, { extracted: 0, kept: 0, edited: 0 });
  assert.deepEqual(feedback.loves, { extracted: 0, kept: 0, added: 0 });
  assert.equal(feedback.contactInfoEdited, false);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
