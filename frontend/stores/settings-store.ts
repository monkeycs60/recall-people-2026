import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/types';

type SettingsState = {
  language: Language;
  isHydrated: boolean;
};

type SettingsActions = {
  setLanguage: (language: Language) => void;
  setHydrated: (hydrated: boolean) => void;
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

        setLanguage: (language) => set({ language }),
        setHydrated: (isHydrated) => set({ isHydrated }),
        detectDeviceLanguage,
      }),
      {
        name: 'settings-store',
        storage: createJSONStorage(() => AsyncStorage),
        onRehydrateStorage: () => (state) => {
          state?.setHydrated(true);
        },
        partialize: (state) => ({ language: state.language }),
      }
    ),
    { name: 'settings-store' }
  )
);
