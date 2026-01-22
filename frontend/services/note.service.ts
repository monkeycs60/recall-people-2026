import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Note } from '@/types';

export const noteService = {
  getByContact: async (contactId: string): Promise<Note[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string | null;
      audio_uri: string | null;
      audio_duration_ms: number | null;
      transcription: string | null;
      created_at: string;
      updated_at: string | null;
    }>('SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC', [contactId]);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title || undefined,
      audioUri: row.audio_uri || undefined,
      audioDurationMs: row.audio_duration_ms || undefined,
      transcription: row.transcription || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    }));
  },

  create: async (data: {
    contactId: string;
    title?: string;
    audioUri?: string;
    audioDurationMs?: number;
    transcription?: string;
  }): Promise<Note> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO notes (id, contact_id, title, audio_uri, audio_duration_ms, transcription, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.title || null,
        data.audioUri || null,
        data.audioDurationMs || null,
        data.transcription || null,
        now,
        now,
      ]
    );

    return {
      id,
      contactId: data.contactId,
      title: data.title,
      audioUri: data.audioUri,
      audioDurationMs: data.audioDurationMs,
      transcription: data.transcription || '',
      createdAt: now,
      updatedAt: now,
    };
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  },

  update: async (id: string, data: { transcription?: string; title?: string }): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (data.transcription !== undefined) {
      updates.push('transcription = ?');
      values.push(data.transcription);
    }

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title || null);
    }

    values.push(id);

    await db.runAsync(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  },
};
