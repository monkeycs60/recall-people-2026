import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { Language, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/types';

import fr from '@/locales/fr.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';
import de from '@/locales/de.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  it: { translation: it },
  de: { translation: de },
};

// Detect device language at startup
const getInitialLanguage = (): Language => {
  const locales = getLocales();
  if (locales.length === 0) return DEFAULT_LANGUAGE;

  const deviceLang = locales[0].languageCode;
  if (deviceLang && SUPPORTED_LANGUAGES.includes(deviceLang as Language)) {
    return deviceLang as Language;
  }

  return DEFAULT_LANGUAGE;
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export const changeLanguage = (language: Language): void => {
  i18n.changeLanguage(language);
};

export default i18n;
