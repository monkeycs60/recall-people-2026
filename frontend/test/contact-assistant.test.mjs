import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'contact-assistant';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/contactAssistant.ts',
    suiteName,
  });
}

test('keeps contact assistant history separate from global assistant history', async () => {
  const { filterQuestionEntriesForScope } = await loadModule();

  const entries = [
    {
      id: 'global-related-to-nora',
      question: 'What did I talk about with Nora?',
      answerSummary: 'Global answer',
      date: '2026-05-31T10:00:00.000Z',
      relatedContactId: 'nora',
    },
    {
      id: 'nora-chat',
      question: 'What is new with Nora?',
      answerSummary: 'Scoped answer',
      date: '2026-05-31T10:05:00.000Z',
      scopeContactId: 'nora',
      relatedContactId: 'nora',
    },
    {
      id: 'lucas-chat',
      question: 'What is new with Lucas?',
      answerSummary: 'Other scoped answer',
      date: '2026-05-31T10:10:00.000Z',
      scopeContactId: 'lucas',
      relatedContactId: 'lucas',
    },
  ];

  assert.deepEqual(
    filterQuestionEntriesForScope(entries, 'nora').map((entry) => entry.id),
    ['nora-chat']
  );
  assert.deepEqual(
    filterQuestionEntriesForScope(entries, null).map((entry) => entry.id),
    ['global-related-to-nora']
  );
});

test('prefers saved contact questions before generic contact prompts', async () => {
  const { buildContactAssistantPrompts } = await loadModule();

  assert.deepEqual(
    buildContactAssistantPrompts({
      firstName: 'Nora',
      suggestedQuestions: [
        { category: 'ask', text: 'What should I ask Nora next time?' },
        { category: 'remember', text: 'What does Nora love?' },
      ],
    }, ['Fallback about Nora']),
    ['What should I ask Nora next time?', 'What does Nora love?']
  );

  assert.deepEqual(
    buildContactAssistantPrompts({
      firstName: 'Nora',
      suggestedQuestions: [],
    }, ['Fallback about Nora']),
    ['Fallback about Nora']
  );
});

test('uses a transparent avatar frame for contact assistant avatars', async () => {
  const { getContactAssistantAvatarFrame } = await loadModule();

  assert.equal(getContactAssistantAvatarFrame(true), 'contact');
  assert.equal(getContactAssistantAvatarFrame(false), 'icon');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
