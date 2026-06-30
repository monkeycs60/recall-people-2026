import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkProWhitelist, getQuotas } from '@/lib/api';

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
};

type SubscriptionActions = {
  setIsPremium: (isPremium: boolean) => void;
  activateTestPro: () => void;
  deactivateTestPro: () => void;
  checkWhitelistStatus: () => Promise<void>;
  getMaxRecordingDuration: () => number;
  setHydrated: (hydrated: boolean) => void;

  syncQuotas: () => Promise<void>;
  canCreateContact: (currentCount: number) => boolean;
  canGenerateAvatar: () => boolean;
  canUseAsk: () => boolean;
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
        isHydrated: false,
        isSyncing: false,

        // Monthly quota defaults
        avatarUsed: 0,
        avatarLimit: -1,
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
          return true;
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

        setHydrated: (isHydrated) => set({ isHydrated }),
      }),
      {
        name: 'subscription-store',
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
        partialize: (state) => ({
          isPremium: state.isPremium,
          isTestPro: state.isTestPro,
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
