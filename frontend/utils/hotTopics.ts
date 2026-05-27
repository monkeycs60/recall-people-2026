import type { HotTopic } from '@/types';

const getTime = (value?: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getStartOfDayTime = (date: Date): number => (
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
);

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
