const MAX_LOVES = 6;

const normalizeLoveKey = (value: string): string => value.trim().toLowerCase();

const cleanLove = (value: string): string => value.trim().replace(/\s+/g, ' ');

export function mergeLoves(existing: string[] = [], extracted: string[] = []): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const rawLove of [...existing, ...extracted]) {
    const love = cleanLove(rawLove);
    if (!love) continue;

    const key = normalizeLoveKey(love);
    if (seen.has(key)) continue;

    seen.add(key);
    merged.push(love);

    if (merged.length >= MAX_LOVES) break;
  }

  return merged;
}
