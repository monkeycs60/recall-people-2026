import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gradle = readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
const manifest = readFileSync(
  new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url),
  'utf8'
);

test('keeps Recall People Dev isolated from the production Android app', () => {
  assert.match(gradle, /applicationId\s+'com\.monkeycs60\.recallpeople2026'/);
  assert.match(gradle, /debug\s*\{[^}]*applicationIdSuffix\s+'\.dev'/s);
  assert.match(gradle, /debug\s*\{[^}]*resValue\s+"string",\s*"app_name",\s*"Recall People Dev"/s);
});

test('uses a dedicated deep-link scheme for the development variant', () => {
  assert.match(gradle, /manifestPlaceholders\s*=\s*\[appAuthRedirectScheme:\s*"recall-people"\]/);
  assert.match(gradle, /debug\s*\{[^}]*manifestPlaceholders\.appAuthRedirectScheme\s*=\s*"recall-people-dev"/s);
  assert.match(manifest, /android:scheme="\$\{appAuthRedirectScheme\}"/);
});
