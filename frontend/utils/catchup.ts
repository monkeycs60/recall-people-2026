import type { Contact, HotTopic } from '@/types';
import { isHotTopicOverdue } from '@/utils/hotTopics';

const DAY_MS = 24 * 60 * 60 * 1000;

type ContactPreview = {
  hotTopics: HotTopic[];
};

export type OverdueCatchupItem = {
  contact: Contact;
  topic: HotTopic;
  daysOverdue: number;
};

const startOfDayTime = (date: Date): number => (
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
);

function getDaysOverdue(eventDate: string, now: Date): number {
  const eventTime = new Date(eventDate).getTime();
  if (!Number.isFinite(eventTime)) return 0;
  return Math.max(0, Math.round((startOfDayTime(now) - startOfDayTime(new Date(eventTime))) / DAY_MS));
}

export function getOverdueCatchupItems(
  contacts: Contact[],
  previews: Map<string, ContactPreview>,
  now = new Date()
): OverdueCatchupItem[] {
  const items: OverdueCatchupItem[] = [];

  for (const contact of contacts) {
    const hotTopics = previews.get(contact.id)?.hotTopics ?? [];

    for (const topic of hotTopics) {
      if (topic.status !== 'active' || !topic.eventDate || !isHotTopicOverdue(topic.eventDate, now)) {
        continue;
      }

      items.push({
        contact,
        topic,
        daysOverdue: getDaysOverdue(topic.eventDate, now),
      });
    }
  }

  return items.sort((first, second) => {
    const firstEventTime = new Date(first.topic.eventDate!).getTime();
    const secondEventTime = new Date(second.topic.eventDate!).getTime();
    if (firstEventTime !== secondEventTime) return firstEventTime - secondEventTime;
    return first.contact.firstName.localeCompare(second.contact.firstName);
  });
}
