import { addDays, isAfter, isBefore, nextMonday, set } from 'date-fns';

export type DateNotificationTrigger = {
  type: 'date';
  date: Date;
};

export type ReminderTime = { hour: number; minute: number };

export const DEFAULT_EVENING_REMINDER_TIME: ReminderTime = { hour: 19, minute: 0 };
export const DEFAULT_MORNING_REMINDER_TIME: ReminderTime = { hour: 8, minute: 30 };

const atTime = (date: Date, hour: number, minute: number): Date =>
  set(date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });

export const parseReminderTime = (value: string, fallback: ReminderTime): ReminderTime => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  return { hour, minute };
};

export const formatReminderTime = (time: ReminderTime): string =>
  `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

export const buildDateNotificationTrigger = (date: Date): DateNotificationTrigger => ({
  type: 'date',
  date,
});

export const getEventReminderTriggerDate = (
  eventDate: string,
  now: Date = new Date(),
  eveningTime: ReminderTime = DEFAULT_EVENING_REMINDER_TIME
): Date | null => {
  const eventDateObj = new Date(eventDate);
  const triggerDate = atTime(addDays(eventDateObj, -1), eveningTime.hour, eveningTime.minute);

  if (isBefore(triggerDate, now)) return null;

  return triggerDate;
};

export const getEventDayMorningTriggerDate = (
  eventDate: string,
  now: Date = new Date(),
  morningTime: ReminderTime = DEFAULT_MORNING_REMINDER_TIME
): Date | null => {
  const eventDateObj = new Date(eventDate);
  const triggerDate = atTime(eventDateObj, morningTime.hour, morningTime.minute);

  if (isBefore(triggerDate, now)) return null;

  return triggerDate;
};

export const getBirthdayWeekAheadTriggerDate = (
  eventDate: string,
  now: Date = new Date(),
  morningTime: ReminderTime = DEFAULT_MORNING_REMINDER_TIME
): Date | null => {
  const eventDateObj = new Date(eventDate);
  const triggerDate = atTime(addDays(eventDateObj, -7), morningTime.hour, morningTime.minute);

  if (isBefore(triggerDate, now)) return null;

  return triggerDate;
};

export const getNextMorningOccurrence = (
  now: Date = new Date(),
  morningTime: ReminderTime = DEFAULT_MORNING_REMINDER_TIME
): Date => {
  const todaySlot = atTime(now, morningTime.hour, morningTime.minute);

  if (isAfter(todaySlot, now)) return todaySlot;

  return atTime(addDays(now, 1), morningTime.hour, morningTime.minute);
};

export const getNotSeenReminderTriggerDate = (
  now: Date = new Date(),
  morningTime: ReminderTime = DEFAULT_MORNING_REMINDER_TIME
): Date => atTime(addDays(now, 1), morningTime.hour, morningTime.minute);

export const getWeeklyDigestTriggerDate = (now: Date = new Date()): Date => {
  const todayAtNine = atTime(now, 9, 0);
  const isMonday = now.getDay() === 1;

  if (isMonday && !isAfter(now, todayAtNine)) {
    return todayAtNine;
  }

  return atTime(nextMonday(now), 9, 0);
};

export const getPostEventFollowUpTriggerDate = (
  now: Date = new Date(),
  morningTime: ReminderTime = DEFAULT_MORNING_REMINDER_TIME
): Date => atTime(addDays(now, 1), morningTime.hour, morningTime.minute);
