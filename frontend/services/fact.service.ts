import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Fact, FactType } from '@/types';

export const factService = {
  getByContact: async (contactId: string): Promise<Fact[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      fact_type: string;
      fact_key: string;
      fact_value: string;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM facts WHERE contact_id = ?', [contactId]);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      factType: row.fact_type as FactType,
      factKey: row.fact_key,
      factValue: row.fact_value,
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  create: async (data: {
    contactId: string;
    factType: FactType;
    factKey: string;
    factValue: string;
    sourceNoteId?: string;
  }): Promise<Fact> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO facts (id, contact_id, fact_type, fact_key, fact_value, source_note_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.factType,
        data.factKey,
        data.factValue,
        data.sourceNoteId || null,
        now,
        now,
      ]
    );

    return {
      id,
      contactId: data.contactId,
      factType: data.factType,
      factKey: data.factKey,
      factValue: data.factValue,
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: string, factValue: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE facts SET fact_value = ?, updated_at = ? WHERE id = ?',
      [factValue, new Date().toISOString(), id]
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM facts WHERE id = ?', [id]);
  },
};
