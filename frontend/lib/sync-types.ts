export type SyncEntityType = 'contact' | 'note' | 'group' | 'contact_group' | 'hot_topic';
export type SyncOperation = 'upsert' | 'delete';

export type SyncMutation = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SyncChange = Omit<SyncMutation, 'id'> & {
  sequence: string;
};

export type SyncBootstrapResponse = {
  hasServerData: boolean;
  cursor: string;
};

export type SyncPushResponse = {
  cursor: string;
  appliedMutationIds: string[];
};

export type SyncChangesResponse = {
  cursor: string;
  changes: SyncChange[];
  hasMore?: boolean;
};
