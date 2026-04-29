import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'validation';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/validation.ts',
    suiteName,
  });
}

test('languageSchema accepts only the five supported app languages', async () => {
  const { languageSchema } = await loadModule();

  for (const language of ['fr', 'en', 'es', 'it', 'de']) {
    assert.equal(languageSchema.safeParse(language).success, true);
  }

  assert.equal(languageSchema.safeParse('pt').success, false);
});

test('summaryRequestSchema accepts complete contact context and defaults language to optional', async () => {
  const { summaryRequestSchema } = await loadModule();

  const result = summaryRequestSchema.safeParse({
    contact: { firstName: 'Ada', lastName: 'Lovelace' },
    facts: [{ factType: 'work', factKey: 'Role', factValue: 'Engineer' }],
    hotTopics: [{
      title: 'Conference',
      context: 'Speaking next month',
      status: 'active',
      eventDate: null,
    }],
  });

  assert.equal(result.success, true);
});

test('summaryRequestSchema rejects empty required contact and fact fields', async () => {
  const { summaryRequestSchema } = await loadModule();

  const result = summaryRequestSchema.safeParse({
    contact: { firstName: '' },
    facts: [{ factType: '', factKey: 'Role', factValue: 'Engineer' }],
    hotTopics: [],
    language: 'fr',
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.error.issues.map((issue) => issue.path.join('.')),
    ['contact.firstName', 'facts.0.factType'],
  );
});

test('searchRequestSchema validates all searchable collections and rejects empty queries', async () => {
  const { searchRequestSchema } = await loadModule();

  const validPayload = {
    query: 'running',
    facts: [{
      id: 'fact-1',
      contactId: 'contact-1',
      contactName: 'Ada Lovelace',
      factType: 'hobby',
      factKey: 'Sport',
      factValue: 'Running',
    }],
    memories: [{
      id: 'memory-1',
      contactId: 'contact-1',
      contactName: 'Ada Lovelace',
      description: 'Ran a half marathon',
    }],
    notes: [{
      id: 'note-1',
      contactId: 'contact-1',
      contactName: 'Ada Lovelace',
      transcription: 'We talked about running.',
    }],
    language: 'en',
  };

  assert.equal(searchRequestSchema.safeParse(validPayload).success, true);
  assert.equal(searchRequestSchema.safeParse({ ...validPayload, query: '' }).success, false);
});

test('similarityRequestSchema requires at least one non-empty fact', async () => {
  const { similarityRequestSchema } = await loadModule();

  assert.equal(
    similarityRequestSchema.safeParse({
      facts: [{ factType: 'company', factValue: 'Analytical Engine' }],
    }).success,
    true,
  );
  assert.equal(similarityRequestSchema.safeParse({ facts: [] }).success, false);
  assert.equal(
    similarityRequestSchema.safeParse({
      facts: [{ factType: 'company', factValue: '' }],
    }).success,
    false,
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
