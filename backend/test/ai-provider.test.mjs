import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'ai-provider';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/ai-provider.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      packages: 'external',
    },
  });
}

test('defaults to the Cerebras provider and model when AI_PROVIDER is omitted', async () => {
  const { getAIModel, getAIProviderName } = await loadModule();

  assert.equal(getAIProviderName({}), 'cerebras');
  assert.equal(getAIModel({}), 'gpt-oss-120b');
});

test('returns the configured model for each supported text provider', async () => {
  const { getAIModel, getAIProviderName } = await loadModule();

  assert.equal(getAIProviderName({ AI_PROVIDER: 'openai' }), 'openai');
  assert.equal(getAIModel({ AI_PROVIDER: 'openai' }), 'gpt-5-mini');
  assert.equal(getAIProviderName({ AI_PROVIDER: 'grok' }), 'grok');
  assert.equal(getAIModel({ AI_PROVIDER: 'grok' }), 'grok-4-1-fast');
  assert.equal(getAIProviderName({ AI_PROVIDER: 'cerebras' }), 'cerebras');
  assert.equal(getAIModel({ AI_PROVIDER: 'cerebras' }), 'gpt-oss-120b');
});

test('throws provider-specific errors when required API keys are missing', async () => {
  const { createAIProvider } = await loadModule();

  assert.throws(
    () => createAIProvider({ AI_PROVIDER: 'openai' }),
    /OPENAI_API_KEY is required when using openai provider/,
  );
  assert.throws(
    () => createAIProvider({ AI_PROVIDER: 'cerebras' }),
    /CEREBRAS_API_KEY is required when using cerebras provider/,
  );
  assert.throws(
    () => createAIProvider({ AI_PROVIDER: 'grok' }),
    /XAI_API_KEY is required when using grok provider/,
  );
});

test('getTelemetryOptions never enables content-bearing AI SDK telemetry', async () => {
  const { getTelemetryOptions } = await loadModule();

  assert.deepEqual(getTelemetryOptions({}), {});
});

test('getStructuredOutputSettings keeps structured generation deterministic', async () => {
  const { getStructuredOutputSettings } = await loadModule();

  assert.deepEqual(getStructuredOutputSettings(), { temperature: 0 });
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
