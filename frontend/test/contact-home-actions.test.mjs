import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, '..');
const localeCodes = ['en', 'fr', 'es', 'it', 'de'];

test('contacts screen opens bottom sheets for manual contact creation and sorting', async () => {
  const source = await readFile(resolve(frontendRoot, 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(source, /CreateContactSheet/);
  assert.match(source, /ContactSortSheet/);
  assert.match(source, /ListFilter/);
  assert.match(source, /sortSheetRef\.current\?\.present\(\)/);
  assert.doesNotMatch(source, /CreateContactModal/);
  assert.doesNotMatch(source, /onPress=\{\(\) => router\.push\('\/\(tabs\)\/profile'\)\}/);
});

test('contacts screen header names the current section', async () => {
  const source = await readFile(resolve(frontendRoot, 'app/(tabs)/index.tsx'), 'utf8');

  assert.match(source, /<Text style=\{styles\.screenTitle\}>Contacts<\/Text>/);
  assert.doesNotMatch(source, /<Text style=\{styles\.screenTitle\}>Recall<\/Text>/);
});

test('manual contact creation sheet offers voice, type, and skip actions', async () => {
  const source = await readFile(resolve(frontendRoot, 'components/contact/CreateContactSheet.tsx'), 'utf8');

  assert.match(source, /BottomSheetModal/);
  assert.match(source, /BottomSheetTextInput/);
  assert.match(source, /contacts\.createModal\.recordVoice/);
  assert.match(source, /contacts\.createModal\.recordType/);
  assert.match(source, /contacts\.createModal\.skip/);
  assert.doesNotMatch(source, /import \{[^}]*Modal[^}]*\} from 'react-native'/);
  assert.doesNotMatch(source, /<Modal/);
});

test('contact sort sheet exposes every supported sort mode', async () => {
  const source = await readFile(resolve(frontendRoot, 'components/contact/ContactSortSheet.tsx'), 'utf8');

  for (const mode of [
    'next-deadline',
    'upcoming-birthday',
    'overdue',
    'recent-contact',
    'alphabetical',
  ]) {
    assert.match(source, new RegExp(mode));
  }

  assert.doesNotMatch(source, /hot-topics/);
  assert.doesNotMatch(source, /contacts\.sort\.options\.hotTopics/);
});

test('manual contact and contact sorting strings are translated in every supported locale', async () => {
  for (const localeCode of localeCodes) {
    const locale = JSON.parse(await readFile(resolve(frontendRoot, `locales/${localeCode}.json`), 'utf8'));

    for (const key of [
      'addFirstNoteTitle',
      'addFirstNoteDescription',
      'recordVoice',
      'recordType',
      'skip',
    ]) {
      assert.equal(typeof locale.contacts.createModal[key], 'string', `${localeCode}: createModal.${key}`);
      assert.ok(locale.contacts.createModal[key].trim().length > 0, `${localeCode}: createModal.${key}`);
    }

    assert.equal(typeof locale.contacts.sort.title, 'string', `${localeCode}: contacts.sort.title`);
    assert.equal(typeof locale.contacts.sort.done, 'string', `${localeCode}: contacts.sort.done`);

    for (const mode of [
      'nextDeadline',
      'upcomingBirthday',
      'overdue',
      'recentContact',
      'alphabetical',
    ]) {
      assert.equal(typeof locale.contacts.sort.options[mode].title, 'string', `${localeCode}: ${mode}.title`);
      assert.equal(typeof locale.contacts.sort.options[mode].subtitle, 'string', `${localeCode}: ${mode}.subtitle`);
    }

    assert.equal(locale.contacts.sort.options.hotTopics, undefined, `${localeCode}: hotTopics removed`);
  }
});
