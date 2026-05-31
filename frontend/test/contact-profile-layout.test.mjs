import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contactProfilePath = resolve(__dirname, '../app/contact/[id]/index.tsx');

test('contact profile hero separates group chips from birthday phone and email chips', async () => {
  const source = await readFile(contactProfilePath, 'utf8');

  assert.match(source, /styles\.profileMetaRows/);
  assert.match(source, /styles\.groupMetaRow/);
  assert.match(source, /styles\.contactInfoRow/);

  const groupRowIndex = source.indexOf('styles.groupMetaRow');
  const contactInfoRowIndex = source.indexOf('styles.contactInfoRow');
  const birthdayIndex = source.indexOf('birthdaySheetRef.current?.present()');
  const phoneIndex = source.indexOf('phoneSheetRef.current?.present()');
  const emailIndex = source.indexOf('emailSheetRef.current?.present()');

  assert.ok(groupRowIndex > -1, 'group row exists');
  assert.ok(contactInfoRowIndex > groupRowIndex, 'contact info row is rendered after group row');
  assert.ok(birthdayIndex > contactInfoRowIndex, 'birthday chip is on the contact info row');
  assert.ok(phoneIndex > birthdayIndex, 'phone chip follows birthday');
  assert.ok(emailIndex > phoneIndex, 'email chip follows phone');
});
