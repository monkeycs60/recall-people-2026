import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-encryption';

async function loadModule(suffix = '') {
  return loadTsModule({
    entryPoint: 'src/lib/sync-encryption.ts',
    suiteName: `${suiteName}${suffix}`,
    esbuildOptions: { platform: 'node' },
  });
}

test('encrypts without storing plaintext and decrypts back to the original value', async () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const { encryptString, decryptString } = await loadModule();
  const encrypted = await encryptString(key, 'Ada Lovelace');

  assert.notEqual(encrypted, 'Ada Lovelace');
  assert.match(encrypted, /^v1:/);
  assert.equal(await decryptString(key, encrypted), 'Ada Lovelace');
});

test('returns null for nullable encryption helpers', async () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const { encryptNullableString, decryptNullableString } = await loadModule();

  assert.equal(await encryptNullableString(key, null), null);
  assert.equal(await encryptNullableString(key, undefined), null);
  assert.equal(await decryptNullableString(key, null), null);
  assert.equal(await decryptNullableString(key, undefined), null);
});

test('encrypts and decrypts JSON values', async () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const { encryptJson, decryptJson } = await loadModule('-json');
  const encrypted = await encryptJson(key, ['question one', 'question two']);

  assert.doesNotMatch(encrypted, /question one/);
  assert.deepEqual(await decryptJson(key, encrypted), ['question one', 'question two']);
});

test('rejects missing or invalid encryption key', async () => {
  const missingKeyModule = await loadModule('-missing-key');
  await assert.rejects(() => missingKeyModule.encryptString(undefined, 'Ada'), /SYNC_ENCRYPTION_KEY/);

  const invalidKey = Buffer.alloc(31, 7).toString('base64');
  const invalidKeyModule = await loadModule('-invalid-key');
  await assert.rejects(() => invalidKeyModule.encryptString(invalidKey, 'Ada'), /SYNC_ENCRYPTION_KEY/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
  await cleanTsModule(`${suiteName}-json`);
  await cleanTsModule(`${suiteName}-missing-key`);
  await cleanTsModule(`${suiteName}-invalid-key`);
});
