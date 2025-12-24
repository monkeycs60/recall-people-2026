import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Language } from '@/types';

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

i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
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
