import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Group } from '@/types';
import { syncQueueService } from './sync-queue.service';

type GroupRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

type GroupContactCountRow = {
  group_id: string;
  count: number;
};

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const groupRowToSyncPayload = (row: GroupRow) => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at ?? null,
});

const enqueueGroup = async (id: string, operation: 'upsert' | 'delete'): Promise<void> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GroupRow>('SELECT * FROM groups WHERE id = ?', [id]);
  if (!row) return;

  await syncQueueService.enqueueMutation({
    entityType: 'group',
    entityId: id,
    operation,
    payload: groupRowToSyncPayload(row),
  });
};

const enqueueContactGroup = async (
  contactId: string,
  groupId: string,
  operation: 'upsert' | 'delete'
): Promise<void> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    contact_id: string;
    group_id: string;
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
  }>('SELECT * FROM contact_groups WHERE contact_id = ? AND group_id = ?', [contactId, groupId]);
  if (!row) return;

  await syncQueueService.enqueueMutation({
    entityType: 'contact_group',
    entityId: `${contactId}:${groupId}`,
    operation,
    payload: {
      contactId: row.contact_id,
      groupId: row.group_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      deletedAt: row.deleted_at,
    },
  });
};

export const groupService = {
  getAll: async (): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      'SELECT * FROM groups WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE'
    );
    return rows.map(rowToGroup);
  },

  getById: async (id: string): Promise<Group | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<GroupRow>(
      'SELECT * FROM groups WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return row ? rowToGroup(row) : null;
  },

  findByName: async (name: string): Promise<Group | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<GroupRow>(
      'SELECT * FROM groups WHERE name = ? COLLATE NOCASE AND deleted_at IS NULL',
      [name]
    );
    return row ? rowToGroup(row) : null;
  },

  searchByName: async (query: string): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      'SELECT * FROM groups WHERE name LIKE ? COLLATE NOCASE AND deleted_at IS NULL ORDER BY name COLLATE NOCASE LIMIT 10',
      [`%${query}%`]
    );
    return rows.map(rowToGroup);
  },

  create: async (name: string): Promise<Group> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO groups (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, name.trim(), now, now]
    );

    await enqueueGroup(id, 'upsert');

    return { id, name: name.trim(), createdAt: now, updatedAt: now };
  },

  update: async (id: string, name: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE groups SET name = ?, updated_at = ? WHERE id = ?',
      [name.trim(), now, id]
    );
    await enqueueGroup(id, 'upsert');
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const contactGroups = await db.getAllAsync<{ contact_id: string; group_id: string }>(
      'SELECT contact_id, group_id FROM contact_groups WHERE group_id = ? AND deleted_at IS NULL',
      [id]
    );
    await db.runAsync('UPDATE groups SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
    await db.runAsync(
      'UPDATE contact_groups SET deleted_at = ?, updated_at = ? WHERE group_id = ?',
      [now, now, id]
    );
    await enqueueGroup(id, 'delete');
    for (const row of contactGroups) {
      await enqueueContactGroup(row.contact_id, row.group_id, 'delete');
    }
  },

  getGroupsForContact: async (contactId: string): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      `SELECT g.* FROM groups g
       INNER JOIN contact_groups cg ON g.id = cg.group_id
       WHERE cg.contact_id = ?
       AND g.deleted_at IS NULL
       AND cg.deleted_at IS NULL
       ORDER BY g.name COLLATE NOCASE`,
      [contactId]
    );
    return rows.map(rowToGroup);
  },

  getContactIdsForGroup: async (groupId: string): Promise<string[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ contact_id: string }>(
      'SELECT contact_id FROM contact_groups WHERE group_id = ? AND deleted_at IS NULL',
      [groupId]
    );
    return rows.map((row) => row.contact_id);
  },

  getContactCountsByGroup: async (): Promise<Record<string, number>> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupContactCountRow>(
      `SELECT group_id, COUNT(contact_id) AS count
       FROM contact_groups
       WHERE deleted_at IS NULL
       GROUP BY group_id`
    );

    return rows.reduce<Record<string, number>>((countsByGroupId, row) => ({
      ...countsByGroupId,
      [row.group_id]: row.count,
    }), {});
  },

  addContactToGroup: async (contactId: string, groupId: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO contact_groups (contact_id, group_id, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT(contact_id, group_id) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = NULL`,
      [contactId, groupId, now, now]
    );
    await enqueueContactGroup(contactId, groupId, 'upsert');
  },

  removeContactFromGroup: async (contactId: string, groupId: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE contact_groups SET deleted_at = ?, updated_at = ? WHERE contact_id = ? AND group_id = ?',
      [now, now, contactId, groupId]
    );
    await enqueueContactGroup(contactId, groupId, 'delete');
  },

  setContactGroups: async (contactId: string, groupIds: string[]): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existingRows = await db.getAllAsync<{ group_id: string }>(
      'SELECT group_id FROM contact_groups WHERE contact_id = ? AND deleted_at IS NULL',
      [contactId]
    );
    const nextGroupIds = new Set(groupIds);

    for (const row of existingRows) {
      if (!nextGroupIds.has(row.group_id)) {
        await db.runAsync(
          'UPDATE contact_groups SET deleted_at = ?, updated_at = ? WHERE contact_id = ? AND group_id = ?',
          [now, now, contactId, row.group_id]
        );
        await enqueueContactGroup(contactId, row.group_id, 'delete');
      }
    }

    for (const groupId of groupIds) {
      await db.runAsync(
        `INSERT INTO contact_groups (contact_id, group_id, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, NULL)
         ON CONFLICT(contact_id, group_id) DO UPDATE SET updated_at = excluded.updated_at, deleted_at = NULL`,
        [contactId, groupId, now, now]
      );
      await enqueueContactGroup(contactId, groupId, 'upsert');
    }
  },

  getOrCreate: async (name: string): Promise<Group> => {
    const existing = await groupService.findByName(name);
    if (existing) return existing;
    return groupService.create(name);
  },
};
