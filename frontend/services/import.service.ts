import { getDatabase } from '@/lib/db';
import {
  SeedContact,
  generateSeedContacts,
  seedContacts,
  SeedContactInput,
  generateAvatarFromHints,
  AvatarHints,
} from '@/lib/api';
import { FactType, HotTopicStatus, Gender } from '@/types';
import { contactService } from './contact.service';

export type ImportResult = {
  success: boolean;
  importedCount: number;
  errors: string[];
  contactsForAvatars?: Array<{
    id: string;
    gender: Gender;
    avatarHints: AvatarHints;
  }>;
};

export const importService = {
  /**
   * Generate random contacts via backend and import them locally
   * Also triggers background avatar generation
   */
  generateAndImport: async (
    count: number = 5,
    locale: 'en' | 'fr' = 'fr',
    richness: 'minimal' | 'normal' | 'rich' = 'rich',
    generateAvatars: boolean = true
  ): Promise<ImportResult> => {
    const response = await generateSeedContacts(count, locale, richness);
    const result = await importService.importContacts(response.contacts);

    // Start avatar generation in background if enabled
    if (generateAvatars && result.contactsForAvatars && result.contactsForAvatars.length > 0) {
      importService.generateAvatarsInBackground(result.contactsForAvatars);
    }

    return result;
  },

  /**
   * Send custom contacts to backend for processing, then import locally
   */
  seedAndImport: async (contacts: SeedContactInput[]): Promise<ImportResult> => {
    const response = await seedContacts(contacts);
    return importService.importContacts(response.contacts);
  },

  /**
   * Generate avatars for contacts in background (fire and forget)
   */
  generateAvatarsInBackground: (
    contacts: Array<{ id: string; gender: Gender; avatarHints: AvatarHints }>
  ): void => {
    console.log(`[Import] Starting background avatar generation for ${contacts.length} contacts`);

    // Process sequentially with delay to avoid rate limits
    const generateSequentially = async () => {
      for (const contact of contacts) {
        try {
          console.log(`[Import] Generating avatar for contact ${contact.id}...`);

          const result = await generateAvatarFromHints({
            contactId: contact.id,
            gender: contact.gender,
            avatarHints: contact.avatarHints,
          });

          // Update contact with avatar URL
          await contactService.update(contact.id, {
            avatarUrl: result.avatarUrl,
          });

          console.log(`[Import] Avatar generated for ${contact.id}: ${result.avatarUrl}`);

          // Small delay between requests to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`[Import] Failed to generate avatar for ${contact.id}:`, error);
          // Continue with next contact, don't fail the whole batch
        }
      }
      console.log(`[Import] Background avatar generation complete`);
    };

    // Fire and forget - don't await
    generateSequentially().catch((error) => {
      console.error('[Import] Background avatar generation failed:', error);
    });
  },

  /**
   * Import contacts directly into local SQLite database
   */
  importContacts: async (contacts: SeedContact[]): Promise<ImportResult> => {
    const db = await getDatabase();
    const errors: string[] = [];
    let importedCount = 0;
    const contactsForAvatars: Array<{ id: string; gender: Gender; avatarHints: AvatarHints }> = [];

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

        // Collect info for avatar generation
        if (contact.avatarHints) {
          contactsForAvatars.push({
            id: contact.id,
            gender: (contact.gender || 'unknown') as Gender,
            avatarHints: contact.avatarHints,
          });
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
      contactsForAvatars,
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
