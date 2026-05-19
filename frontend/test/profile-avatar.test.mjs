import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'profile-avatar';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'utils/profileAvatar.ts',
    suiteName,
  });
}

test('infers profile avatar presentation from high-confidence first names', async () => {
  const { inferProfileAvatarPresentation } = await loadModule();

  assert.equal(inferProfileAvatarPresentation('Sofia Garcia'), 'female');
  assert.equal(inferProfileAvatarPresentation('Clement Serizay'), 'male');
  assert.equal(inferProfileAvatarPresentation('Camille Martin'), 'neutral');
  assert.equal(inferProfileAvatarPresentation('Unknown Person'), 'neutral');
});

test('builds distinct DiceBear URLs for feminine and masculine profile fallbacks', async () => {
  const { getProfileDicebearUrl } = await loadModule();

  const femaleUrl = getProfileDicebearUrl('Emma Johnson');
  const maleUrl = getProfileDicebearUrl('Romain Gauthier');

  assert.match(femaleUrl, /earringsProbability=75/);
  assert.match(femaleUrl, /facialHairProbability=0/);
  assert.match(maleUrl, /earringsProbability=0/);
  assert.match(maleUrl, /facialHairProbability=12/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
