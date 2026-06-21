import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Contact, ContactWithDetails, Gender, SuggestedQuestion, SuggestedQuestionCategory } from '@/types';
import { normalizeName } from '@/utils/normalizeName';
import { hotTopicService } from './hot-topic.service';
import { syncQueueService } from './sync-queue.service';

type ContactSyncRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  birthday_day: number | null;
  birthday_month: number | null;
  birthday_year: number | null;
  ai_summary: string | null;
  suggested_questions: string | null;
  meeting_context: string | null;
  loves: string | null;
  reminder_frequency_days: number | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const contactRowToSyncPayload = (row: ContactSyncRow) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  nickname: row.nickname,
  avatarUrl: row.avatar_url,
  gender: row.gender ?? 'unknown',
  phone: row.phone,
  email: row.email,
  birthdayDay: row.birthday_day,
  birthdayMonth: row.birthday_month,
  birthdayYear: row.birthday_year,
  aiSummary: row.ai_summary,
  suggestedQuestions: parseSuggestedQuestions(row.suggested_questions) ?? null,
  meetingContext: row.meeting_context,
  reminderFrequencyDays: row.reminder_frequency_days,
  lastContactAt: row.last_contact_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const LEGACY_CATEGORY_BY_INDEX: SuggestedQuestionCategory[] = ['ask', 'followUp', 'remember'];
const VALID_CATEGORIES: SuggestedQuestionCategory[] = ['ask', 'followUp', 'remember'];

const parseSuggestedQuestions = (value: string | null | undefined): SuggestedQuestion[] | undefined => {
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;

    const items: SuggestedQuestion[] = [];
    for (let index = 0; index < parsed.length && items.length < 3; index += 1) {
      const entry = parsed[index];
      if (typeof entry === 'string') {
        const text = entry.trim();
        if (!text) continue;
        items.push({ category: LEGACY_CATEGORY_BY_INDEX[index] ?? null, text });
        continue;
      }
      if (entry && typeof entry === 'object' && 'text' in entry) {
        const candidate = entry as { category?: unknown; text?: unknown };
        const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
        if (!text) continue;
        const category = VALID_CATEGORIES.includes(candidate.category as SuggestedQuestionCategory)
          ? (candidate.category as SuggestedQuestionCategory)
          : null;
        items.push({ category, text });
      }
    }
    return items.length > 0 ? items : undefined;
  } catch {
    return undefined;
  }
};

const parseStringArray = (value: string | null | undefined): string[] | undefined => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    const items = parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return items.length > 0 ? items : undefined;
  } catch {
    return undefined;
  }
};

const enqueueContact = async (id: string, operation: 'upsert' | 'delete'): Promise<void> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ContactSyncRow>('SELECT * FROM contacts WHERE id = ?', [id]);
  if (!row) return;

  await syncQueueService.enqueueMutation({
    entityType: 'contact',
    entityId: id,
    operation,
    payload: contactRowToSyncPayload(row),
  });
};

