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
      previous_values: string | null;
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
      previousValues: JSON.parse(row.previous_values || '[]'),
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
      `INSERT INTO facts (id, contact_id, fact_type, fact_key, fact_value, previous_values, source_note_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.factType,
        data.factKey,
        data.factValue,
        JSON.stringify([]),
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
      previousValues: [],
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: string, data: { factKey?: string; factValue?: string }): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: string[] = [];

    if (data.factKey !== undefined) {
      updates.push('fact_key = ?');
      values.push(data.factKey);
    }
    if (data.factValue !== undefined) {
      updates.push('fact_value = ?');
      values.push(data.factValue);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE facts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  },

  updateWithHistory: async (id: string, newValue: string): Promise<void> => {
    const db = await getDatabase();

    const existing = await db.getFirstAsync<{
      fact_value: string;
      previous_values: string | null;
    }>('SELECT fact_value, previous_values FROM facts WHERE id = ?', [id]);

    if (!existing) return;

    const previousValues: string[] = JSON.parse(existing.previous_values || '[]');
    previousValues.unshift(existing.fact_value);

    await db.runAsync(
      'UPDATE facts SET fact_value = ?, previous_values = ?, updated_at = ? WHERE id = ?',
      [newValue, JSON.stringify(previousValues), new Date().toISOString(), id]
    );
  },

  findByTypeAndKey: async (
    contactId: string,
    factType: FactType,
    factKey: string
  ): Promise<Fact | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      id: string;
      contact_id: string;
      fact_type: string;
      fact_key: string;
      fact_value: string;
      previous_values: string | null;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      'SELECT * FROM facts WHERE contact_id = ? AND fact_type = ? AND fact_key = ?',
      [contactId, factType, factKey]
    );

    if (!row) return null;

    return {
      id: row.id,
      contactId: row.contact_id,
      factType: row.fact_type as FactType,
      factKey: row.fact_key,
      factValue: row.fact_value,
      previousValues: JSON.parse(row.previous_values || '[]'),
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM facts WHERE id = ?', [id]);
  },
};
