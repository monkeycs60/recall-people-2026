import { fr, enUS, es, it, de } from 'date-fns/locale';
import i18n from '@/lib/i18n';

const localeMap: Record<string, Locale> = {
  fr,
  en: enUS,
  es,
  it,
  de,
};

const toLocaleDateStringMap: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  it: 'it-IT',
  de: 'de-DE',
};

export function getDateLocale(): Locale {
  return localeMap[i18n.language] ?? enUS;
}

export function getLocaleDateStringLocale(): string {
  return toLocaleDateStringMap[i18n.language] ?? 'en-US';
}
