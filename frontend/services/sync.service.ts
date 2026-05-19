import {
  getActiveDatabaseUserId,
  getDatabase,
  getLegacyDatabaseClaimUserId,
  importLegacyDatabaseForActiveAccount,
  initDatabase,
  isLegacyDatabaseNonEmpty,
  isLocalDatabaseEmpty,
  markLegacyDatabaseClaimed,
} from '@/lib/db';
import { toNullableSyncIsoDate, toSyncIsoDate } from '@/lib/sync-date';
import { syncApi } from '@/lib/sync-api';
import type { SyncChange, SyncMutation } from '@/lib/sync-types';
import { syncQueueService } from './sync-queue.service';

let syncPromise: Promise<string> | null = null;
let syncPromiseUserId: string | null = null;

type SyncBindValue = string | number | null;
const SYNC_BATCH_SIZE = 500;
const nullable = (value: unknown): unknown => value === undefined ? null : value;

const chunkMutations = (mutations: SyncMutation[], size = SYNC_BATCH_SIZE): SyncMutation[][] => {
  const chunks: SyncMutation[][] = [];
  for (let index = 0; index < mutations.length; index += size) {
    chunks.push(mutations.slice(index, index + size));
  }
  return chunks;
};

const snakeContactToPayload = (row: Record<string, unknown>): Record<string, unknown> => ({
  id: row.id,
  firstName: row.first_name,
  lastName: nullable(row.last_name),
  nickname: nullable(row.nickname),
  avatarUrl: nullable(row.avatar_url),
  gender: row.gender ?? 'unknown',
  phone: nullable(row.phone),
  email: nullable(row.email),
  birthdayDay: nullable(row.birthday_day),
  birthdayMonth: nullable(row.birthday_month),
  birthdayYear: nullable(row.birthday_year),
  aiSummary: nullable(row.ai_summary),
  suggestedQuestions: typeof row.suggested_questions === 'string' && row.suggested_questions
    ? JSON.parse(row.suggested_questions)
    : null,
  meetingContext: nullable(row.meeting_context),
  reminderFrequencyDays: nullable(row.reminder_frequency_days),
  lastContactAt: toNullableSyncIsoDate(row.last_contact_at),
  createdAt: toSyncIsoDate(row.created_at),
  updatedAt: toSyncIsoDate(row.updated_at),
  deletedAt: toNullableSyncIsoDate(row.deleted_at),
});

const snakeNoteToPayload = (row: Record<string, unknown>): Record<string, unknown> => ({
  id: row.id,
  contactId: row.contact_id,
  title: nullable(row.title),
  transcription: nullable(row.transcription),
  audioDurationMs: nullable(row.audio_duration_ms),
  createdAt: toSyncIsoDate(row.created_at),
  updatedAt: toSyncIsoDate(row.updated_at),
  deletedAt: toNullableSyncIsoDate(row.deleted_at),
});

const snakeGroupToPayload = (row: Record<string, unknown>): Record<string, unknown> => ({
  id: row.id,
  name: row.name,
  createdAt: toSyncIsoDate(row.created_at),
  updatedAt: toSyncIsoDate(row.updated_at),
  deletedAt: toNullableSyncIsoDate(row.deleted_at),
});

const snakeContactGroupToPayload = (row: Record<string, unknown>): Record<string, unknown> => ({
  contactId: row.contact_id,
  groupId: row.group_id,
  createdAt: toSyncIsoDate(row.created_at),
  updatedAt: toSyncIsoDate(row.updated_at ?? row.created_at),
  deletedAt: toNullableSyncIsoDate(row.deleted_at),
});

const snakeHotTopicToPayload = (row: Record<string, unknown>): Record<string, unknown> => ({
  id: row.id,
  contactId: row.contact_id,
  title: row.title,
  context: nullable(row.context),
  resolution: nullable(row.resolution),
  status: row.status ?? 'active',
  sourceNoteId: nullable(row.source_note_id),
  eventDate: toNullableSyncIsoDate(row.event_date),
  birthdayContactId: nullable(row.birthday_contact_id),
  notifiedAt: toNullableSyncIsoDate(row.notified_at),
  resolvedAt: toNullableSyncIsoDate(row.resolved_at),
  createdAt: toSyncIsoDate(row.created_at),
  updatedAt: toSyncIsoDate(row.updated_at),
  deletedAt: toNullableSyncIsoDate(row.deleted_at),
});

