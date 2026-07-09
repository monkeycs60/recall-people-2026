/**
 * Deterministic calendar context injected into extraction prompts.
 *
 * LLMs cannot reliably map an ISO date to a weekday, so "samedi prochain"
 * gets resolved to the wrong day unless we hand the model an explicit
 * weekday → date table. The table is computed in code (UTC-based, like
 * event-date-guard) and covers 7 past days (for "jeudi dernier",
 * "la semaine dernière") through 14 future days.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const PAST_DAYS = 7;
const FUTURE_DAYS = 14;

type CalendarTemplate = {
  /** Weekday names indexed by Date.getUTCDay() (0 = Sunday). */
  weekdays: string[];
  header: string;
  todayMarker: string;
  rule: string;
};

const CALENDAR_TEMPLATES: Record<string, CalendarTemplate> = {
  fr: {
    weekdays: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    header: 'CALENDRIER DE RÉFÉRENCE (jours de semaine → dates exactes):',
    todayMarker: "(AUJOURD'HUI)",
    rule: 'RÈGLE CRITIQUE: ne calcule JAMAIS un jour de semaine toi-même, utilise UNIQUEMENT ce calendrier. "samedi prochain" = le PREMIER samedi APRÈS la ligne AUJOURD\'HUI. "jeudi dernier" = le dernier jeudi AVANT la ligne AUJOURD\'HUI.',
  },
  en: {
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    header: 'REFERENCE CALENDAR (weekdays → exact dates):',
    todayMarker: '(TODAY)',
    rule: 'CRITICAL RULE: NEVER compute a weekday yourself, use ONLY this calendar. "next Saturday" = the FIRST Saturday AFTER the TODAY line. "last Thursday" = the last Thursday BEFORE the TODAY line.',
  },
  es: {
    weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    header: 'CALENDARIO DE REFERENCIA (días de la semana → fechas exactas):',
    todayMarker: '(HOY)',
    rule: 'REGLA CRÍTICA: NUNCA calcules un día de la semana tú mismo, usa ÚNICAMENTE este calendario. "el sábado que viene" = el PRIMER sábado DESPUÉS de la línea HOY. "el jueves pasado" = el último jueves ANTES de la línea HOY.',
  },
  it: {
    weekdays: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
    header: 'CALENDARIO DI RIFERIMENTO (giorni della settimana → date esatte):',
    todayMarker: '(OGGI)',
    rule: 'REGOLA CRITICA: NON calcolare MAI un giorno della settimana da solo, usa SOLO questo calendario. "sabato prossimo" = il PRIMO sabato DOPO la riga OGGI. "giovedì scorso" = l\'ultimo giovedì PRIMA della riga OGGI.',
  },
  de: {
    weekdays: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    header: 'REFERENZKALENDER (Wochentage → exakte Daten):',
    todayMarker: '(HEUTE)',
    rule: 'KRITISCHE REGEL: Berechne NIEMALS selbst einen Wochentag, verwende NUR diesen Kalender. "nächsten Samstag" = der ERSTE Samstag NACH der HEUTE-Zeile. "letzten Donnerstag" = der letzte Donnerstag VOR der HEUTE-Zeile.',
  },
};

/**
 * Builds the weekday → date table for the extraction prompt.
 * Covers now - 7 days through now + 14 days, UTC-based.
 */
export function buildCalendarContext(now: Date, language: string): string {
  const template = CALENDAR_TEMPLATES[language] || CALENDAR_TEMPLATES.fr;

  const lines: string[] = [];
  for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset++) {
    const day = new Date(now.getTime() + offset * DAY_MS);
    const isoDate = day.toISOString().slice(0, 10);
    const weekday = template.weekdays[day.getUTCDay()];
    const todaySuffix = offset === 0 ? ` ${template.todayMarker}` : '';
    lines.push(`- ${weekday} ${isoDate}${todaySuffix}`);
  }

  return `${template.header}\n${lines.join('\n')}\n${template.rule}`;
}
