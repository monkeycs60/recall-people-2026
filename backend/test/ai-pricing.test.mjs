import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'ai-pricing';

async function loadModule() {
  return loadTsModule({ entryPoint: 'src/lib/ai-pricing.ts', suiteName });
}

/** Float-safe equality for money amounts. */
function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(
    typeof actual === 'number' && Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

test.after(() => cleanTsModule(suiteName));

// --- Whisper (Groq, billed per hour of audio, 10s minimum) ---

test('whisperCostUsd: one hour of turbo audio costs the hourly rate', async () => {
  const { whisperCostUsd } = await loadModule();
  closeTo(whisperCostUsd('whisper-large-v3-turbo', 3600), 0.04);
});

test('whisperCostUsd: large-v3 is priced at its own (higher) rate', async () => {
  const { whisperCostUsd } = await loadModule();
  closeTo(whisperCostUsd('whisper-large-v3', 3600), 0.111);
});

test('whisperCostUsd: applies the 10-second minimum for short clips', async () => {
  const { whisperCostUsd } = await loadModule();
  closeTo(whisperCostUsd('whisper-large-v3-turbo', 3), (10 / 3600) * 0.04);
});

test('whisperCostUsd: missing duration falls back to the 10s minimum', async () => {
  const { whisperCostUsd } = await loadModule();
  closeTo(whisperCostUsd('whisper-large-v3-turbo', undefined), (10 / 3600) * 0.04);
});

test('whisperCostUsd: unknown model returns undefined (no guessing)', async () => {
  const { whisperCostUsd } = await loadModule();
  assert.equal(whisperCostUsd('some-future-model', 600), undefined);
});

// --- OpenAI image generation (gpt-image-2, per image for a fixed size+quality) ---

test('imageCostUsd: a single 1024x1024 low-quality image', async () => {
  const { imageCostUsd } = await loadModule();
  closeTo(imageCostUsd('gpt-image-2', '1024x1024', 'low'), 0.006);
});

test('imageCostUsd: scales linearly with the image count', async () => {
  const { imageCostUsd } = await loadModule();
  closeTo(imageCostUsd('gpt-image-2', '1024x1024', 'low', 3), 0.018);
});

test('imageCostUsd: unknown size/quality combo returns undefined', async () => {
  const { imageCostUsd } = await loadModule();
  assert.equal(imageCostUsd('gpt-image-2', '512x512', 'low'), undefined);
});
