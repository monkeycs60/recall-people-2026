import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'contact-display-name';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/contactDisplayName.ts',
    suiteName,
  });
}

test('formats first and last names with normalized capitalization', async () => {
  const { getContactDisplayName } = await loadModule();

  assert.equal(
    getContactDisplayName({
      firstName: 'aDA',
      lastName: 'loVELACE',
      nickname: null,
    }),
    'Ada Lovelace',
  );
});

test('formats multi-word last names word by word', async () => {
  const { getContactDisplayName } = await loadModule();

  assert.equal(
    getContactDisplayName({
      firstName: 'marie',
      lastName: 'du pont',
      nickname: null,
    }),
    'Marie Du Pont',
  );
});

test('uses nickname as a fallback when last name is missing', async () => {
  const { getContactDisplayName } = await loadModule();

  assert.equal(
    getContactDisplayName({
      firstName: 'paul',
      lastName: null,
      nickname: 'running',
    }),
    'Paul Running',
  );
});

test('uses only the first name when neither last name nor nickname exists', async () => {
  const { getContactDisplayName } = await loadModule();

  assert.equal(
    getContactDisplayName({
      firstName: 'cLARA',
      lastName: null,
      nickname: null,
    }),
    'Clara',
  );
});

test('builds initials from first and last names when available', async () => {
  const { getContactInitials } = await loadModule();

  assert.equal(
    getContactInitials({
      firstName: 'ada',
      lastName: 'lovelace',
      nickname: null,
    }),
    'AL',
  );
});

test('builds a single initial when no last name exists', async () => {
  const { getContactInitials } = await loadModule();

  assert.equal(
    getContactInitials({
      firstName: 'ada',
      lastName: null,
      nickname: 'math',
    }),
    'A',
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
