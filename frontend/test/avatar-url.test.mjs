import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'avatar-url';

async function loadModule() {
  return loadTsModule({ entryPoint: 'lib/avatar-url.ts', suiteName });
}

test.after(() => cleanTsModule(suiteName));

test('upgrades cleartext production avatar URLs to https (the fix)', async () => {
  const { normalizeAvatarUrl } = await loadModule();
  assert.equal(
    normalizeAvatarUrl('http://api.recallpeople.com/api/avatar/abc/avatar-1.png'),
    'https://api.recallpeople.com/api/avatar/abc/avatar-1.png'
  );
});

test('leaves already-https production URLs untouched', async () => {
  const { normalizeAvatarUrl } = await loadModule();
  const url = 'https://api.recallpeople.com/api/avatar/abc/avatar-1.png';
  assert.equal(normalizeAvatarUrl(url), url);
});

test('leaves dev/LAN http URLs untouched (cleartext is fine in dev)', async () => {
  const { normalizeAvatarUrl } = await loadModule();
  for (const url of [
    'http://10.0.2.2:8787/api/avatar/abc/avatar-1.png',
    'http://localhost:8787/api/avatar/abc/avatar-1.png',
    'http://192.168.1.37:8787/api/avatar/abc/avatar-1.png',
  ]) {
    assert.equal(normalizeAvatarUrl(url), url);
  }
});

test('does not match look-alike hosts', async () => {
  const { normalizeAvatarUrl } = await loadModule();
  const evil = 'http://api.recallpeople.com.evil.test/x.png';
  assert.equal(normalizeAvatarUrl(evil), evil);
});

test('returns undefined for empty/nullish input', async () => {
  const { normalizeAvatarUrl } = await loadModule();
  assert.equal(normalizeAvatarUrl(undefined), undefined);
  assert.equal(normalizeAvatarUrl(null), undefined);
  assert.equal(normalizeAvatarUrl(''), undefined);
});
