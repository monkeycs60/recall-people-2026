import type { HotTopic } from '@/types';

const getTime = (value?: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

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
