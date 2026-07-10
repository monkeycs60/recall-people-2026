import type { HotTopic } from '@/types';

export type RespondingToTopic = {
  id: string;
  title: string;
  eventDate?: string | null;
};

export function getRecordingHotTopics(
  activeHotTopics: HotTopic[],
  preselectedHotTopicId: string | null
): HotTopic[] {
  if (!preselectedHotTopicId) return activeHotTopics;

  const focusedTopic = activeHotTopics.find((topic) => topic.id === preselectedHotTopicId);
  return focusedTopic ? [focusedTopic] : activeHotTopics;
}

export function getRespondingToTopic(
  activeHotTopics: HotTopic[],
  preselectedHotTopicId: string | null
): RespondingToTopic | undefined {
  if (!preselectedHotTopicId) return undefined;

  const focusedTopic = activeHotTopics.find((topic) => topic.id === preselectedHotTopicId);
  if (!focusedTopic) return undefined;

  return {
    id: focusedTopic.id,
    title: focusedTopic.title,
    eventDate: focusedTopic.eventDate ? focusedTopic.eventDate.slice(0, 10) : focusedTopic.eventDate,
  };
}
