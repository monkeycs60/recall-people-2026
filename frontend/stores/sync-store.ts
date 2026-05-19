import { create } from 'zustand';
import { syncService } from '@/services/sync.service';

type SyncState = {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
};

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  syncNow: async () => {
    set({ isSyncing: true, error: null });
    try {
      const lastSyncedAt = await syncService.bootstrapAndSync();
      set({ isSyncing: false, lastSyncedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      set({ isSyncing: false, error: message });
      throw error;
    }
  },
}));
