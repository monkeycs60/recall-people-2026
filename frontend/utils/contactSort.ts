import type { Contact, HotTopic } from '@/types';

export const CONTACT_SORT_MODES = [
  'recent-contact',
  'next-deadline',
  'upcoming-birthday',
  'overdue',
  'alphabetical',
] as const;

export type ContactSortMode = typeof CONTACT_SORT_MODES[number];

export const CONTACT_SORT_DEFAULT_MODE: ContactSortMode = 'recent-contact';

type ContactPreview = {
  hotTopics: HotTopic[];
};

const MISSING_TIME = Number.POSITIVE_INFINITY;

function getTime(value?: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function getStartOfDayTime(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function displayName(contact: Contact): string {
  return `${contact.firstName} ${contact.lastName ?? ''}`.trim().toLocaleLowerCase();
}

function compareByName(first: Contact, second: Contact): number {
  return displayName(first).localeCompare(displayName(second));
}

function compareByRecentInteraction(first: Contact, second: Contact): number {
  const firstTime = getTime(first.lastContactAt) ?? 0;
  const secondTime = getTime(second.lastContactAt) ?? 0;
  if (firstTime !== secondTime) return secondTime - firstTime;
  return compareByName(first, second);
}

function getActiveTopics(contact: Contact, previews: Map<string, ContactPreview>): HotTopic[] {
  return (previews.get(contact.id)?.hotTopics ?? []).filter((topic) => topic.status === 'active');
}

function getNearestFutureTopicTime(
  contact: Contact,
  previews: Map<string, ContactPreview>,
  now: Date
): number {
  const todayTime = getStartOfDayTime(now);
  const times = getActiveTopics(contact, previews)
    .map((topic) => getTime(topic.eventDate) ?? null)
    .filter((time): time is number => time !== null && getStartOfDayTime(new Date(time)) >= todayTime);

  return times.length > 0 ? Math.min(...times) : MISSING_TIME;
}

function getOldestOverdueTopicTime(
  contact: Contact,
  previews: Map<string, ContactPreview>,
  now: Date
): number {
  const todayTime = getStartOfDayTime(now);
  const times = getActiveTopics(contact, previews)
    .map((topic) => getTime(topic.eventDate) ?? null)
    .filter((time): time is number => time !== null && getStartOfDayTime(new Date(time)) < todayTime);

  return times.length > 0 ? Math.min(...times) : MISSING_TIME;
}

function getNextBirthdayTime(contact: Contact, previews: Map<string, ContactPreview>, now: Date): number {
  const birthdayTopicTimes = getActiveTopics(contact, previews)
    .filter((topic) => Boolean(topic.birthdayContactId))
    .map((topic) => getTime(topic.eventDate) ?? null)
    .filter((time): time is number => time !== null);

  if (birthdayTopicTimes.length > 0) {
    return Math.min(...birthdayTopicTimes);
  }

  if (!contact.birthdayDay || !contact.birthdayMonth) {
    return MISSING_TIME;
  }

  const todayTime = getStartOfDayTime(now);
  const birthday = new Date(now.getFullYear(), contact.birthdayMonth - 1, contact.birthdayDay);
  if (getStartOfDayTime(birthday) < todayTime) {
    birthday.setFullYear(now.getFullYear() + 1);
  }

  return birthday.getTime();
}

function compareOptionalAscending(firstTime: number, secondTime: number): number | null {
  if (firstTime !== MISSING_TIME && secondTime !== MISSING_TIME && firstTime !== secondTime) {
    return firstTime - secondTime;
  }
  if (firstTime !== MISSING_TIME && secondTime === MISSING_TIME) return -1;
  if (firstTime === MISSING_TIME && secondTime !== MISSING_TIME) return 1;
  return null;
}

export function isContactSortMode(value: unknown): value is ContactSortMode {
  return typeof value === 'string' && CONTACT_SORT_MODES.includes(value as ContactSortMode);
}

export function sortContacts(
  contacts: Contact[],
  previews: Map<string, ContactPreview>,
  mode: ContactSortMode = CONTACT_SORT_DEFAULT_MODE,
  now = new Date()
): Contact[] {
  return contacts.slice().sort((first, second) => {
    if (mode === 'alphabetical') {
      return compareByName(first, second);
    }

    if (mode === 'next-deadline') {
      const result = compareOptionalAscending(
        getNearestFutureTopicTime(first, previews, now),
        getNearestFutureTopicTime(second, previews, now)
      );
      return result ?? compareByRecentInteraction(first, second);
    }

    if (mode === 'upcoming-birthday') {
      const result = compareOptionalAscending(
        getNextBirthdayTime(first, previews, now),
        getNextBirthdayTime(second, previews, now)
      );
      return result ?? compareByRecentInteraction(first, second);
    }

    if (mode === 'overdue') {
      const result = compareOptionalAscending(
        getOldestOverdueTopicTime(first, previews, now),
        getOldestOverdueTopicTime(second, previews, now)
      );
      return result ?? compareByRecentInteraction(first, second);
    }

    return compareByRecentInteraction(first, second);
  });
}
