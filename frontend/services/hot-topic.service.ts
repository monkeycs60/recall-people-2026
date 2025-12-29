import * as Crypto from 'expo-crypto';
import { startOfDay, addDays, isBefore } from 'date-fns';
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
      resolution: string | null;
      status: string;
      source_note_id: string | null;
      event_date: string | null;
      notified_at: string | null;
      birthday_contact_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>(query, params);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title,
      context: row.context || undefined,
      resolution: row.resolution || undefined,
      status: row.status as HotTopicStatus,
      sourceNoteId: row.source_note_id || undefined,
      eventDate: row.event_date || undefined,
      notifiedAt: row.notified_at || undefined,
      birthdayContactId: row.birthday_contact_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
    }));
  },

  create: async (data: {
    contactId: string;
    title: string;
    context?: string;
    eventDate?: string;
    birthdayContactId?: string;
    sourceNoteId?: string;
  }): Promise<HotTopic> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO hot_topics (id, contact_id, title, context, status, event_date, birthday_contact_id, source_note_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.contactId,
        data.title,
        data.context || null,
        'active',
        data.eventDate || null,
        data.birthdayContactId || null,
        data.sourceNoteId || null,
        now,
        now,
      ]
    );

    return {
      id,
      contactId: data.contactId,
      title: data.title,
      context: data.context,
      status: 'active',
      eventDate: data.eventDate,
      birthdayContactId: data.birthdayContactId,
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: string, data: Partial<{
    title: string;
    context: string;
    eventDate: string | null;
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
    if (data.eventDate !== undefined) {
      updates.push('event_date = ?');
      values.push(data.eventDate);
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(`UPDATE hot_topics SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  resolve: async (id: string, resolution?: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET status = ?, resolution = ?, resolved_at = ?, updated_at = ? WHERE id = ?',
      ['resolved', resolution || null, now, now, id]
    );
  },

  reopen: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET status = ?, resolution = NULL, resolved_at = NULL, updated_at = ? WHERE id = ?',
      ['active', now, id]
    );
  },

  updateResolution: async (id: string, resolution: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET resolution = ?, updated_at = ? WHERE id = ?',
      [resolution, now, id]
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hot_topics WHERE id = ?', [id]);
  },

  getUpcoming: async (daysAhead: number = 30): Promise<HotTopic[]> => {
    const db = await getDatabase();
    const today = startOfDay(new Date()).toISOString();
    const endDate = addDays(startOfDay(new Date()), daysAhead).toISOString();

    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string;
      context: string | null;
      resolution: string | null;
      status: string;
      source_note_id: string | null;
      event_date: string | null;
      notified_at: string | null;
      birthday_contact_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>(
      `SELECT * FROM hot_topics
       WHERE event_date IS NOT NULL
       AND event_date >= ? AND event_date <= ?
       AND status = 'active'
       ORDER BY event_date ASC`,
      [today, endDate]
    );

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title,
      context: row.context || undefined,
      resolution: row.resolution || undefined,
      status: row.status as HotTopicStatus,
      sourceNoteId: row.source_note_id || undefined,
      eventDate: row.event_date || undefined,
      notifiedAt: row.notified_at || undefined,
      birthdayContactId: row.birthday_contact_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
    }));
  },

  getPendingNotifications: async (): Promise<HotTopic[]> => {
    const db = await getDatabase();
    const tomorrow = addDays(startOfDay(new Date()), 1).toISOString();
    const dayAfterTomorrow = addDays(startOfDay(new Date()), 2).toISOString();

    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string;
      context: string | null;
      resolution: string | null;
      status: string;
      source_note_id: string | null;
      event_date: string | null;
      notified_at: string | null;
      birthday_contact_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>(
      `SELECT * FROM hot_topics
       WHERE event_date >= ? AND event_date < ?
       AND notified_at IS NULL
       AND status = 'active'
       ORDER BY event_date ASC`,
      [tomorrow, dayAfterTomorrow]
    );

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title,
      context: row.context || undefined,
      resolution: row.resolution || undefined,
      status: row.status as HotTopicStatus,
      sourceNoteId: row.source_note_id || undefined,
      eventDate: row.event_date || undefined,
      notifiedAt: row.notified_at || undefined,
      birthdayContactId: row.birthday_contact_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
    }));
  },

  markNotified: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE hot_topics SET notified_at = ? WHERE id = ?', [now, id]);
  },

  deleteByBirthdayContact: async (contactId: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hot_topics WHERE birthday_contact_id = ?', [contactId]);
  },

  syncBirthdayHotTopics: async (
    contactId: string,
    contactFirstName: string,
    birthdayDay: number,
    birthdayMonth: number
  ): Promise<void> => {
    const db = await getDatabase();

    // Delete existing birthday hot topics for this contact
    await db.runAsync('DELETE FROM hot_topics WHERE birthday_contact_id = ?', [contactId]);

    // Calculate the next 5 birthday occurrences
    const today = new Date();
    const dates: Date[] = [];

    for (let year = today.getFullYear(); dates.length < 5; year++) {
      const birthday = new Date(year, birthdayMonth - 1, birthdayDay);
      if (birthday > today) {
        dates.push(birthday);
      }
    }

    // Create 5 hot topics for upcoming birthdays
    const now = new Date().toISOString();
    for (const date of dates) {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO hot_topics (id, contact_id, title, context, status, event_date, birthday_contact_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          contactId,
          `Anniversaire de ${contactFirstName}`,
          null,
          'active',
          date.toISOString(),
          contactId,
          now,
          now,
        ]
      );
    }
  },

  cleanupPastBirthdays: async (): Promise<void> => {
    const db = await getDatabase();
    const today = startOfDay(new Date()).toISOString();
    await db.runAsync(
      'DELETE FROM hot_topics WHERE birthday_contact_id IS NOT NULL AND event_date < ?',
      [today]
    );
  },

  parseExtractedDate: (dateStr: string): string | null => {
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const dayNum = parseInt(match[1]);
    const monthNum = parseInt(match[2]);
    const yearNum = parseInt(match[3]);

    if (dayNum < 1 || dayNum > 31) return null;
    if (monthNum < 1 || monthNum > 12) return null;

    const date = new Date(yearNum, monthNum - 1, dayNum);

    if (isNaN(date.getTime())) return null;
    if (date.getDate() !== dayNum) return null;
    if (isBefore(date, startOfDay(new Date()))) return null;

    return date.toISOString();
  },
};
