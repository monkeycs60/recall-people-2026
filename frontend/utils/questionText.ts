export function normalizeQuestionText(value: string): string {
  if (!/%[0-9a-fA-F]{2}/.test(value)) {
    return value;
  }

  try {
    return decodeURIComponent(value).replace(/\s+/g, ' ').trim();
  } catch {
    return value;
  }
}
