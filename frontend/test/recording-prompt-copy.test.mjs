import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const suiteName = 'recording-prompt-copy';
const localeCodes = ['en', 'fr', 'es', 'it', 'de'];

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/recordingPromptCopy.ts',
    suiteName,
  });
}

test('formats recording limits from the subscription duration', async () => {
  const { getRecordingLimitMinutes } = await loadModule();

  assert.equal(getRecordingLimitMinutes(60), 1);
  assert.equal(getRecordingLimitMinutes(180), 3);
  assert.equal(getRecordingLimitMinutes(119), 2);
});

test('selects contact-specific text placeholders when adding a note to a contact', async () => {
  const { getTextInputPlaceholderKeys } = await loadModule();

  assert.deepEqual(getTextInputPlaceholderKeys('general'), {
    intro: 'textInput.placeholderIntro',
    primary: 'textInput.placeholderBulletName',
    secondary: 'textInput.placeholderBulletLikes',
    upcoming: 'textInput.placeholderBulletUpcoming',
  });

  assert.deepEqual(getTextInputPlaceholderKeys('contact'), {
    intro: 'textInput.placeholderIntroWithContact',
    primary: 'textInput.placeholderBulletContactMoment',
    secondary: 'textInput.placeholderBulletContactDetail',
    upcoming: 'textInput.placeholderBulletContactUpcoming',
  });
});

test('record and type screens use dynamic prompt copy', async () => {
  const recordSource = await readFile(resolve(__dirname, '../app/record.tsx'), 'utf8');
  const textInputSource = await readFile(resolve(__dirname, '../components/TextInputMode.tsx'), 'utf8');

  assert.match(recordSource, /getRecordingLimitMinutes/);
  assert.match(recordSource, /record\.tapToRecordMinutes/);
  assert.doesNotMatch(recordSource, /tapToRecord2min/);

  assert.match(textInputSource, /getTextInputPlaceholderKeys/);
  assert.match(textInputSource, /placeholderKeys\.primary/);
  assert.match(textInputSource, /placeholderKeys\.secondary/);
  assert.match(textInputSource, /placeholderKeys\.upcoming/);
});

test('recording prompt strings are translated in every supported language', async () => {
  const requiredTextInputKeys = [
    'placeholderBulletContactMoment',
    'placeholderBulletContactDetail',
    'placeholderBulletContactUpcoming',
  ];

  for (const localeCode of localeCodes) {
    const localePath = resolve(__dirname, `../locales/${localeCode}.json`);
    const locale = JSON.parse(await readFile(localePath, 'utf8'));

    assert.equal(typeof locale.record.tapToRecordMinutes, 'string', `${localeCode}: tapToRecordMinutes`);
    assert.ok(locale.record.tapToRecordMinutes.includes('{{minutes}}'), `${localeCode}: minutes interpolation`);

    for (const key of requiredTextInputKeys) {
      assert.equal(typeof locale.textInput[key], 'string', `${localeCode}: ${key}`);
      assert.ok(locale.textInput[key].trim().length > 0, `${localeCode}: ${key}`);
    }
  }
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