export const contactService = {
  getAll: async (): Promise<Contact[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      photo_uri: string | null;
      avatar_url: string | null;
      gender: string | null;
      phone: string | null;
      email: string | null;
      birthday_day: number | null;
      birthday_month: number | null;
      birthday_year: number | null;
      ai_summary: string | null;
      meeting_context: string | null;
      loves: string | null;
      reminder_frequency_days: number | null;
      last_contact_at: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM contacts WHERE deleted_at IS NULL ORDER BY last_contact_at DESC');

    return result.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      nickname: row.nickname || undefined,
      avatarUrl: row.avatar_url || undefined,
      gender: (row.gender as Gender) || 'unknown',
      phone: row.phone || undefined,
      email: row.email || undefined,
      birthdayDay: row.birthday_day || undefined,
      birthdayMonth: row.birthday_month || undefined,
      birthdayYear: row.birthday_year || undefined,
      aiSummary: row.ai_summary || undefined,
      meetingContext: row.meeting_context || undefined,
      loves: parseStringArray(row.loves),
      reminderFrequencyDays: row.reminder_frequency_days ?? undefined,
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
      avatar_url: string | null;
      gender: string | null;
      phone: string | null;
      email: string | null;
      birthday_day: number | null;
      birthday_month: number | null;
      birthday_year: number | null;
      ai_summary: string | null;
      suggested_questions: string | null;
      meeting_context: string | null;
      loves: string | null;
      reminder_frequency_days: number | null;
      last_contact_at: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM contacts WHERE id = ? AND deleted_at IS NULL', [id]);

    if (!contactRow) return null;

    // V2: Only load notes and hot_topics (facts/memories tables removed)
    const notesRows = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string | null;
      audio_uri: string | null;
      audio_duration_ms: number | null;
      transcription: string | null;
      created_at: string;
      updated_at: string | null;
    }>('SELECT * FROM notes WHERE contact_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [id]);

    const hotTopicsRows = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string;
      context: string | null;
      resolution: string | null;
      status: string;
      source_note_id: string | null;
      event_date: string | null;
      birthday_contact_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>(
      'SELECT * FROM hot_topics WHERE contact_id = ? AND deleted_at IS NULL ORDER BY event_date IS NULL ASC, event_date DESC, updated_at DESC',
      [id]
    );

    const contact: ContactWithDetails = {
      id: contactRow.id,
      firstName: contactRow.first_name,
      lastName: contactRow.last_name || undefined,
      nickname: contactRow.nickname || undefined,
      avatarUrl: contactRow.avatar_url || undefined,
      gender: (contactRow.gender as Gender) || 'unknown',
      phone: contactRow.phone || undefined,
      email: contactRow.email || undefined,
      birthdayDay: contactRow.birthday_day || undefined,
      birthdayMonth: contactRow.birthday_month || undefined,
      birthdayYear: contactRow.birthday_year || undefined,
      aiSummary: contactRow.ai_summary || undefined,
      suggestedQuestions: parseSuggestedQuestions(contactRow.suggested_questions),
      meetingContext: contactRow.meeting_context || undefined,
      loves: parseStringArray(contactRow.loves),
      reminderFrequencyDays: contactRow.reminder_frequency_days ?? undefined,
      lastContactAt: contactRow.last_contact_at || undefined,
      createdAt: contactRow.created_at,
      updatedAt: contactRow.updated_at,
      // V2: facts and memories removed
      facts: [],
      memories: [],
      notes: notesRows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        title: row.title || undefined,
        audioUri: row.audio_uri || undefined,
        audioDurationMs: row.audio_duration_ms || undefined,
        transcription: row.transcription || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
      })),
      hotTopics: hotTopicsRows.map((row) => ({
        id: row.id,
        contactId: row.contact_id,
        title: row.title,
        context: row.context || undefined,
        resolution: row.resolution || undefined,
        status: row.status as 'active' | 'resolved',
        sourceNoteId: row.source_note_id || undefined,
        eventDate: row.event_date || undefined,
        birthdayContactId: row.birthday_contact_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at || undefined,
      })),
    };

    return contact;
  },

  findByName: async (firstName: string, lastName?: string): Promise<Contact | null> => {
    const db = await getDatabase();
    const normalizedFirstName = normalizeName(firstName);
    if (!normalizedFirstName) return null;
    const normalizedLastName = normalizeName(lastName);

    const rows = await db.getAllAsync<{
      id: string;
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      gender: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, first_name, last_name, nickname, gender, created_at, updated_at
       FROM contacts WHERE deleted_at IS NULL`
    );

    const match = rows.find((candidate) => {
      const candidateFirstName = normalizeName(candidate.first_name);
      const candidateLastName = normalizeName(candidate.last_name);
      const candidateNickname = normalizeName(candidate.nickname);

      if (normalizedLastName) {
        return candidateFirstName === normalizedFirstName && candidateLastName === normalizedLastName;
      }

      const firstNameMatches = candidateFirstName === normalizedFirstName && candidateLastName === '';
      const nicknameMatches = candidateNickname !== '' && candidateNickname === normalizedFirstName;
      return firstNameMatches || nicknameMatches;
    });

    if (!match) return null;

    return {
      id: match.id,
      firstName: match.first_name,
      lastName: match.last_name || undefined,
      nickname: match.nickname || undefined,
      gender: (match.gender as Gender) || 'unknown',
      createdAt: match.created_at,
      updatedAt: match.updated_at,
    };
  },

  create: async (data: {
    firstName: string;
    lastName?: string;
    nickname?: string;
    gender?: Gender;
  }): Promise<Contact> => {
    const db = await getDatabase();

    // Check for existing contact with same name to prevent duplicates
    const existingContact = await contactService.findByName(data.firstName, data.lastName);
    if (existingContact) {
      return existingContact;
    }

    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO contacts (id, first_name, last_name, nickname, gender, relationship_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.firstName,
        data.lastName || null,
        data.nickname || null,
        data.gender || 'unknown',
        'connaissance',
        now,
        now,
      ]
    );

    await enqueueContact(id, 'upsert');

    return {
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      gender: data.gender || 'unknown',
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
      avatarUrl: string;
      gender: Gender;
      phone: string;
      email: string;
      birthdayDay: number | null;
      birthdayMonth: number | null;
      birthdayYear: number | null;
      aiSummary: string;
      suggestedQuestions: SuggestedQuestion[];
      meetingContext: string | null;
      loves: string[];
      reminderFrequencyDays: number | null;
      lastContactAt: string;
    }>
  ): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

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
    if (data.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(data.avatarUrl || null);
    }
    if (data.gender !== undefined) {
      updates.push('gender = ?');
      values.push(data.gender || 'unknown');
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone || null);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email || null);
    }
    if (data.birthdayDay !== undefined) {
      updates.push('birthday_day = ?');
      values.push(data.birthdayDay || null);
    }
    if (data.birthdayMonth !== undefined) {
      updates.push('birthday_month = ?');
      values.push(data.birthdayMonth || null);
    }
    if (data.birthdayYear !== undefined) {
      updates.push('birthday_year = ?');
      values.push(data.birthdayYear || null);
    }
    if (data.aiSummary !== undefined) {
      updates.push('ai_summary = ?');
      values.push(data.aiSummary || null);
    }
    if (data.suggestedQuestions !== undefined) {
      updates.push('suggested_questions = ?');
      values.push(data.suggestedQuestions ? JSON.stringify(data.suggestedQuestions) : null);
    }
    if (data.meetingContext !== undefined) {
      updates.push('meeting_context = ?');
      values.push(data.meetingContext || null);
    }
    if (data.loves !== undefined) {
      updates.push('loves = ?');
      values.push(data.loves.length > 0 ? JSON.stringify(data.loves) : '[]');
    }
    if (data.reminderFrequencyDays !== undefined) {
      updates.push('reminder_frequency_days = ?');
      values.push(data.reminderFrequencyDays);
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

    await enqueueContact(id, 'upsert');

    if (data.birthdayDay !== undefined || data.birthdayMonth !== undefined) {
      const contactRow = await db.getFirstAsync<{
        first_name: string;
        birthday_day: number | null;
        birthday_month: number | null;
      }>('SELECT first_name, birthday_day, birthday_month FROM contacts WHERE id = ?', [id]);

      if (contactRow && contactRow.birthday_day && contactRow.birthday_month) {
        await hotTopicService.syncBirthdayHotTopics(
          id,
          contactRow.first_name,
          contactRow.birthday_day,
          contactRow.birthday_month
        );
      } else if (contactRow && !contactRow.birthday_day) {
        await hotTopicService.deleteByBirthdayContact(id);
      }
    }
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE contacts SET deleted_at = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
    await enqueueContact(id, 'delete');
  },
};
