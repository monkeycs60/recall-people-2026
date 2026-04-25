import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkProWhitelist,
  getNotesStatus,
  incrementNoteCount,
  getQuotas,
} from '@/lib/api';

type SubscriptionState = {
  isPremium: boolean;
  isTestPro: boolean;
  isHydrated: boolean;
  isSyncing: boolean;

  // Monthly quotas
  avatarUsed: number;
  avatarLimit: number;
  askUsed: number;
  askLimit: number;

  notesCreatedThisMonth: number;
  currentMonthKey: string;
};

type SubscriptionActions = {
  setIsPremium: (isPremium: boolean) => void;
  activateTestPro: () => void;
  deactivateTestPro: () => void;
  checkWhitelistStatus: () => Promise<void>;
  incrementNotesCount: () => Promise<void>;
  canCreateNote: () => boolean;
  getMaxRecordingDuration: () => number;
  resetMonthlyCountIfNeeded: () => void;
  setHydrated: (hydrated: boolean) => void;
  syncNotesStatus: () => Promise<void>;

  syncQuotas: () => Promise<void>;
  canCreateContact: (currentCount: number) => boolean;
  canGenerateAvatar: () => boolean;
  canUseAsk: () => boolean;
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const FREE_CONTACTS_LIMIT = 15;
const FREE_MAX_DURATION_SECONDS = 60;
const PREMIUM_MAX_DURATION_SECONDS = 180;

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>()(
  devtools(
    persist(
      (set, get) => ({
        isPremium: false,
        isTestPro: false,
        notesCreatedThisMonth: 0,
        currentMonthKey: getCurrentMonthKey(),
        isHydrated: false,
        isSyncing: false,

        // Monthly quota defaults
        avatarUsed: 0,
        avatarLimit: 5,
        askUsed: 0,
        askLimit: 10,

        setIsPremium: (isPremium) => set({ isPremium }),

        activateTestPro: () => set({ isTestPro: true, isPremium: true }),

        deactivateTestPro: () => set({ isTestPro: false, isPremium: false }),

        checkWhitelistStatus: async () => {
          const isWhitelisted = await checkProWhitelist();
          const state = get();

          if (__DEV__) {
            console.log('[subscription] Whitelist check:', { isWhitelisted, currentIsTestPro: state.isTestPro });
          }

          if (isWhitelisted) {
            set({ isTestPro: true, isPremium: true });
          } else if (state.isTestPro) {
            set({ isTestPro: false, isPremium: false });
          }
        },

        syncNotesStatus: async () => {
          const state = get();
          if (state.isSyncing) return;

          set({ isSyncing: true });

          try {
            const status = await getNotesStatus();
            if (status) {
              if (__DEV__) {
                console.log('[subscription] Synced notes status from server:', status);
              }
              set({
                notesCreatedThisMonth: status.used,
                currentMonthKey: status.monthKey,
              });
            }
          } catch (error) {
            if (__DEV__) {
              console.error('[subscription] Failed to sync notes status:', error);
            }
          } finally {
            set({ isSyncing: false });
          }
        },

        incrementNotesCount: async () => {
          const state = get();
          state.resetMonthlyCountIfNeeded();

          const newCount = get().notesCreatedThisMonth + 1;
          set({ notesCreatedThisMonth: newCount });

          try {
            const result = await incrementNoteCount();
            if (result) {
              set({ notesCreatedThisMonth: result.used });
              if (__DEV__) {
                console.log('[subscription] Note count incremented on server:', result);
              }
            }
          } catch (error) {
            if (__DEV__) {
              console.error('[subscription] Failed to increment on server, keeping local count:', error);
            }
          }
        },

        canCreateNote: () => {
          return true;
        },

        canCreateContact: (currentCount: number) => {
          const state = get();
          if (state.isPremium || state.isTestPro) return true;
          return currentCount < FREE_CONTACTS_LIMIT;
        },

        canUseAsk: () => {
          const state = get();
          if (state.isPremium || state.isTestPro) return true;
          return state.askUsed < state.askLimit;
        },

        canGenerateAvatar: () => {
          const state = get();
          if (state.isPremium || state.isTestPro) return true;
          return state.avatarUsed < state.avatarLimit;
        },

        syncQuotas: async () => {
          const state = get();
          if (state.isSyncing) return;

          set({ isSyncing: true });

          try {
            const quotas = await getQuotas();
            if (quotas) {
              if (__DEV__) {
                console.log('[subscription] Synced quotas:', quotas);
              }
              set({
                avatarUsed: quotas.avatarUsed,
                avatarLimit: quotas.avatarLimit,
                askUsed: quotas.askUsed,
                askLimit: quotas.askLimit,
              });
              if (quotas.isPremium) {
                set({ isPremium: true, isTestPro: true });
              }
            }
          } catch (error) {
            if (__DEV__) {
              console.error('[subscription] Failed to sync quotas:', error);
            }
          } finally {
            set({ isSyncing: false });
          }
        },

        getMaxRecordingDuration: () => {
          const state = get();
          return state.isPremium || state.isTestPro
            ? PREMIUM_MAX_DURATION_SECONDS
            : FREE_MAX_DURATION_SECONDS;
        },

        resetMonthlyCountIfNeeded: () => {
          const currentMonth = getCurrentMonthKey();
          const state = get();
          if (state.currentMonthKey !== currentMonth) {
            set({
              currentMonthKey: currentMonth,
              notesCreatedThisMonth: 0,
            });
          }
        },

        setHydrated: (isHydrated) => set({ isHydrated }),
      }),
      {
        name: 'subscription-store',
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
          state?.resetMonthlyCountIfNeeded();
        },
        partialize: (state) => ({
          isPremium: state.isPremium,
          isTestPro: state.isTestPro,
          notesCreatedThisMonth: state.notesCreatedThisMonth,
          currentMonthKey: state.currentMonthKey,
          avatarUsed: state.avatarUsed,
          avatarLimit: state.avatarLimit,
          askUsed: state.askUsed,
          askLimit: state.askLimit,
        }),
      }
    ),
    { name: 'subscription-store' }
  )
);

export { FREE_CONTACTS_LIMIT, FREE_MAX_DURATION_SECONDS, PREMIUM_MAX_DURATION_SECONDS };
