import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/types';
import { getToken } from '@/lib/auth';
import { API_URL } from '@/lib/config';

type SettingsState = {
  language: Language;
  isHydrated: boolean;
  hasSeenOnboarding: boolean;
  hasAcceptedAIConsent: boolean;
  notSeenThresholdDays: number;
  weeklyDigestEnabled: boolean;
  postEventFollowUpEnabled: boolean;
};

type SettingsActions = {
  setLanguage: (language: Language) => void;
  setHydrated: (hydrated: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  setHasAcceptedAIConsent: (accepted: boolean) => void;
  setNotSeenThresholdDays: (days: number) => void;
  setWeeklyDigestEnabled: (enabled: boolean) => void;
  setPostEventFollowUpEnabled: (enabled: boolean) => void;
  detectDeviceLanguage: () => Language;
};

const detectDeviceLanguage = (): Language => {
  const locales = getLocales();
  if (locales.length === 0) return DEFAULT_LANGUAGE;

  const deviceLang = locales[0].languageCode;
  if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang as Language)) {
    return deviceLang as Language;
  }

  return DEFAULT_LANGUAGE;
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  devtools(
    persist(
      (set) => ({
        language: detectDeviceLanguage(),
        isHydrated: false,
        hasSeenOnboarding: false,
        hasAcceptedAIConsent: false,
        notSeenThresholdDays: 60,
        weeklyDigestEnabled: true,
        postEventFollowUpEnabled: true,

        setLanguage: async (language) => {
          set({ language });

          // Sync to backend if authenticated
          const token = await getToken();
          if (token) {
            try {
              const response = await fetch(`${API_URL}/api/settings`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ preferredLanguage: language }),
              });
              if (!response.ok) {
                throw new Error(`Settings sync failed with ${response.status}`);
              }
            } catch {
              // Ignore sync errors - local change is already applied
            }
          }
        },
        setHydrated: (isHydrated) => set({ isHydrated }),
        setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
        setHasAcceptedAIConsent: (hasAcceptedAIConsent) => set({ hasAcceptedAIConsent }),
        setNotSeenThresholdDays: (notSeenThresholdDays) => set({ notSeenThresholdDays }),
        setWeeklyDigestEnabled: (weeklyDigestEnabled) => set({ weeklyDigestEnabled }),
        setPostEventFollowUpEnabled: (postEventFollowUpEnabled) => set({ postEventFollowUpEnabled }),
        detectDeviceLanguage,
      }),
      {
        name: 'settings-store',
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
        partialize: (state) => ({
          language: state.language,
          hasSeenOnboarding: state.hasSeenOnboarding,
          hasAcceptedAIConsent: state.hasAcceptedAIConsent,
          notSeenThresholdDays: state.notSeenThresholdDays,
          weeklyDigestEnabled: state.weeklyDigestEnabled,
          postEventFollowUpEnabled: state.postEventFollowUpEnabled,
        }),
      }
    ),
    { name: 'settings-store' }
  )
);
