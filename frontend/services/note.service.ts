import { nanoid } from 'nanoid';
import { getDatabase } from '@/lib/db';
import { Note } from '@/types';

export const noteService = {
  getByContact: async (contactId: string): Promise<Note[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      audio_uri: string | null;
      audio_duration_ms: number | null;
      transcription: string | null;
      summary: string | null;
      created_at: string;
    }>('SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC', [contactId]);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      audioUri: row.audio_uri || undefined,
      audioDurationMs: row.audio_duration_ms || undefined,
      transcription: row.transcription || undefined,
      summary: row.summary || undefined,
      createdAt: row.created_at,
    }));
  },

  create: async (data: {
    contactId: string;
    audioUri?: string;
    audioDurationMs?: number;
    transcription?: string;
    summary?: string;
  }): Promise<Note> => {
    const db = await getDatabase();
    const id = nanoid();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO notes (id, contact_id, audio_uri, audio_duration_ms, transcription, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.audioUri || null,
        data.audioDurationMs || null,
        data.transcription || null,
        data.summary || null,
        now,
      ]
    );

    return {
      id,
      contactId: data.contactId,
      audioUri: data.audioUri,
      audioDurationMs: data.audioDurationMs,
      transcription: data.transcription,
      summary: data.summary,
      createdAt: now,
    };
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  },
};
