import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reviewScreenPath = resolve(__dirname, '../app/review.tsx');
const contactScreenPath = resolve(__dirname, '../app/contact/[id].tsx');
const selectContactScreenPath = resolve(__dirname, '../app/select-contact.tsx');

const contactEditModalPaths = [
  '../components/contact/CreateContactModal.tsx',
  '../components/contact/NameEditModal.tsx',
  '../components/contact/EmailEditModal.tsx',
  '../components/contact/PhoneEditModal.tsx',
  '../components/contact/BirthdayEditModal.tsx',
];

test('review screen adjusts its scrollable content when the keyboard opens', async () => {
  const source = await readFile(reviewScreenPath, 'utf8');

  assert.match(source, /KeyboardAvoidingView/);
  assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : 'height'\}/);
  assert.match(source, /automaticallyAdjustKeyboardInsets=\{Platform\.OS === 'ios'\}/);
  assert.match(source, /keyboardShouldPersistTaps="handled"/);
  assert.match(source, /keyboardDismissMode="interactive"/);
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