async function getSyncState(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_state WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

async function setSyncState(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
}

async function resetLocalSyncState(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM sync_queue;
    DELETE FROM sync_state;
  `);
}

async function maybeImportLegacyLocalData(hasServerData: boolean): Promise<boolean> {
  if (hasServerData) return false;

  const userId = getActiveDatabaseUserId();
  if (!userId) return false;
  if (!(await isLocalDatabaseEmpty())) return false;
  if (!(await isLegacyDatabaseNonEmpty())) return false;

  const claimedBy = await getLegacyDatabaseClaimUserId();
  if (claimedBy && claimedBy !== userId) return false;

  await importLegacyDatabaseForActiveAccount();
  await initDatabase();
  await resetLocalSyncState();
  await markLegacyDatabaseClaimed(userId);
  return true;
}

async function exportLocalAsInitialMutations(): Promise<SyncMutation[]> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const contacts = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM contacts WHERE deleted_at IS NULL'
  );
  const notes = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM notes WHERE deleted_at IS NULL'
  );
  const groups = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM groups WHERE deleted_at IS NULL'
  );
  const contactGroups = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM contact_groups WHERE deleted_at IS NULL'
  );
  const hotTopics = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM hot_topics WHERE deleted_at IS NULL'
  );

  return [
    ...contacts.map((row) => ({
      id: `init-contact-${row.id}`,
      entityType: 'contact' as const,
      entityId: String(row.id),
      operation: 'upsert' as const,
      payload: snakeContactToPayload(row),
      createdAt: now,
    })),
    ...notes.map((row) => ({
      id: `init-note-${row.id}`,
      entityType: 'note' as const,
      entityId: String(row.id),
      operation: 'upsert' as const,
      payload: snakeNoteToPayload(row),
      createdAt: now,
    })),
    ...groups.map((row) => ({
      id: `init-group-${row.id}`,
      entityType: 'group' as const,
      entityId: String(row.id),
      operation: 'upsert' as const,
      payload: snakeGroupToPayload(row),
      createdAt: now,
    })),
    ...contactGroups.map((row) => ({
      id: `init-contact-group-${row.contact_id}-${row.group_id}`,
      entityType: 'contact_group' as const,
      entityId: `${row.contact_id}:${row.group_id}`,
      operation: 'upsert' as const,
      payload: snakeContactGroupToPayload(row),
      createdAt: now,
    })),
    ...hotTopics.map((row) => ({
      id: `init-hot-topic-${row.id}`,
      entityType: 'hot_topic' as const,
      entityId: String(row.id),
      operation: 'upsert' as const,
      payload: snakeHotTopicToPayload(row),
      createdAt: now,
    })),
  ];
}

async function upsertContact(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO contacts (
      id, first_name, last_name, nickname, avatar_url, gender, phone, email,
      birthday_day, birthday_month, birthday_year, ai_summary, suggested_questions,
      meeting_context, reminder_frequency_days, last_contact_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      nickname = excluded.nickname,
      avatar_url = excluded.avatar_url,
      gender = excluded.gender,
      phone = excluded.phone,
      email = excluded.email,
      birthday_day = excluded.birthday_day,
      birthday_month = excluded.birthday_month,
      birthday_year = excluded.birthday_year,
      ai_summary = excluded.ai_summary,
      suggested_questions = excluded.suggested_questions,
      meeting_context = excluded.meeting_context,
      reminder_frequency_days = excluded.reminder_frequency_days,
      last_contact_at = excluded.last_contact_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at`,
    [
      payload.id,
      payload.firstName,
      payload.lastName ?? null,
      payload.nickname ?? null,
      payload.avatarUrl ?? null,
      payload.gender ?? 'unknown',
      payload.phone ?? null,
      payload.email ?? null,
      payload.birthdayDay ?? null,
      payload.birthdayMonth ?? null,
      payload.birthdayYear ?? null,
      payload.aiSummary ?? null,
      payload.suggestedQuestions ? JSON.stringify(payload.suggestedQuestions) : null,
      payload.meetingContext ?? null,
      payload.reminderFrequencyDays ?? null,
      payload.lastContactAt ?? null,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ] as SyncBindValue[]
  );
}

async function upsertNote(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO notes (id, contact_id, title, audio_duration_ms, transcription, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       contact_id = excluded.contact_id,
       title = excluded.title,
       audio_duration_ms = excluded.audio_duration_ms,
       transcription = excluded.transcription,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [
      payload.id,
      payload.contactId,
      payload.title ?? null,
      payload.audioDurationMs ?? null,
      payload.transcription ?? null,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ] as SyncBindValue[]
  );
}

async function upsertGroup(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO groups (id, name, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [payload.id, payload.name, payload.createdAt, payload.updatedAt, payload.deletedAt ?? null] as SyncBindValue[]
  );
}

