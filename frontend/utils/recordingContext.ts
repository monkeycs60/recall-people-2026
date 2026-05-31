import type { HotTopic } from '@/types';

export function getRecordingHotTopics(
  activeHotTopics: HotTopic[],
  preselectedHotTopicId: string | null
): HotTopic[] {
  if (!preselectedHotTopicId) return activeHotTopics;

  const focusedTopic = activeHotTopics.find((topic) => topic.id === preselectedHotTopicId);
  return focusedTopic ? [focusedTopic] : activeHotTopics;
}
