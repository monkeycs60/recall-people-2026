export type ProfileAvatarPresentation = 'female' | 'male' | 'neutral';

const FEMALE_FIRST_NAMES = new Set([
  'alice',
  'amelia',
  'anna',
  'ava',
  'camila',
  'chloe',
  'claire',
  'clara',
  'emma',
  'emily',
  'eva',
  'fatima',
  'giulia',
  'grace',
  'hannah',
  'isabella',
  'jade',
  'julia',
  'lucia',
  'lucie',
  'lucy',
  'luna',
  'maria',
  'marie',
  'mia',
  'nadia',
  'olivia',
  'sarah',
  'sofia',
  'sophia',
  'sophie',
  'zoe',
]);

const MALE_FIRST_NAMES = new Set([
  'adam',
  'alexandre',
  'arthur',
  'benjamin',
  'clement',
  'david',
  'diego',
  'ethan',
  'gabriel',
  'henry',
  'hugo',
  'jack',
  'james',
  'jean',
  'julien',
  'leo',
  'liam',
  'lucas',
  'luca',
  'marco',
  'martin',
  'mateo',
  'mehdi',
  'michael',
  'mohamed',
  'nathan',
  'noah',
  'paul',
  'pierre',
  'romain',
  'samuel',
  'thomas',
]);

const AMBIGUOUS_FIRST_NAMES = new Set([
  'alex',
  'andrea',
  'camille',
  'charlie',
  'claude',
  'dominique',
  'eden',
  'morgan',
  'sacha',
  'sasha',
]);

export function normalizeFirstName(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || '';

  return firstName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z-]/g, '')
    .split('-')[0]
    .toLowerCase();
}

export function inferProfileAvatarPresentation(name: string): ProfileAvatarPresentation {
  const firstName = normalizeFirstName(name);

  if (!firstName || AMBIGUOUS_FIRST_NAMES.has(firstName)) {
    return 'neutral';
  }

  if (FEMALE_FIRST_NAMES.has(firstName)) {
    return 'female';
  }

  if (MALE_FIRST_NAMES.has(firstName)) {
    return 'male';
  }

  return 'neutral';
}

export function getProfileDicebearUrl(name: string): string {
  const presentation = inferProfileAvatarPresentation(name);
  const params = new URLSearchParams({
    seed: name,
    backgroundType: 'solid',
    radius: '50',
  });

  if (presentation === 'female') {
    params.set('backgroundColor', 'f8e1ec');
    params.set('baseColor', 'f8c6b2');
    params.set('shirtColor', '7c3aed,e879f9,f97316');
    params.set('hair', 'full,pixie');
    params.set('hairColor', '2c1b18,6f4e37,a85534');
    params.set('facialHairProbability', '0');
    params.set('earringsProbability', '75');
  } else if (presentation === 'male') {
    params.set('backgroundColor', 'dbeafe');
    params.set('baseColor', 'f9c9b6');
    params.set('shirtColor', '2563eb,0f766e,6b7d8a');
    params.set('hair', 'fonze,dougFunny,dannyPhantom');
    params.set('hairColor', '2c1b18,4b2e1f,111827');
    params.set('facialHairProbability', '12');
    params.set('earringsProbability', '0');
  } else {
    params.set('backgroundColor', 'e8ecef');
    params.set('baseColor', 'f9c9b6');
    params.set('shirtColor', '6b7d8a,7c3aed,0f766e');
    params.set('hair', 'full,fonze,pixie');
    params.set('hairColor', '2c1b18,6f4e37,111827');
    params.set('facialHairProbability', '0');
    params.set('earringsProbability', '20');
  }

  return `https://api.dicebear.com/9.x/micah/svg?${params.toString()}`;
}
