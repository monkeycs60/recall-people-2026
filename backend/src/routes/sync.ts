import { Hono } from 'hono';
import { z } from 'zod';
import { getPrisma } from '../lib/db';
import { authMiddleware } from '../middleware/auth';
import {
  decryptJson,
  decryptNullableString,
  decryptString,
  encryptJson,
  encryptNullableString,
  encryptString,
} from '../lib/sync-encryption';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  SYNC_ENCRYPTION_KEY: string;
};

type SyncUser = {
  id: string;
};

type AuthContext = {
  user: SyncUser;
};

const syncEntityTypeSchema = z.enum(['contact', 'note', 'group', 'contact_group', 'hot_topic']);
const syncOperationSchema = z.enum(['upsert', 'delete']);

const contactPayloadSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  gender: z.string().default('unknown'),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  birthdayDay: z.number().int().nullable().optional(),
  birthdayMonth: z.number().int().nullable().optional(),
  birthdayYear: z.number().int().nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  suggestedQuestions: z.union([
    z.array(z.string()),
    z.array(z.object({
      category: z.enum(['ask', 'followUp', 'remember']).nullable(),
      text: z.string(),
    })),
  ]).nullable().optional(),
  meetingContext: z.string().nullable().optional(),
  reminderFrequencyDays: z.number().int().nullable().optional(),
  lastContactAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
}).strict();

const notePayloadSchema = z.object({
  id: z.string().min(1),
  contactId: z.string().min(1),
  title: z.string().nullable().optional(),
  transcription: z.string().nullable().optional(),
  audioDurationMs: z.number().int().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
}).strict();

const groupPayloadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
}).strict();

const contactGroupPayloadSchema = z.object({
  contactId: z.string().min(1),
  groupId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
}).strict();

const hotTopicPayloadSchema = z.object({
  id: z.string().min(1),
  contactId: z.string().min(1),
  title: z.string().min(1),
  context: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  status: z.enum(['active', 'resolved']).default('active'),
  sourceNoteId: z.string().nullable().optional(),
  eventDate: z.string().datetime().nullable().optional(),
  birthdayContactId: z.string().nullable().optional(),
  notifiedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
}).strict();

const syncMutationSchema = z.discriminatedUnion('entityType', [
  z.object({
    id: z.string().min(1),
    entityType: z.literal('contact'),
    entityId: z.string().min(1),
    operation: syncOperationSchema,
    payload: contactPayloadSchema,
    createdAt: z.string().datetime(),
  }).strict(),
  z.object({
    id: z.string().min(1),
    entityType: z.literal('note'),
    entityId: z.string().min(1),
    operation: syncOperationSchema,
    payload: notePayloadSchema,
    createdAt: z.string().datetime(),
  }).strict(),
  z.object({
    id: z.string().min(1),
    entityType: z.literal('group'),
    entityId: z.string().min(1),
    operation: syncOperationSchema,
    payload: groupPayloadSchema,
    createdAt: z.string().datetime(),
  }).strict(),
  z.object({
    id: z.string().min(1),
    entityType: z.literal('contact_group'),
    entityId: z.string().min(1),
    operation: syncOperationSchema,
    payload: contactGroupPayloadSchema,
    createdAt: z.string().datetime(),
  }).strict(),
  z.object({
    id: z.string().min(1),
    entityType: z.literal('hot_topic'),
    entityId: z.string().min(1),
    operation: syncOperationSchema,
    payload: hotTopicPayloadSchema,
    createdAt: z.string().datetime(),
  }).strict(),
]);

const syncBatchSchema = z.object({
  mutations: z.array(syncMutationSchema).min(1).max(500),
}).strict();

type SyncMutation = z.infer<typeof syncMutationSchema>;
type ContactPayload = z.infer<typeof contactPayloadSchema>;
type NotePayload = z.infer<typeof notePayloadSchema>;
type GroupPayload = z.infer<typeof groupPayloadSchema>;
type ContactGroupPayload = z.infer<typeof contactGroupPayloadSchema>;
type HotTopicPayload = z.infer<typeof hotTopicPayloadSchema>;

class SyncRouteError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 409 | 500 = 400
  ) {
    super(message);
  }
}

export const syncRoutes = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

syncRoutes.use('/*', authMiddleware);

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function withoutImmutable<T extends Record<string, unknown>>(data: T): Omit<T, 'id' | 'userId'> {
  const { id, userId, ...mutableData } = data;
  void id;
  void userId;
  return mutableData;
}

function serializeCursor(sequence: bigint | number | string | null | undefined): string {
  return sequence == null ? '0' : sequence.toString();
}

function parseCursor(value: string | undefined): bigint | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  return BigInt(value);
}

