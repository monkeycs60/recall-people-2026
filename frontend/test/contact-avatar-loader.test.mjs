import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contactAvatarPath = resolve(__dirname, '../components/contact/ContactAvatar.tsx');
const localeCodes = ['en', 'fr', 'de', 'es', 'it'];

test('avatar generation placeholder stays discreet with staggered loading dots', async () => {
  const source = await readFile(contactAvatarPath, 'utf8');

  assert.match(source, /useTranslation/);
  assert.match(source, /t\('contact\.avatar\.generatingShort'\)/);
  assert.match(source, /t\('contact\.avatar\.generatingTitle'\)/);
  assert.match(source, /dotAnims/);
  assert.match(source, /Animated\.stagger\(\s*160/);
  assert.match(source, /Animated\.delay\(260/);
  assert.match(source, /accessibilityState=\{\{ busy: true \}\}/);
  assert.doesNotMatch(source, /spinAnim|shimmerAnim|generatingRing|generatingShimmer|Sparkles/);
});

test('avatar generation placeholder is localized in every supported language', async () => {
  for (const localeCode of localeCodes) {
    const localePath = resolve(__dirname, `../locales/${localeCode}.json`);
    const locale = JSON.parse(await readFile(localePath, 'utf8'));

    assert.equal(typeof locale.contact.avatar.generatingShort, 'string');
    assert.ok(locale.contact.avatar.generatingShort.length > 0);
  }
});
