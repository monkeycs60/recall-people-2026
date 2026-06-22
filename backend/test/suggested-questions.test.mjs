import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'suggested-questions';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/routes/suggested-questions.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      plugins: [{
        name: 'suggested-questions-test-deps',
        setup(build) {
          build.onResolve({ filter: /^\.\.\/middleware\/auth$/ }, () => ({ path: 'auth-mock', namespace: 'suggested-questions-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/audit$/ }, () => ({ path: 'audit-mock', namespace: 'suggested-questions-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/ai-provider$/ }, () => ({ path: 'ai-provider-mock', namespace: 'suggested-questions-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/telemetry$/ }, () => ({ path: 'telemetry-mock', namespace: 'suggested-questions-test' }));
          build.onResolve({ filter: /^ai$/ }, () => ({ path: 'ai-mock', namespace: 'suggested-questions-test' }));
          build.onLoad({ filter: /^auth-mock$/, namespace: 'suggested-questions-test' }, () => ({
            loader: 'js',
            contents: 'export const authMiddleware = async (_c, next) => { await next(); };',
          }));
          build.onLoad({ filter: /^audit-mock$/, namespace: 'suggested-questions-test' }, () => ({
            loader: 'js',
            contents: 'export const auditLog = async () => {};',
          }));
          build.onLoad({ filter: /^ai-provider-mock$/, namespace: 'suggested-questions-test' }, () => ({
            loader: 'js',
            contents: 'export const createAIModel = () => ({}); export const getAIModel = () => "test-model";',
          }));
          build.onLoad({ filter: /^telemetry-mock$/, namespace: 'suggested-questions-test' }, () => ({
            loader: 'js',
            contents: 'export const getLangfuseClient = () => null;',
          }));
          build.onLoad({ filter: /^ai-mock$/, namespace: 'suggested-questions-test' }, () => ({
            loader: 'js',
            contents: 'export const generateText = async () => ({ text: "" });',
          }));
        },
      }],
    },
  });
}

test('parseSuggestedQuestionsText strips numbering and bullets, leaving the category null', async () => {
  const { parseSuggestedQuestionsText } = await loadModule();

  assert.deepEqual(
    parseSuggestedQuestionsText('1. How did the Lyon school trip go?\n2) What did the kids enjoy most?\n- Want to compare photos soon?'),
    [
      { category: null, text: 'How did the Lyon school trip go?' },
      { category: null, text: 'What did the kids enjoy most?' },
      { category: null, text: 'Want to compare photos soon?' },
    ]
  );
});

test('parseSuggestedQuestionsText maps bracketed tags to question categories', async () => {
  const { parseSuggestedQuestionsText } = await loadModule();

  assert.deepEqual(
    parseSuggestedQuestionsText('[ask] How is the new job?\n[follow-up] Did the Lyon move happen?\n[remember] Still into bouldering?'),
    [
      { category: 'ask', text: 'How is the new job?' },
      { category: 'followUp', text: 'Did the Lyon move happen?' },
      { category: 'remember', text: 'Still into bouldering?' },
    ]
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
