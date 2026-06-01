import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reviewScreenPath = resolve(__dirname, '../app/review.tsx');
const contactScreenPath = resolve(__dirname, '../app/contact/[id]/index.tsx');
const selectContactScreenPath = resolve(__dirname, '../app/select-contact.tsx');
const localePaths = [
  '../locales/en.json',
  '../locales/fr.json',
  '../locales/es.json',
  '../locales/it.json',
  '../locales/de.json',
];

const contactEditModalPaths = [
  '../components/contact/CreateContactModal.tsx',
];

const contactEditSheetPaths = [
  '../components/contact/NameEditSheet.tsx',
  '../components/contact/EmailEditSheet.tsx',
  '../components/contact/PhoneEditSheet.tsx',
  '../components/contact/BirthdayEditSheet.tsx',
  '../components/contact/MeetingContextEditSheet.tsx',
];

test('review screen adjusts its scrollable content when the keyboard opens', async () => {
  const source = await readFile(reviewScreenPath, 'utf8');

  assert.match(source, /KeyboardAvoidingView/);
  assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/);
  assert.match(source, /automaticallyAdjustKeyboardInsets=\{Platform\.OS === 'ios'\}/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /keyboardDismissMode="interactive"/);
});

test('review screen reserves bottom scroll space for the floating save button', async () => {
  const source = await readFile(reviewScreenPath, 'utf8');

  assert.match(source, /const FLOATING_SAVE_RESERVED_SPACE = 144;/);
  assert.match(
    source,
    /contentContainerStyle=\{\[\s*styles\.scrollContent,\s*\{ paddingBottom: insets\.bottom \+ FLOATING_SAVE_RESERVED_SPACE }\s*\]\}/s
  );
  assert.match(source, /paddingBottom: insets\.bottom \+ FLOATING_SAVE_BOTTOM_PADDING/);
});

test('review screen summarizes captured details and reminders in every locale', async () => {
  const source = await readFile(reviewScreenPath, 'utf8');

  assert.match(source, /capturedDetailCount/);
  assert.match(source, /selectedReminderCount/);
  assert.match(source, /t\('review\.capturedDetails'/);
  assert.match(source, /t\('review\.saveSummary'/);

  for (const localePath of localePaths) {
    const locale = JSON.parse(await readFile(resolve(__dirname, localePath), 'utf8'));
    const review = locale.review;

    for (const key of [
      'capturedDetails_one',
      'capturedDetails_other',
      'summaryHelp',
      'detailsCount_one',
      'detailsCount_other',
      'remindersCount_one',
      'remindersCount_other',
      'saveSummary',
    ]) {
      assert.equal(typeof review[key], 'string', `${localePath} is missing review.${key}`);
    }
  }
});

test('review screen normalizes route params before deciding create or update mode', async () => {
  const source = await readFile(reviewScreenPath, 'utf8');

  assert.match(source, /resolveReviewContactId\(params\.contactId, extraction\.contactIdentified\.id\)/);
  assert.doesNotMatch(source, /const contactId = params\.contactId as string/);
});

test('contact and contact-selection screens keep focused inputs above the keyboard', async () => {
  for (const screenPath of [contactScreenPath, selectContactScreenPath]) {
    const source = await readFile(screenPath, 'utf8');

    assert.match(source, /KeyboardAvoidingView/, screenPath);
    assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/, screenPath);
    assert.match(source, /automaticallyAdjustKeyboardInsets=\{Platform\.OS === 'ios'\}/, screenPath);
    assert.match(source, /keyboardShouldPersistTaps="handled"/, screenPath);
  }
});

test('contact edit modals avoid covering their inputs with the keyboard', async () => {
  for (const modalPath of contactEditModalPaths) {
    const source = await readFile(resolve(__dirname, modalPath), 'utf8');

    assert.match(source, /KeyboardAvoidingView/, modalPath);
    assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/, modalPath);
  }
});

test('contact edit sheets keep inputs above the keyboard via the shared sheet shell', async () => {
  const shellSource = await readFile(
    resolve(__dirname, '../components/ui/EditSheetShell.tsx'),
    'utf8'
  );

  assert.match(shellSource, /keyboardBehavior="fillParent"/);
  assert.match(shellSource, /android_keyboardInputMode="adjustResize"/);
  assert.match(shellSource, /BottomSheetModal/);

  for (const sheetPath of contactEditSheetPaths) {
    const source = await readFile(resolve(__dirname, sheetPath), 'utf8');

    assert.match(source, /BottomSheetTextInput/, sheetPath);
  }
});
