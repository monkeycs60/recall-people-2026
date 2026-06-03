import { getDatabase } from '@/lib/db';
import {
  CONTACT_SORT_DEFAULT_MODE,
  type ContactSortMode,
  isContactSortMode,
} from '@/utils/contactSort';

const CONTACT_SORT_PREFERENCE_KEY = 'contacts.sortMode';

const ensurePreferenceTable = async (): Promise<void> => {
  const db = await getDatabase();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
};

export const contactSortPreferenceService = {
  get: async (): Promise<ContactSortMode> => {
    await ensurePreferenceTable();
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_preferences WHERE key = ?',
      [CONTACT_SORT_PREFERENCE_KEY]
    );

    return isContactSortMode(row?.value) ? row.value : CONTACT_SORT_DEFAULT_MODE;
  },

  set: async (mode: ContactSortMode): Promise<void> => {
    await ensurePreferenceTable();
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO app_preferences (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [CONTACT_SORT_PREFERENCE_KEY, mode, now]
    );
  },
};
