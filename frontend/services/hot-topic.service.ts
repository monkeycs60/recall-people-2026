import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { HotTopic, HotTopicStatus } from '@/types';

export const hotTopicService = {
  getByContact: async (contactId: string, includeResolved = false): Promise<HotTopic[]> => {
    const db = await getDatabase();
    const query = includeResolved
      ? 'SELECT * FROM hot_topics WHERE contact_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM hot_topics WHERE contact_id = ? AND status = ? ORDER BY created_at DESC';
    const params = includeResolved ? [contactId] : [contactId, 'active'];

    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string;
      context: string | null;
      status: string;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>(query, params);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title,
      context: row.context || undefined,
      status: row.status as HotTopicStatus,
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
    }));
  },

  create: async (data: {
    contactId: string;
    title: string;
    context?: string;
    sourceNoteId?: string;
  }): Promise<HotTopic> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO hot_topics (id, contact_id, title, context, status, source_note_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.contactId, data.title, data.context || null, 'active', data.sourceNoteId || null, now, now]
    );

    return {
      id,
      contactId: data.contactId,
      title: data.title,
      context: data.context,
      status: 'active',
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: string, data: Partial<{
    title: string;
    context: string;
  }>): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.title) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.context !== undefined) {
      updates.push('context = ?');
      values.push(data.context || null);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(`UPDATE hot_topics SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  resolve: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?',
      ['resolved', now, now, id]
    );
  },

  reopen: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET status = ?, resolved_at = NULL, updated_at = ? WHERE id = ?',
      ['active', now, id]
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hot_topics WHERE id = ?', [id]);
  },
};
