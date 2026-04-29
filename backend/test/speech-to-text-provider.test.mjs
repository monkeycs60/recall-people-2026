import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'speech-to-text-provider';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/speech-to-text-provider.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      packages: 'external',
    },
  });
}

test('defaults to Groq Whisper v3 turbo for unknown or missing STT providers', async () => {
  const { getSTTModelName, getSTTProviderName } = await loadModule();

  assert.equal(getSTTProviderName({}), 'groq-whisper-v3-turbo');
  assert.equal(getSTTModelName({}), 'whisper-large-v3-turbo');
  assert.equal(getSTTProviderName({ STT_PROVIDER: 'unknown' }), 'groq-whisper-v3-turbo');
  assert.equal(getSTTModelName({ STT_PROVIDER: 'unknown' }), 'whisper-large-v3-turbo');
});

test('maps each supported Groq STT provider to the expected model', async () => {
  const { getSTTModelName, getSTTProviderName } = await loadModule();

  assert.equal(getSTTProviderName({ STT_PROVIDER: 'groq-whisper-v3' }), 'groq-whisper-v3');
  assert.equal(getSTTModelName({ STT_PROVIDER: 'groq-whisper-v3' }), 'whisper-large-v3');
  assert.equal(getSTTProviderName({ STT_PROVIDER: 'groq-whisper-v3-turbo' }), 'groq-whisper-v3-turbo');
  assert.equal(getSTTModelName({ STT_PROVIDER: 'groq-whisper-v3-turbo' }), 'whisper-large-v3-turbo');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
