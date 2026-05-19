import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import type { SyncEntityType, SyncMutation, SyncOperation } from '@/lib/sync-types';

export const syncQueueService = {
  enqueueMutation: async (input: {
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    payload: Record<string, unknown>;
  }): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload_json, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        Crypto.randomUUID(),
        input.entityType,
        input.entityId,
        input.operation,
        JSON.stringify(input.payload),
        now,
        now,
      ]
    );
  },

  getPendingMutations: async (limit = 500): Promise<SyncMutation[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      entity_type: SyncEntityType;
      entity_id: string;
      operation: SyncOperation;
      payload_json: string;
      created_at: string;
    }>('SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?', [limit]);

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: JSON.parse(row.payload_json),
      createdAt: row.created_at,
    }));
  },

  deleteAppliedMutations: async (mutationIds: string[]): Promise<void> => {
    if (mutationIds.length === 0) return;
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM sync_queue WHERE id IN (${mutationIds.map(() => '?').join(', ')})`,
      mutationIds
    );
  },
};
