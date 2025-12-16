import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Contact, ContactWithDetails, Fact, Note, Tag } from '@/types';

export const contactService = {
  getAll: async (): Promise<Contact[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      photo_uri: string | null;
      tags: string;
      highlights: string | null;
      last_contact_at: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM contacts ORDER BY last_contact_at DESC');

    return result.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      nickname: row.nickname || undefined,
      photoUri: row.photo_uri || undefined,
      tags: JSON.parse(row.tags),
      highlights: JSON.parse(row.highlights || '[]'),
      lastContactAt: row.last_contact_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  getById: async (id: string): Promise<ContactWithDetails | null> => {
    const db = await getDatabase();
    const contactRow = await db.getFirstAsync<{
      id: string;
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      photo_uri: string | null;
      tags: string;
      highlights: string | null;
      ai_summary: string | null;
      last_contact_at: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM contacts WHERE id = ?', [id]);

    if (!contactRow) return null;

    const factsRows = await db.getAllAsync<{
      id: string;
      contact_id: string;
      fact_type: string;
      fact_key: string;
      fact_value: string;
      previous_values: string | null;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM facts WHERE contact_id = ?', [id]);

    const notesRows = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string | null;
      audio_uri: string | null;
      audio_duration_ms: number | null;
      transcription: string | null;
      summary: string | null;
      created_at: string;
    }>('SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC', [id]);

    const hotTopicsRows = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string;
      context: string | null;
      status: string;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>('SELECT * FROM hot_topics WHERE contact_id = ? ORDER BY created_at DESC', [id]);

    const contact: ContactWithDetails = {
      id: contactRow.id,
      firstName: contactRow.first_name,
      lastName: contactRow.last_name || undefined,
      nickname: contactRow.nickname || undefined,
      photoUri: contactRow.photo_uri || undefined,
      tags: JSON.parse(contactRow.tags),
      highlights: JSON.parse(contactRow.highlights || '[]'),
      aiSummary: contactRow.ai_summary || undefined,
      lastContactAt: contactRow.last_contact_at || undefined,
      createdAt: contactRow.created_at,
      updatedAt: contactRow.updated_at,
      facts: factsRows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        factType: row.fact_type as Fact['factType'],
        factKey: row.fact_key,
        factValue: row.fact_value,
        previousValues: JSON.parse(row.previous_values || '[]'),
        sourceNoteId: row.source_note_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      notes: notesRows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        title: row.title || undefined,
        audioUri: row.audio_uri || undefined,
        audioDurationMs: row.audio_duration_ms || undefined,
        transcription: row.transcription || undefined,
        summary: row.summary || undefined,
        createdAt: row.created_at,
      })),
      hotTopics: hotTopicsRows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        title: row.title,
        context: row.context || undefined,
        status: row.status as 'active' | 'resolved',
        sourceNoteId: row.source_note_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at || undefined,
      })),
    };

    return contact;
  },

  create: async (data: {
    firstName: string;
    lastName?: string;
    nickname?: string;
    tags?: Tag[];
  }): Promise<Contact> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO contacts (id, first_name, last_name, nickname, tags, highlights, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.firstName,
        data.lastName || null,
        data.nickname || null,
        JSON.stringify(data.tags || []),
        JSON.stringify([]),
        now,
        now,
      ]
    );

    return {
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      tags: data.tags || [],
      highlights: [],
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nickname: string;
      tags: string[];
      highlights: string[];
      aiSummary: string;
      lastContactAt: string;
    }>
  ): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.firstName) {
      updates.push('first_name = ?');
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(data.lastName || null);
    }
    if (data.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(data.nickname || null);
    }
    if (data.tags) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }
    if (data.highlights !== undefined) {
      updates.push('highlights = ?');
      values.push(JSON.stringify(data.highlights));
    }
    if (data.aiSummary !== undefined) {
      updates.push('ai_summary = ?');
      values.push(data.aiSummary || null);
    }
    if (data.lastContactAt) {
      updates.push('last_contact_at = ?');
      values.push(data.lastContactAt);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await db.runAsync(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
  },
};
