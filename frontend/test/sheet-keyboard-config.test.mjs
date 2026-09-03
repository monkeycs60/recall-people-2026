import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const scannedRoots = ['app', 'components'].map((folder) => resolve(projectRoot, folder));

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(entryPath);
      return entry.name.endsWith('.tsx') ? [entryPath] : [];
    })
  );

  return files.flat();
}

async function readScannedSources() {
  const files = (await Promise.all(scannedRoots.map(collectSourceFiles))).flat();

  return Promise.all(
    files.map(async (filePath) => ({
      path: relative(projectRoot, filePath),
      source: await readFile(filePath, 'utf8'),
    }))
  );
}

test('no screen declares the keyboard input mode edge-to-edge Android never applies', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(({ source }) => source.includes('android_keyboardInputMode'))
    .map(({ path }) => path);

  assert.deepEqual(
    offenders,
    [],
    `Use {...sheetKeyboardProps} instead: edge-to-edge Android never resizes the window, so "adjustResize" leaves the sheet under the keyboard (${offenders.join(', ')})`
  );
});

test('every bottom sheet holding a text input shares the keyboard configuration', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(
      ({ source }) =>
        /<BottomSheetModal\s/.test(source) &&
        /TextInput/.test(source) &&
        !source.includes('{...sheetKeyboardProps}')
    )
    .map(({ path }) => path);

  assert.deepEqual(offenders, [], `Missing {...sheetKeyboardProps} in ${offenders.join(', ')}`);
});

test('text inputs inside bottom sheets use the gorhom input so the sheet follows the keyboard', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(({ source }) => /<BottomSheetModal\s/.test(source) && /<TextInput\b/.test(source))
    .map(({ path }) => path);

  assert.deepEqual(offenders, [], `Replace TextInput with BottomSheetTextInput in ${offenders.join(', ')}`);
});

test('Android keyboard avoidance is never left to the window resize', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(({ source }) => /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/.test(source))
    .map(({ path }) => path);

  assert.deepEqual(
    offenders,
    [],
    `KeyboardAvoidingView needs an explicit Android behavior ('height') in ${offenders.join(', ')}`
  );
});

test('native modals holding an input avoid the keyboard themselves', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(({ source }) =>
      [...source.matchAll(/<Modal[\s>]/g)].some((match) => {
        const modalBlock = source.slice(match.index, source.indexOf('</Modal>', match.index));
        return /TextInput\b/.test(modalBlock) && !modalBlock.includes('KeyboardAvoidingView');
      })
    )
    .map(({ path }) => path);

  assert.deepEqual(
    offenders,
    [],
    `A native Modal is its own window: without a KeyboardAvoidingView its inputs stay under the keyboard (${offenders.join(', ')})`
  );
});

test('every KeyboardAvoidingView declares how it avoids the keyboard', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(({ source }) =>
      [...source.matchAll(/<KeyboardAvoidingView\b/g)].some(
        (match) => !source.slice(match.index, match.index + 300).includes('behavior=')
      )
    )
    .map(({ path }) => path);

  assert.deepEqual(offenders, [], `Missing behavior prop in ${offenders.join(', ')}`);
});

test('no bottom sheet is locked to a fixed height', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(({ source }) => source.includes('enableDynamicSizing={false}'))
    .map(({ path }) => path);

  assert.deepEqual(
    offenders,
    [],
    `Percentage detents clip anything taller than the percentage: keep enableDynamicSizing and add snapPoints if a floor is needed (${offenders.join(', ')})`
  );
});

test('every bottom sheet caps its height below the status bar', async () => {
  const sources = await readScannedSources();
  const offenders = sources
    .filter(
      ({ source }) =>
        /<BottomSheetModal\s/.test(source) && !source.includes('maxDynamicContentSize')
    )
    .map(({ path }) => path);

  assert.deepEqual(
    offenders,
    [],
    `Uncapped dynamic sizing lets the sheet grow under the status bar and ignores the keyboard: pass maxDynamicContentSize={useSheetMaxHeight()} (${offenders.join(', ')})`
  );
});
