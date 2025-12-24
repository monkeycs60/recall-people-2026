import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Memory } from '@/types';

export const memoryService = {
  getByContact: async (contactId: string): Promise<Memory[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      description: string;
      event_date: string | null;
      is_shared: number;
      source_note_id: string | null;
      created_at: string;
    }>(
      'SELECT * FROM memories WHERE contact_id = ? ORDER BY created_at DESC',
      [contactId]
    );

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      description: row.description,
      eventDate: row.event_date || undefined,
      isShared: Boolean(row.is_shared),
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
    }));
  },

  create: async (data: {
    contactId: string;
    description: string;
    eventDate?: string;
    isShared: boolean;
    sourceNoteId?: string;
  }): Promise<Memory> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO memories (id, contact_id, description, event_date, is_shared, source_note_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.description,
        data.eventDate || null,
        data.isShared ? 1 : 0,
        data.sourceNoteId || null,
        now,
      ]
    );

    return {
      id,
      contactId: data.contactId,
      description: data.description,
      eventDate: data.eventDate,
      isShared: data.isShared,
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
    };
  },

  update: async (
    id: string,
    data: Partial<{
      description: string;
      eventDate: string;
      isShared: boolean;
    }>
  ): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.eventDate !== undefined) {
      updates.push('event_date = ?');
      values.push(data.eventDate || null);
    }
    if (data.isShared !== undefined) {
      updates.push('is_shared = ?');
      values.push(data.isShared ? 1 : 0);
    }

    if (updates.length === 0) return;

    values.push(id);

    await db.runAsync(`UPDATE memories SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM memories WHERE id = ?', [id]);
  },
};
