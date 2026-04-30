import { addDays, isAfter, isBefore, nextMonday, set } from 'date-fns';

export type DateNotificationTrigger = {
  type: 'date';
  date: Date;
};

const atTime = (date: Date, hour: number, minute: number): Date =>
  set(date, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });

export const buildDateNotificationTrigger = (date: Date): DateNotificationTrigger => ({
  type: 'date',
  date,
});

export const getEventReminderTriggerDate = (
  eventDate: string,
  now: Date = new Date()
): Date | null => {
  const eventDateObj = new Date(eventDate);
  const triggerDate = atTime(addDays(eventDateObj, -1), 19, 0);

  if (isBefore(triggerDate, now)) return null;

  return triggerDate;
};

export const getNotSeenReminderTriggerDate = (now: Date = new Date()): Date =>
  atTime(addDays(now, 1), 10, 0);

export const getWeeklyDigestTriggerDate = (now: Date = new Date()): Date => {
  const todayAtNine = atTime(now, 9, 0);
  const isMonday = now.getDay() === 1;

  if (isMonday && !isAfter(now, todayAtNine)) {
    return todayAtNine;
  }

  return atTime(nextMonday(now), 9, 0);
};

export const getPostEventFollowUpTriggerDate = (now: Date = new Date()): Date =>
  atTime(addDays(now, 1), 10, 0);
