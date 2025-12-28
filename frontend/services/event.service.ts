import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Event } from '@/types';
import { parseISO, startOfDay, addDays, isBefore } from 'date-fns';

type EventRow = {
  id: string;
  contact_id: string;
  title: string;
  event_date: string;
  source_note_id: string | null;
  notified_at: string | null;
  created_at: string;
};

const mapRowToEvent = (row: EventRow): Event => ({
  id: row.id,
  contactId: row.contact_id,
  title: row.title,
  eventDate: row.event_date,
  sourceNoteId: row.source_note_id || undefined,
  notifiedAt: row.notified_at || undefined,
  createdAt: row.created_at,
});

export const eventService = {
  getByContact: async (contactId: string): Promise<Event[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<EventRow>(
      'SELECT * FROM events WHERE contact_id = ? ORDER BY event_date ASC',
      [contactId]
    );
    return result.map(mapRowToEvent);
  },

  getUpcoming: async (daysAhead: number = 30): Promise<Event[]> => {
    const db = await getDatabase();
    const today = startOfDay(new Date()).toISOString();
    const endDate = addDays(startOfDay(new Date()), daysAhead).toISOString();

    const result = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE event_date >= ? AND event_date <= ?
       ORDER BY event_date ASC`,
      [today, endDate]
    );
    return result.map(mapRowToEvent);
  },

  getPast: async (daysBack: number = 30): Promise<Event[]> => {
    const db = await getDatabase();
    const today = startOfDay(new Date()).toISOString();
    const startDate = addDays(startOfDay(new Date()), -daysBack).toISOString();

    const result = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE event_date >= ? AND event_date < ?
       ORDER BY event_date DESC`,
      [startDate, today]
    );
    return result.map(mapRowToEvent);
  },

  getPendingNotifications: async (): Promise<Event[]> => {
    const db = await getDatabase();
    const tomorrow = addDays(startOfDay(new Date()), 1).toISOString();
    const dayAfterTomorrow = addDays(startOfDay(new Date()), 2).toISOString();

    const result = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE event_date >= ? AND event_date < ? AND notified_at IS NULL
       ORDER BY event_date ASC`,
      [tomorrow, dayAfterTomorrow]
    );
    return result.map(mapRowToEvent);
  },

  create: async (data: {
    contactId: string;
    title: string;
    eventDate: string;
    sourceNoteId?: string;
  }): Promise<Event> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO events (id, contact_id, title, event_date, source_note_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.contactId, data.title, data.eventDate, data.sourceNoteId || null, now]
    );

    return {
      id,
      contactId: data.contactId,
      title: data.title,
      eventDate: data.eventDate,
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
    };
  },

  update: async (id: string, data: Partial<{
    title: string;
    eventDate: string;
  }>): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.title) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.eventDate) {
      updates.push('event_date = ?');
      values.push(data.eventDate);
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  markNotified: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE events SET notified_at = ? WHERE id = ?', [now, id]);
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
  },

  parseExtractedDate: (dateStr: string): string | null => {
    // Parse DD/MM/YYYY format from LLM
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Validate it's a real date and in the future
    if (isNaN(date.getTime())) return null;
    if (isBefore(date, startOfDay(new Date()))) return null;

    return date.toISOString();
  },
};
