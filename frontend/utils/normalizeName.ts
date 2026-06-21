const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

export const normalizeName = (value: string | null | undefined): string => {
  if (!value) return '';

  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};
