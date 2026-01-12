import { getDatabase } from '@/lib/db';
import { SeedContact, SeedResponse, generateSeedContacts, seedContacts, SeedContactInput } from '@/lib/api';
import { FactType, Gender, HotTopicStatus } from '@/types';

export type ImportResult = {
  success: boolean;
  importedCount: number;
  errors: string[];
};

export const importService = {
  /**
   * Generate random contacts via backend and import them locally
   */
  generateAndImport: async (
    count: number = 5,
    locale: 'en' | 'fr' = 'fr',
    richness: 'minimal' | 'normal' | 'rich' = 'rich'
  ): Promise<ImportResult> => {
    const response = await generateSeedContacts(count, locale, richness);
    return importService.importContacts(response.contacts);
  },

  /**
   * Send custom contacts to backend for processing, then import locally
   */
  seedAndImport: async (contacts: SeedContactInput[]): Promise<ImportResult> => {
    const response = await seedContacts(contacts);
    return importService.importContacts(response.contacts);
  },

  /**
   * Import contacts directly into local SQLite database
   */
  importContacts: async (contacts: SeedContact[]): Promise<ImportResult> => {
    const db = await getDatabase();
    const errors: string[] = [];
    let importedCount = 0;

    for (const contact of contacts) {
      try {
        const now = new Date().toISOString();

        // Insert contact
        await db.runAsync(
          `INSERT OR REPLACE INTO contacts (
            id, first_name, last_name, nickname, gender,
            phone, email, birthday_day, birthday_month, birthday_year,
            ai_summary, highlights, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contact.id,
            contact.firstName,
            contact.lastName || null,
            contact.nickname || null,
            contact.gender || 'unknown',
            contact.phone || null,
            contact.email || null,
            contact.birthdayDay || null,
            contact.birthdayMonth || null,
            contact.birthdayYear || null,
            contact.aiSummary || null,
            JSON.stringify([]),
            now,
            now,
          ]
        );

        // Insert facts
        for (const fact of contact.facts) {
          await db.runAsync(
            `INSERT OR REPLACE INTO facts (
              id, contact_id, fact_type, fact_key, fact_value,
              previous_values, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fact.id,
              fact.contactId,
              fact.factType as FactType,
              fact.factKey,
              fact.factValue,
              JSON.stringify([]),
              now,
              now,
            ]
          );
        }

        // Insert memories
        for (const memory of contact.memories) {
          await db.runAsync(
            `INSERT OR REPLACE INTO memories (
              id, contact_id, description, event_date, is_shared, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              memory.id,
              memory.contactId,
              memory.description,
              memory.eventDate || null,
              memory.isShared ? 1 : 0,
              now,
            ]
          );
        }

        // Insert hot topics
        for (const topic of contact.hotTopics) {
          await db.runAsync(
            `INSERT OR REPLACE INTO hot_topics (
              id, contact_id, title, context, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              topic.id,
              topic.contactId,
              topic.title,
              topic.context || null,
              topic.status as HotTopicStatus,
              now,
              now,
            ]
          );
        }

        // Insert notes
        for (const note of contact.notes) {
          await db.runAsync(
            `INSERT OR REPLACE INTO notes (
              id, contact_id, title, transcription, summary, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              note.id,
              note.contactId,
              note.title || null,
              note.transcription || null,
              note.summary || null,
              now,
            ]
          );
        }

        importedCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to import ${contact.firstName}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      importedCount,
      errors,
    };
  },

  /**
   * Clear all contacts and related data (for testing)
   */
  clearAllData: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hot_topics');
    await db.runAsync('DELETE FROM memories');
    await db.runAsync('DELETE FROM facts');
    await db.runAsync('DELETE FROM notes');
    await db.runAsync('DELETE FROM contact_groups');
    await db.runAsync('DELETE FROM contacts');
  },
};
