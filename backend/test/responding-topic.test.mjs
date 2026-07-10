import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'responding-topic';

async function loadModule() {
  return loadTsModule({ entryPoint: 'src/lib/responding-topic.ts', suiteName });
}

const TOPIC = { id: 'topic-1', title: 'Entretien chez Google', eventDate: '2026-07-03' };

test('builds a French preamble with topic id, title and date', async () => {
  const { buildRespondingToTopicPreamble } = await loadModule();
  const preamble = buildRespondingToTopicPreamble(TOPIC, 'fr');
  assert.match(preamble, /topic-1/);
  assert.match(preamble, /Entretien chez Google/);
  assert.match(preamble, /2026-07-03/);
  assert.match(preamble, /resolvedTopics/);
});

test('supports the five languages and falls back to French', async () => {
  const { buildRespondingToTopicPreamble } = await loadModule();
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'en'), /The user is replying about/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'es'), /El usuario responde/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'it'), /L'utente risponde/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'de'), /Der Benutzer antwortet/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'pt'), /L'utilisateur répond/);
});

test('omits the date clause when eventDate is missing', async () => {
  const { buildRespondingToTopicPreamble } = await loadModule();
  const preamble = buildRespondingToTopicPreamble({ id: 't2', title: 'Déménagement' }, 'fr');
  assert.doesNotMatch(preamble, /undefined/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
