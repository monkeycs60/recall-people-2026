import type { HotTopic } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const getTime = (value?: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getStartOfDayTime = (date: Date): number => (
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
);

export function parseHotTopicDate(value?: string): Date | null {
  if (!value) return null;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export type HotTopicDateToneName =
  | 'overdue'
  | 'imminent'
  | 'thisWeek'
  | 'thisMonth'
  | 'thisQuarter'
  | 'later'
  | 'undated';

export type HotTopicDateTone = {
  name: HotTopicDateToneName;
  accentColor: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  dateBackgroundColor: string;
  dateTextColor: string;
};

const neutralChipBackground = '#FFFFFF';

const hotTopicDateTones: Record<HotTopicDateToneName, HotTopicDateTone> = {
  overdue: {
    name: 'overdue',
    accentColor: '#D9483B',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(217,72,59,0.18)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#D9483B',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#D9483B',
  },
  imminent: {
    name: 'imminent',
    accentColor: '#F05A3C',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(240,90,60,0.18)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#F05A3C',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#F05A3C',
  },
  thisWeek: {
    name: 'thisWeek',
    accentColor: '#CF8A12',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(207,138,18,0.20)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#CF8A12',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#CF8A12',
  },
  thisMonth: {
    name: 'thisMonth',
    accentColor: '#3478C8',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(52,120,200,0.18)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#3478C8',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#3478C8',
  },
  thisQuarter: {
    name: 'thisQuarter',
    accentColor: '#5A86D9',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(90,134,217,0.18)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#5A86D9',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#5A86D9',
  },
  later: {
    name: 'later',
    accentColor: '#9AA1B5',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(154,161,181,0.22)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#9AA1B5',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#8E8AA3',
  },
  undated: {
    name: 'undated',
    accentColor: '#8E8AA3',
    backgroundColor: neutralChipBackground,
    borderColor: 'rgba(142,138,163,0.20)',
    textColor: '#1D1A2E',
    iconBackgroundColor: 'transparent',
    iconColor: '#8E8AA3',
    dateBackgroundColor: 'transparent',
    dateTextColor: '#8E8AA3',
  },
};

export function isHotTopicOverdue(eventDate?: string, now = new Date()): boolean {
  const eventDateValue = parseHotTopicDate(eventDate);
  if (!eventDateValue) return false;

  return getStartOfDayTime(eventDateValue) < getStartOfDayTime(now);
}

export function isHotTopicTodayOrFuture(eventDate?: string, now = new Date()): boolean {
  const eventDateValue = parseHotTopicDate(eventDate);
  if (!eventDateValue) return false;

  return getStartOfDayTime(eventDateValue) >= getStartOfDayTime(now);
}

export function countOverdueHotTopics<T extends Pick<HotTopic, 'eventDate' | 'status'>>(
  hotTopics: T[],
  now = new Date()
): number {
  return hotTopics.filter((topic) =>
    topic.status === 'active' && isHotTopicOverdue(topic.eventDate, now)
  ).length;
}

export function getHotTopicDateTone(eventDate?: string, now = new Date()): HotTopicDateTone {
  const eventDateValue = parseHotTopicDate(eventDate);
  if (!eventDateValue) return hotTopicDateTones.undated;

  const hoursUntilEvent = (
    getStartOfDayTime(eventDateValue) - getStartOfDayTime(now)
  ) / HOUR_MS;

  if (hoursUntilEvent < 0) return hotTopicDateTones.overdue;
  if (hoursUntilEvent <= 48) return hotTopicDateTones.imminent;
  if (hoursUntilEvent <= 7 * 24) return hotTopicDateTones.thisWeek;
  if (hoursUntilEvent <= 30 * 24) return hotTopicDateTones.thisMonth;
  if (hoursUntilEvent <= 90 * 24) return hotTopicDateTones.thisQuarter;
  return hotTopicDateTones.later;
}

export function sortHotTopicsByEventDateDesc<T extends Pick<HotTopic, 'eventDate' | 'updatedAt' | 'createdAt'>>(
  hotTopics: T[]
): T[] {
  return hotTopics.slice().sort((first, second) => {
    const firstEventTime = parseHotTopicDate(first.eventDate)?.getTime() ?? null;
    const secondEventTime = parseHotTopicDate(second.eventDate)?.getTime() ?? null;

    if (firstEventTime !== null && secondEventTime !== null && firstEventTime !== secondEventTime) {
      return secondEventTime - firstEventTime;
    }
    if (firstEventTime !== null && secondEventTime === null) return -1;
    if (firstEventTime === null && secondEventTime !== null) return 1;

    const firstUpdatedTime = getTime(first.updatedAt) ?? getTime(first.createdAt) ?? 0;
    const secondUpdatedTime = getTime(second.updatedAt) ?? getTime(second.createdAt) ?? 0;
    return secondUpdatedTime - firstUpdatedTime;
  });
}

export type PastUnresolvedTopic = {
  id: string;
  title: string;
  eventDate: string;
  daysPast: number;
  isStale: boolean;
};

const STALE_THRESHOLD_DAYS = 14;

export function getPastUnresolvedHotTopics(
  hotTopics: HotTopic[],
  now: Date = new Date()
): PastUnresolvedTopic[] {
  const nowStartOfDay = getStartOfDayTime(now);

  return hotTopics
    .filter((topic) =>
      topic.status === 'active' &&
      Boolean(topic.eventDate) &&
      !topic.birthdayContactId &&
      isHotTopicOverdue(topic.eventDate, now)
    )
    .map((topic) => {
      const eventDateValue = parseHotTopicDate(topic.eventDate)!;
      const daysPast = Math.round((nowStartOfDay - getStartOfDayTime(eventDateValue)) / DAY_MS);
      return {
        id: topic.id,
        title: topic.title,
        eventDate: topic.eventDate!,
        daysPast,
        isStale: daysPast > STALE_THRESHOLD_DAYS,
      };
    })
    .sort((first, second) => first.daysPast - second.daysPast);
}

export function filterToNextBirthdayTopic<T extends Pick<HotTopic, 'birthdayContactId' | 'eventDate'>>(
  hotTopics: T[],
  now = new Date()
): T[] {
  const todayTime = getStartOfDayTime(now);
  const birthdayTopicByContact = new Map<string, { topic: T; time: number }>();

  for (const topic of hotTopics) {
    if (!topic.birthdayContactId || !topic.eventDate) continue;

    const eventDate = parseHotTopicDate(topic.eventDate);
    if (!eventDate) continue;

    const eventTime = getStartOfDayTime(eventDate);
    if (eventTime < todayTime) continue;

    const current = birthdayTopicByContact.get(topic.birthdayContactId);
    if (!current || eventTime < current.time) {
      birthdayTopicByContact.set(topic.birthdayContactId, { topic, time: eventTime });
    }
  }

  const birthdaysToKeep = new Set(
    Array.from(birthdayTopicByContact.values()).map(({ topic }) => topic)
  );

  return hotTopics.filter((topic) => !topic.birthdayContactId || birthdaysToKeep.has(topic));
}
