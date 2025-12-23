import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Group } from '@/types';

type GroupRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const groupService = {
  getAll: async (): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      'SELECT * FROM groups ORDER BY name COLLATE NOCASE'
    );
    return rows.map(rowToGroup);
  },

  getById: async (id: string): Promise<Group | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<GroupRow>(
      'SELECT * FROM groups WHERE id = ?',
      [id]
    );
    return row ? rowToGroup(row) : null;
  },

  findByName: async (name: string): Promise<Group | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<GroupRow>(
      'SELECT * FROM groups WHERE name = ? COLLATE NOCASE',
      [name]
    );
    return row ? rowToGroup(row) : null;
  },

  searchByName: async (query: string): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      'SELECT * FROM groups WHERE name LIKE ? COLLATE NOCASE ORDER BY name COLLATE NOCASE LIMIT 10',
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

    return { id, name: name.trim(), createdAt: now, updatedAt: now };
  },

  update: async (id: string, name: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE groups SET name = ?, updated_at = ? WHERE id = ?',
      [name.trim(), now, id]
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM groups WHERE id = ?', [id]);
  },

  getGroupsForContact: async (contactId: string): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      `SELECT g.* FROM groups g
       INNER JOIN contact_groups cg ON g.id = cg.group_id
       WHERE cg.contact_id = ?
       ORDER BY g.name COLLATE NOCASE`,
      [contactId]
    );
    return rows.map(rowToGroup);
  },

  getContactIdsForGroup: async (groupId: string): Promise<string[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ contact_id: string }>(
      'SELECT contact_id FROM contact_groups WHERE group_id = ?',
      [groupId]
    );
    return rows.map((row) => row.contact_id);
  },

  addContactToGroup: async (contactId: string, groupId: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR IGNORE INTO contact_groups (contact_id, group_id, created_at) VALUES (?, ?, ?)',
      [contactId, groupId, now]
    );
  },

  removeContactFromGroup: async (contactId: string, groupId: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM contact_groups WHERE contact_id = ? AND group_id = ?',
      [contactId, groupId]
    );
  },

  setContactGroups: async (contactId: string, groupIds: string[]): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      'DELETE FROM contact_groups WHERE contact_id = ?',
      [contactId]
    );

    for (const groupId of groupIds) {
      await db.runAsync(
        'INSERT INTO contact_groups (contact_id, group_id, created_at) VALUES (?, ?, ?)',
        [contactId, groupId, now]
      );
    }
  },

  getOrCreate: async (name: string): Promise<Group> => {
    const existing = await groupService.findByName(name);
    if (existing) return existing;
    return groupService.create(name);
  },
};
