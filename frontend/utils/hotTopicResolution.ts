import type { HotTopic, ResolvedTopic } from '@/types';

export type ReviewResolutionTopic = HotTopic & {
  proposedResolution: string;
};

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return date;
}

export function validateResolutionDate(value: string, today = new Date()): boolean {
  const date = parseLocalDate(value);
  if (!date) return false;

  const selectedDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return selectedDay <= currentDay;
}

export function formatResolutionDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getResolutionValues(value = formatResolutionDate(new Date())): {
  eventDate: string;
  resolvedAt: string;
} {
  const date = parseLocalDate(value);
  if (!date) throw new Error('Invalid resolution date');
  return { eventDate: value, resolvedAt: date.toISOString() };
}

export function buildReviewResolutionTopics(
  topics: HotTopic[],
  resolutions: ResolvedTopic[]
): ReviewResolutionTopic[] {
  return topics
    .filter((topic) => topic.status === 'active')
    .map((topic) => ({
      ...topic,
      proposedResolution: resolutions.find(
        (resolution) => resolution.id === topic.id || resolution.existingTopicId === topic.id
      )?.resolution ?? '',
    }));
}