async function upsertContactGroup(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO contact_groups (contact_id, group_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(contact_id, group_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [
      payload.contactId,
      payload.groupId,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ] as SyncBindValue[]
  );
}

async function upsertHotTopic(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO hot_topics (
      id, contact_id, title, context, resolution, status, source_note_id,
      event_date, birthday_contact_id, notified_at, resolved_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      contact_id = excluded.contact_id,
      title = excluded.title,
      context = excluded.context,
      resolution = excluded.resolution,
      status = excluded.status,
      source_note_id = excluded.source_note_id,
      event_date = excluded.event_date,
      birthday_contact_id = excluded.birthday_contact_id,
      notified_at = excluded.notified_at,
      resolved_at = excluded.resolved_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at`,
    [
      payload.id,
      payload.contactId,
      payload.title,
      payload.context ?? null,
      payload.resolution ?? null,
      payload.status ?? 'active',
      payload.sourceNoteId ?? null,
      payload.eventDate ?? null,
      payload.birthdayContactId ?? null,
      payload.notifiedAt ?? null,
      payload.resolvedAt ?? null,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ] as SyncBindValue[]
  );
}

async function applyDelete(change: SyncChange): Promise<void> {
  const db = await getDatabase();
  const deletedAt = String(change.payload.deletedAt ?? new Date().toISOString());
  const updatedAt = String(change.payload.updatedAt ?? deletedAt);

  if (change.entityType === 'contact_group') {
    await db.runAsync(
      'UPDATE contact_groups SET deleted_at = ?, updated_at = ? WHERE contact_id = ? AND group_id = ?',
      [deletedAt, updatedAt, change.payload.contactId ?? '', change.payload.groupId ?? ''] as SyncBindValue[]
    );
    return;
  }

  const tableByType = {
    contact: 'contacts',
    note: 'notes',
    group: 'groups',
    hot_topic: 'hot_topics',
  } as const;
  const table = tableByType[change.entityType as keyof typeof tableByType];
  if (!table) return;

  await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
    deletedAt,
    updatedAt,
    change.entityId,
  ] as SyncBindValue[]);
}

async function applyChange(change: SyncChange): Promise<void> {
  if (change.operation === 'delete') {
    await applyDelete(change);
    return;
  }

  if (change.entityType === 'contact') await upsertContact(change.payload);
  if (change.entityType === 'note') await upsertNote(change.payload);
  if (change.entityType === 'group') await upsertGroup(change.payload);
  if (change.entityType === 'contact_group') await upsertContactGroup(change.payload);
  if (change.entityType === 'hot_topic') await upsertHotTopic(change.payload);
}

export const syncService = {
  bootstrapAndSync: async (): Promise<string> => {
    const currentUserId = getActiveDatabaseUserId();
    if (syncPromise && syncPromiseUserId === currentUserId) return syncPromise;

    syncPromise = (async () => {
      const bootstrap = await syncApi.bootstrap();
      await maybeImportLegacyLocalData(bootstrap.hasServerData);
      const localEmpty = await isLocalDatabaseEmpty();

      if (
        !bootstrap.hasServerData &&
        !localEmpty &&
        (await getSyncState('initialized')) !== 'true'
      ) {
        const initialMutations = await exportLocalAsInitialMutations();
        const [firstBatch, ...remainingBatches] = chunkMutations(initialMutations);
        if (firstBatch) {
          const response = await syncApi.initialize(firstBatch);
          await setSyncState('cursor', response.cursor);
        }
        for (const batch of remainingBatches) {
          const response = await syncApi.push(batch);
          await setSyncState('cursor', response.cursor);
        }
        await setSyncState('initialized', 'true');
      }

      let pending = await syncQueueService.getPendingMutations();
      while (pending.length > 0) {
        const response = await syncApi.push(pending);
        await syncQueueService.deleteAppliedMutations(response.appliedMutationIds);
        await setSyncState('cursor', response.cursor);
        if (pending.length < SYNC_BATCH_SIZE) break;
        pending = await syncQueueService.getPendingMutations();
      }

      let cursor = (await getSyncState('cursor')) ?? '0';
      let hasMoreChanges = true;
      while (hasMoreChanges) {
        const changes = await syncApi.changes(cursor);
        for (const change of changes.changes) {
          await applyChange(change);
        }
        await setSyncState('cursor', changes.cursor);
        hasMoreChanges = changes.hasMore === true && changes.cursor !== cursor;
        cursor = changes.cursor;
      }

      const now = new Date().toISOString();
      await setSyncState('lastSyncedAt', now);
      return now;
    })();
    syncPromiseUserId = currentUserId;

    try {
      return await syncPromise;
    } finally {
      syncPromise = null;
      syncPromiseUserId = null;
    }
  },
};
