import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkProWhitelist } from '@/lib/api';

type SubscriptionState = {
  isPremium: boolean;
  isTestPro: boolean;
  notesCreatedThisMonth: number;
  currentMonthKey: string; // Format: "2026-01"
  isHydrated: boolean;
};

type SubscriptionActions = {
  setIsPremium: (isPremium: boolean) => void;
  activateTestPro: () => void;
  deactivateTestPro: () => void;
  checkWhitelistStatus: () => Promise<void>;
  incrementNotesCount: () => void;
  canCreateNote: () => boolean;
  getMaxRecordingDuration: () => number;
  resetMonthlyCountIfNeeded: () => void;
  setHydrated: (hydrated: boolean) => void;
};

const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const FREE_NOTES_PER_MONTH = 10;
const FREE_MAX_DURATION_SECONDS = 60; // 1 minute
const PREMIUM_MAX_DURATION_SECONDS = 180; // 3 minutes

export const useSubscriptionStore = create<SubscriptionState & SubscriptionActions>()(
  devtools(
    persist(
      (set, get) => ({
        isPremium: false,
        isTestPro: false,
        notesCreatedThisMonth: 0,
        currentMonthKey: getCurrentMonthKey(),
        isHydrated: false,

        setIsPremium: (isPremium) => set({ isPremium }),

        activateTestPro: () => set({ isTestPro: true, isPremium: true }),

        deactivateTestPro: () => set({ isTestPro: false, isPremium: false }),

        checkWhitelistStatus: async () => {
          const isWhitelisted = await checkProWhitelist();
          if (isWhitelisted) {
            set({ isTestPro: true, isPremium: true });
          }
        },

        incrementNotesCount: () => {
          const state = get();
          state.resetMonthlyCountIfNeeded();
          set({ notesCreatedThisMonth: get().notesCreatedThisMonth + 1 });
        },

        canCreateNote: () => {
          const state = get();
          if (state.isPremium || state.isTestPro) return true;
          state.resetMonthlyCountIfNeeded();
          return get().notesCreatedThisMonth < FREE_NOTES_PER_MONTH;
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
        }),
      }
    ),
    { name: 'subscription-store' }
  )
);

export { FREE_NOTES_PER_MONTH, FREE_MAX_DURATION_SECONDS, PREMIUM_MAX_DURATION_SECONDS };
