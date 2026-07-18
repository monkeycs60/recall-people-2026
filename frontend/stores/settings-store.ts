import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/types';
import { getToken } from '@/lib/auth';
import { API_URL } from '@/lib/config';
import { AI_CONSENT_VERSION, type AIConsentStatus } from '@/lib/ai-consent-policy';

type SettingsState = {
  language: Language;
  isHydrated: boolean;
  hasSeenGuidedTour: boolean;
  hasAcceptedAIConsent: boolean;
  aiConsentStatus: AIConsentStatus;
  aiConsentUserId: string | null;
  aiConsentVersion: string | null;
  aiConsentPromptVisible: boolean;
  notSeenThresholdDays: number;
  weeklyDigestEnabled: boolean;
  postEventFollowUpEnabled: boolean;
  eveningReminderTime: string;
  morningReminderTime: string;
};

type SettingsActions = {
  setLanguage: (language: Language) => void;
  setHydrated: (hydrated: boolean) => void;
  setHasSeenGuidedTour: (seen: boolean) => void;
  prepareAIConsentForUser: (userId: string) => void;
  acceptAIConsent: (userId: string) => void;
  declineAIConsent: (userId: string) => void;
  requestAIConsent: () => void;
  dismissAIConsentPrompt: () => void;
  setNotSeenThresholdDays: (days: number) => void;
  setWeeklyDigestEnabled: (enabled: boolean) => void;
  setPostEventFollowUpEnabled: (enabled: boolean) => void;
  setEveningReminderTime: (time: string) => void;
  setMorningReminderTime: (time: string) => void;
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
      (set, get) => ({
        language: detectDeviceLanguage(),
        isHydrated: false,
        hasSeenGuidedTour: false,
        hasAcceptedAIConsent: false,
        aiConsentStatus: 'pending',
        aiConsentUserId: null,
        aiConsentVersion: null,
        aiConsentPromptVisible: false,
        notSeenThresholdDays: 60,
        weeklyDigestEnabled: true,
        postEventFollowUpEnabled: true,
        eveningReminderTime: '19:00',
        morningReminderTime: '08:30',

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
        setHasSeenGuidedTour: (hasSeenGuidedTour) => set({ hasSeenGuidedTour }),
        prepareAIConsentForUser: (userId) => {
          const state = get();
          const isCurrentDecision =
            state.aiConsentUserId === userId &&
            state.aiConsentVersion === AI_CONSENT_VERSION &&
            state.aiConsentStatus !== 'pending';

          if (isCurrentDecision) return;

          set({
            hasAcceptedAIConsent: false,
            aiConsentStatus: 'pending',
            aiConsentUserId: userId,
            aiConsentVersion: AI_CONSENT_VERSION,
            aiConsentPromptVisible: false,
          });
        },
        acceptAIConsent: (userId) => set({
          hasAcceptedAIConsent: true,
          aiConsentStatus: 'accepted',
          aiConsentUserId: userId,
          aiConsentVersion: AI_CONSENT_VERSION,
          aiConsentPromptVisible: false,
        }),
        declineAIConsent: (userId) => set({
          hasAcceptedAIConsent: false,
          aiConsentStatus: 'declined',
          aiConsentUserId: userId,
          aiConsentVersion: AI_CONSENT_VERSION,
          aiConsentPromptVisible: false,
        }),
        requestAIConsent: () => set({
          aiConsentPromptVisible: true,
        }),
        dismissAIConsentPrompt: () => set({ aiConsentPromptVisible: false }),
        setNotSeenThresholdDays: (notSeenThresholdDays) => set({ notSeenThresholdDays }),
        setWeeklyDigestEnabled: (weeklyDigestEnabled) => set({ weeklyDigestEnabled }),
        setPostEventFollowUpEnabled: (postEventFollowUpEnabled) => set({ postEventFollowUpEnabled }),
        setEveningReminderTime: (eveningReminderTime) => set({ eveningReminderTime }),
        setMorningReminderTime: (morningReminderTime) => set({ morningReminderTime }),
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
          hasSeenGuidedTour: state.hasSeenGuidedTour,
          hasAcceptedAIConsent: state.hasAcceptedAIConsent,
          aiConsentStatus: state.aiConsentStatus,
          aiConsentUserId: state.aiConsentUserId,
          aiConsentVersion: state.aiConsentVersion,
          notSeenThresholdDays: state.notSeenThresholdDays,
          weeklyDigestEnabled: state.weeklyDigestEnabled,
          postEventFollowUpEnabled: state.postEventFollowUpEnabled,
          eveningReminderTime: state.eveningReminderTime,
          morningReminderTime: state.morningReminderTime,
        }),
      }
    ),
    { name: 'settings-store' }
  )
);
