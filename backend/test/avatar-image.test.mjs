import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'avatar-image';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/avatar-image.ts',
    suiteName,
  });
}

test('generates avatars with gpt-image-2 low quality square output', async () => {
  const { generateAvatarImage } = await loadModule();
  let requestUrl;
  let requestInit;
  const expectedBytes = new Uint8Array([1, 2, 3, 4]);

  const fakeFetch = async (url, init) => {
    requestUrl = url;
    requestInit = init;
    return new Response(JSON.stringify({
      data: [{ b64_json: Buffer.from(expectedBytes).toString('base64') }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await generateAvatarImage({
    apiKey: 'test-key',
    prompt: 'existing happy humans prompt',
    fetchFn: fakeFetch,
  });

  assert.equal(requestUrl, 'https://api.openai.com/v1/images/generations');
  assert.equal(requestInit.method, 'POST');
  assert.equal(requestInit.headers.Authorization, 'Bearer test-key');
  assert.equal(requestInit.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(requestInit.body), {
    model: 'gpt-image-2',
    prompt: 'existing happy humans prompt',
    size: '1024x1024',
    quality: 'low',
  });
  assert.deepEqual(result.imageBuffer, expectedBytes);
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.extension, 'png');
});

test('surfaces OpenAI image generation errors without leaking the API key', async () => {
  const { generateAvatarImage } = await loadModule();

  const fakeFetch = async () => new Response(JSON.stringify({
    error: { message: 'quota exceeded for request' },
  }), {
    status: 429,
    headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(
    () => generateAvatarImage({
      apiKey: 'secret-key',
      prompt: 'prompt',
      fetchFn: fakeFetch,
    }),
    (error) => {
      assert.match(error.message, /OpenAI image generation failed \(429\): quota exceeded for request/);
      assert.doesNotMatch(error.message, /secret-key/);
      return true;
    },
  );
});

test('fails when OpenAI returns no base64 image data', async () => {
  const { generateAvatarImage } = await loadModule();

  const fakeFetch = async () => new Response(JSON.stringify({ data: [{}] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  await assert.rejects(
    () => generateAvatarImage({
      apiKey: 'test-key',
      prompt: 'prompt',
      fetchFn: fakeFetch,
    }),
    /OpenAI image generation returned no image data/,
  );
});

test('buildAvatarGenerationPrompt keeps the existing Happy Humans prompt intact', async () => {
  const { AVATAR_STYLE_PROMPT, buildAvatarGenerationPrompt } = await loadModule();

  const prompt = buildAvatarGenerationPrompt('short brown hair');

  assert.ok(prompt.startsWith(AVATAR_STYLE_PROMPT));
  assert.match(prompt, /short brown hair/);
  assert.match(prompt, /Generate a single portrait illustration following the design system above/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
