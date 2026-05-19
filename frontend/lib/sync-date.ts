export const toSyncIsoDate = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value !== 'string' || value.trim().length === 0) return fallback;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return `${value.replace(' ', 'T')}Z`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
};

export const toNullableSyncIsoDate = (value: unknown): string | null => (
  value == null || value === '' ? null : toSyncIsoDate(value)
);
