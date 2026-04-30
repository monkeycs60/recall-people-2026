import { fr, enUS, es, it, de } from 'date-fns/locale';
import type { Locale } from 'date-fns';
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

export function formatLocalizedDate(
  dateInput: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
): string {
  const date = typeof dateInput === 'string'
    ? parseDateInput(dateInput)
    : dateInput;
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString(getLocaleDateStringLocale(), options);
}

function parseDateInput(dateInput: string): Date {
  const dateOnlyMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(dateInput);
}