async function encryptContactPayload(encryptionKey: string | undefined, userId: string, payload: ContactPayload) {
  return {
    id: payload.id,
    userId,
    encryptedFirstName: await encryptString(encryptionKey, payload.firstName),
    encryptedLastName: await encryptNullableString(encryptionKey, payload.lastName),
    encryptedNickname: await encryptNullableString(encryptionKey, payload.nickname),
    encryptedPhone: await encryptNullableString(encryptionKey, payload.phone),
    encryptedEmail: await encryptNullableString(encryptionKey, payload.email),
    encryptedAiSummary: await encryptNullableString(encryptionKey, payload.aiSummary),
    encryptedSuggestedQuestions: payload.suggestedQuestions == null ? null : await encryptJson(encryptionKey, payload.suggestedQuestions),
    encryptedMeetingContext: await encryptNullableString(encryptionKey, payload.meetingContext),
    avatarUrl: payload.avatarUrl ?? null,
    gender: payload.gender ?? 'unknown',
    birthdayDay: payload.birthdayDay ?? null,
    birthdayMonth: payload.birthdayMonth ?? null,
    birthdayYear: payload.birthdayYear ?? null,
    reminderFrequencyDays: payload.reminderFrequencyDays ?? null,
    lastContactAt: toDate(payload.lastContactAt),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

async function encryptNotePayload(encryptionKey: string | undefined, userId: string, payload: NotePayload) {
  return {
    id: payload.id,
    userId,
    contactId: payload.contactId,
    encryptedTitle: await encryptNullableString(encryptionKey, payload.title),
    encryptedTranscription: await encryptNullableString(encryptionKey, payload.transcription),
    audioDurationMs: payload.audioDurationMs ?? null,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

async function encryptGroupPayload(encryptionKey: string | undefined, userId: string, payload: GroupPayload) {
  return {
    id: payload.id,
    userId,
    encryptedName: await encryptString(encryptionKey, payload.name),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function mapContactGroupPayload(userId: string, entityId: string, payload: ContactGroupPayload) {
  return {
    id: entityId,
    userId,
    contactId: payload.contactId,
    groupId: payload.groupId,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

async function encryptHotTopicPayload(encryptionKey: string | undefined, userId: string, payload: HotTopicPayload) {
  return {
    id: payload.id,
    userId,
    contactId: payload.contactId,
    encryptedTitle: await encryptString(encryptionKey, payload.title),
    encryptedContext: await encryptNullableString(encryptionKey, payload.context),
    encryptedResolution: await encryptNullableString(encryptionKey, payload.resolution),
    status: payload.status ?? 'active',
    sourceNoteId: payload.sourceNoteId ?? null,
    eventDate: toDate(payload.eventDate),
    birthdayContactId: payload.birthdayContactId ?? null,
    notifiedAt: toDate(payload.notifiedAt),
    resolvedAt: toDate(payload.resolvedAt),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

async function decryptContact(encryptionKey: string | undefined, row: any) {
  return {
    id: row.id,
    firstName: await decryptString(encryptionKey, row.encryptedFirstName),
    lastName: await decryptNullableString(encryptionKey, row.encryptedLastName),
    nickname: await decryptNullableString(encryptionKey, row.encryptedNickname),
    avatarUrl: row.avatarUrl,
    gender: row.gender,
    phone: await decryptNullableString(encryptionKey, row.encryptedPhone),
    email: await decryptNullableString(encryptionKey, row.encryptedEmail),
    birthdayDay: row.birthdayDay,
    birthdayMonth: row.birthdayMonth,
    birthdayYear: row.birthdayYear,
    aiSummary: await decryptNullableString(encryptionKey, row.encryptedAiSummary),
    suggestedQuestions: row.encryptedSuggestedQuestions ? await decryptJson<unknown>(encryptionKey, row.encryptedSuggestedQuestions) : null,
    meetingContext: await decryptNullableString(encryptionKey, row.encryptedMeetingContext),
    reminderFrequencyDays: row.reminderFrequencyDays,
    lastContactAt: serializeDate(row.lastContactAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: serializeDate(row.deletedAt),
  };
}

async function decryptNote(encryptionKey: string | undefined, row: any) {
  return {
    id: row.id,
    contactId: row.contactId,
    title: await decryptNullableString(encryptionKey, row.encryptedTitle),
    transcription: await decryptNullableString(encryptionKey, row.encryptedTranscription),
    audioDurationMs: row.audioDurationMs,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: serializeDate(row.deletedAt),
  };
}

async function decryptGroup(encryptionKey: string | undefined, row: any) {
  return {
    id: row.id,
    name: await decryptString(encryptionKey, row.encryptedName),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: serializeDate(row.deletedAt),
  };
}

function serializeContactGroup(row: any) {
  return {
    contactId: row.contactId,
    groupId: row.groupId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: serializeDate(row.deletedAt),
  };
}

async function decryptHotTopic(encryptionKey: string | undefined, row: any) {
  return {
    id: row.id,
    contactId: row.contactId,
    title: await decryptString(encryptionKey, row.encryptedTitle),
    context: await decryptNullableString(encryptionKey, row.encryptedContext),
    resolution: await decryptNullableString(encryptionKey, row.encryptedResolution),
    status: row.status,
    sourceNoteId: row.sourceNoteId,
    eventDate: serializeDate(row.eventDate),
    birthdayContactId: row.birthdayContactId,
    notifiedAt: serializeDate(row.notifiedAt),
    resolvedAt: serializeDate(row.resolvedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: serializeDate(row.deletedAt),
  };
}

async function assertAbsentOrOwned(model: any, id: string, userId: string) {
  const existing = await model.findFirst({
    where: { id },
    select: { userId: true },
  });

  if (existing && existing.userId !== userId) {
    throw new SyncRouteError('Cannot mutate another user row', 403);
  }
}

async function assertContactOwned(tx: any, contactId: string, userId: string) {
  const contact = await tx.syncedContact.findFirst({
    where: { id: contactId, userId },
  });

  if (!contact) {
    throw new SyncRouteError('Referenced contact does not belong to user', 403);
  }
}

async function assertGroupOwned(tx: any, groupId: string, userId: string) {
  const group = await tx.syncedGroup.findFirst({
    where: { id: groupId, userId },
  });

  if (!group) {
    throw new SyncRouteError('Referenced group does not belong to user', 403);
  }
}

async function upsertContact(tx: any, encryptionKey: string | undefined, userId: string, payload: ContactPayload) {
  await assertAbsentOrOwned(tx.syncedContact, payload.id, userId);
  const data = await encryptContactPayload(encryptionKey, userId, payload);
  await tx.syncedContact.upsert({
    where: { id: payload.id },
    create: data,
    update: withoutImmutable(data),
  });
  return payload.id;
}

async function upsertNote(tx: any, encryptionKey: string | undefined, userId: string, payload: NotePayload) {
  await assertContactOwned(tx, payload.contactId, userId);
  await assertAbsentOrOwned(tx.syncedNote, payload.id, userId);
  const data = await encryptNotePayload(encryptionKey, userId, payload);
  await tx.syncedNote.upsert({
    where: { id: payload.id },
    create: data,
    update: withoutImmutable(data),
  });
  return payload.id;
}

async function upsertGroup(tx: any, encryptionKey: string | undefined, userId: string, payload: GroupPayload) {
  await assertAbsentOrOwned(tx.syncedGroup, payload.id, userId);
  const data = await encryptGroupPayload(encryptionKey, userId, payload);
  await tx.syncedGroup.upsert({
    where: { id: payload.id },
    create: data,
    update: withoutImmutable(data),
  });
  return payload.id;
}

async function upsertContactGroup(tx: any, userId: string, entityId: string, payload: ContactGroupPayload) {
  await assertContactOwned(tx, payload.contactId, userId);
  await assertGroupOwned(tx, payload.groupId, userId);
  const data = mapContactGroupPayload(userId, entityId, payload);
  const row = await tx.syncedContactGroup.upsert({
    where: {
      userId_contactId_groupId: {
        userId,
        contactId: payload.contactId,
        groupId: payload.groupId,
      },
    },
    create: data,
    update: withoutImmutable(data),
  });
  return row.id;
}

async function upsertHotTopic(tx: any, encryptionKey: string | undefined, userId: string, payload: HotTopicPayload) {
  await assertContactOwned(tx, payload.contactId, userId);
  await assertAbsentOrOwned(tx.syncedHotTopic, payload.id, userId);
  const data = await encryptHotTopicPayload(encryptionKey, userId, payload);
  await tx.syncedHotTopic.upsert({
    where: { id: payload.id },
    create: data,
    update: withoutImmutable(data),
  });
  return payload.id;
}

async function applyMutation(tx: any, encryptionKey: string | undefined, userId: string, mutation: SyncMutation) {
  switch (mutation.entityType) {
    case 'contact':
      return upsertContact(tx, encryptionKey, userId, mutation.payload);
    case 'note':
      return upsertNote(tx, encryptionKey, userId, mutation.payload);
    case 'group':
      return upsertGroup(tx, encryptionKey, userId, mutation.payload);
    case 'contact_group':
      return upsertContactGroup(tx, userId, mutation.entityId, mutation.payload);
    case 'hot_topic':
      return upsertHotTopic(tx, encryptionKey, userId, mutation.payload);
  }
}

async function applyMutations(tx: any, encryptionKey: string | undefined, userId: string, mutations: SyncMutation[]) {
  const appliedMutationIds: string[] = [];
  let cursor = 0n;

  for (const mutation of mutations) {
    const entityId = await applyMutation(tx, encryptionKey, userId, mutation);
    const change = await tx.syncChange.create({
      data: {
        userId,
        entityType: mutation.entityType,
        entityId,
        operation: mutation.operation,
      },
    });

    cursor = change.sequence;
    appliedMutationIds.push(mutation.id);
  }

  return {
    cursor: cursor.toString(),
    appliedMutationIds,
  };
}

async function getEntityPayload(prisma: any, encryptionKey: string | undefined, userId: string, entityType: z.infer<typeof syncEntityTypeSchema>, entityId: string) {
  switch (entityType) {
    case 'contact': {
      const row = await prisma.syncedContact.findFirst({ where: { id: entityId, userId } });
      return row ? decryptContact(encryptionKey, row) : null;
    }
    case 'note': {
      const row = await prisma.syncedNote.findFirst({ where: { id: entityId, userId } });
      return row ? decryptNote(encryptionKey, row) : null;
    }
    case 'group': {
      const row = await prisma.syncedGroup.findFirst({ where: { id: entityId, userId } });
      return row ? decryptGroup(encryptionKey, row) : null;
    }
    case 'contact_group': {
      const row = await prisma.syncedContactGroup.findFirst({ where: { id: entityId, userId } });
      return row ? serializeContactGroup(row) : null;
    }
    case 'hot_topic': {
      const row = await prisma.syncedHotTopic.findFirst({ where: { id: entityId, userId } });
      return row ? decryptHotTopic(encryptionKey, row) : null;
    }
  }
}

function errorResponse(c: any, error: unknown, fallbackMessage: string) {
  if (error instanceof SyncRouteError) {
    return c.json({ error: error.message }, error.status);
  }

  console.error(fallbackMessage, error);
  return c.json({ error: fallbackMessage }, 500);
}

syncRoutes.get('/bootstrap', async (c) => {
  try {
    const user = c.get('user');
    const prisma = getPrisma(c.env.DATABASE_URL);
    const latestChange = await prisma.syncChange.findFirst({
      where: { userId: user.id },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });

    return c.json({
      hasServerData: latestChange !== null,
      cursor: serializeCursor(latestChange?.sequence),
    });
  } catch (error) {
    return errorResponse(c, error, 'Failed to bootstrap sync');
  }
});

syncRoutes.post('/initialize', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => null);
    const validation = syncBatchSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const prisma = getPrisma(c.env.DATABASE_URL);
    const latestChange = await prisma.syncChange.findFirst({
      where: { userId: user.id },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });

    if (latestChange) {
      return c.json({ error: 'Server sync state already exists' }, 409);
    }

    const result = await prisma.$transaction((tx: any) =>
      applyMutations(tx, c.env.SYNC_ENCRYPTION_KEY, user.id, validation.data.mutations)
    );

    return c.json(result);
  } catch (error) {
    return errorResponse(c, error, 'Failed to initialize sync');
  }
});

syncRoutes.post('/push', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json().catch(() => null);
    const validation = syncBatchSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const prisma = getPrisma(c.env.DATABASE_URL);
    const result = await prisma.$transaction((tx: any) =>
      applyMutations(tx, c.env.SYNC_ENCRYPTION_KEY, user.id, validation.data.mutations)
    );

    return c.json(result);
  } catch (error) {
    return errorResponse(c, error, 'Failed to push sync mutations');
  }
});

syncRoutes.get('/changes', async (c) => {
  try {
    const user = c.get('user');
    const cursor = parseCursor(c.req.query('cursor') ?? '0');
    if (cursor == null) {
      return c.json({ error: 'Invalid cursor' }, 400);
    }

    const prisma = getPrisma(c.env.DATABASE_URL);
    const changeRows = await prisma.syncChange.findMany({
      where: {
        userId: user.id,
        sequence: { gt: cursor },
      },
      orderBy: { sequence: 'asc' },
      take: 500,
    });

    const changes = [];
    let latestCursor = cursor;
    for (const change of changeRows) {
      latestCursor = change.sequence;
      const payload = await getEntityPayload(prisma, c.env.SYNC_ENCRYPTION_KEY, user.id, change.entityType, change.entityId);
      if (!payload) {
        continue;
      }

      changes.push({
        sequence: change.sequence.toString(),
        entityType: change.entityType,
        entityId: change.entityId,
        operation: change.operation,
        payload,
      });
    }

    return c.json({
      cursor: latestCursor.toString(),
      changes,
      hasMore: changeRows.length === 500,
    });
  } catch (error) {
    return errorResponse(c, error, 'Failed to fetch sync changes');
  }
});
