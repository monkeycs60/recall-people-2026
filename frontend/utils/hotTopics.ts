import type { HotTopic } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

const getTime = (value?: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getStartOfDayTime = (date: Date): number => (
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
);

export type HotTopicDateToneName = 'urgent' | 'soon' | 'scheduled' | 'distant' | 'unknown';

export type HotTopicDateTone = {
  name: HotTopicDateToneName;
  backgroundColor: string;
  textColor: string;
  iconBackgroundColor: string;
  iconColor: string;
  dateBackgroundColor: string;
  dateTextColor: string;
};

const hotTopicDateTones: Record<HotTopicDateToneName, HotTopicDateTone> = {
  urgent: {
    name: 'urgent',
    backgroundColor: '#EF4444',
    textColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.22)',
    iconColor: '#FFFFFF',
    dateBackgroundColor: 'rgba(255,255,255,0.22)',
    dateTextColor: '#FFFFFF',
  },
  soon: {
    name: 'soon',
    backgroundColor: '#FF6B4A',
    textColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.24)',
    iconColor: '#FFFFFF',
    dateBackgroundColor: 'rgba(255,255,255,0.24)',
    dateTextColor: '#FFFFFF',
  },
  scheduled: {
    name: 'scheduled',
    backgroundColor: '#F5A623',
    textColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.24)',
    iconColor: '#FFFFFF',
    dateBackgroundColor: 'rgba(255,255,255,0.24)',
    dateTextColor: '#FFFFFF',
  },
  distant: {
    name: 'distant',
    backgroundColor: '#3B82F6',
    textColor: '#FFFFFF',
    iconBackgroundColor: 'rgba(255,255,255,0.22)',
    iconColor: '#FFFFFF',
    dateBackgroundColor: 'rgba(255,255,255,0.22)',
    dateTextColor: '#FFFFFF',
  },
  unknown: {
    name: 'unknown',
    backgroundColor: '#EDEAF4',
    textColor: '#6D6880',
    iconBackgroundColor: '#F8F6FC',
    iconColor: '#8E8AA3',
    dateBackgroundColor: '#F8F6FC',
    dateTextColor: '#8E8AA3',
  },
};

export function isHotTopicOverdue(eventDate?: string, now = new Date()): boolean {
  const eventTime = getTime(eventDate);
  if (eventTime === null) return false;

  return getStartOfDayTime(new Date(eventTime)) < getStartOfDayTime(now);
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
  const eventTime = getTime(eventDate);
  if (eventTime === null) return hotTopicDateTones.unknown;

  const daysUntilEvent = Math.floor(
    (getStartOfDayTime(new Date(eventTime)) - getStartOfDayTime(now)) / DAY_MS
  );

  if (daysUntilEvent < 0) return hotTopicDateTones.urgent;
  if (daysUntilEvent <= 7) return hotTopicDateTones.soon;
  if (daysUntilEvent <= 30) return hotTopicDateTones.scheduled;
  return hotTopicDateTones.distant;
}

export function sortHotTopicsByEventDateDesc<T extends Pick<HotTopic, 'eventDate' | 'updatedAt' | 'createdAt'>>(
  hotTopics: T[]
): T[] {
  return hotTopics.slice().sort((first, second) => {
    const firstEventTime = getTime(first.eventDate);
    const secondEventTime = getTime(second.eventDate);

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

export function filterToNextBirthdayTopic<T extends Pick<HotTopic, 'birthdayContactId' | 'eventDate'>>(
  hotTopics: T[],
  now = new Date()
): T[] {
  const todayTime = getStartOfDayTime(now);
  const birthdayTopicByContact = new Map<string, { topic: T; time: number }>();

  for (const topic of hotTopics) {
    if (!topic.birthdayContactId || !topic.eventDate) continue;

    const eventDate = new Date(topic.eventDate);
    if (!Number.isFinite(eventDate.getTime())) continue;

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
