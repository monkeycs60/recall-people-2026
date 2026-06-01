import type { Contact, HotTopic } from '@/types';
import { filterToNextBirthdayTopic } from '@/utils/hotTopics';

type ContactWithTimeline = Pick<Contact, 'id' | 'firstName' | 'birthdayDay' | 'birthdayMonth' | 'birthdayYear'> & {
  hotTopics: HotTopic[];
};

export type ContactLifeTimelineEntry = {
  id: string;
  title: string;
  context?: string;
  resolution?: string;
  date: Date;
  isBirthday: boolean;
  isSyntheticBirthday: boolean;
  timelineStatus: 'active' | 'resolved';
};

export type ContactLifeTimelineSections = {
  resolved: ContactLifeTimelineEntry[];
  upcoming: ContactLifeTimelineEntry[];
};

const getStartOfDayTime = (date: Date): number => (
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
);

const parseTimelineDate = (value?: string): Date | null => {
  if (!value) return null;
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const sortByDateAsc = (
  first: ContactLifeTimelineEntry,
  second: ContactLifeTimelineEntry
): number => first.date.getTime() - second.date.getTime();

function getNextBirthdayDate(
  birthdayDay: number,
  birthdayMonth: number,
  now: Date
): Date {
  const todayTime = getStartOfDayTime(now);
  const birthday = new Date(now.getFullYear(), birthdayMonth - 1, birthdayDay);

  if (getStartOfDayTime(birthday) < todayTime) {
    birthday.setFullYear(now.getFullYear() + 1);
  }

  return birthday;
}

export function getContactLifeTimelineSections(
  contact: ContactWithTimeline,
  now = new Date()
): ContactLifeTimelineSections {
  const todayTime = getStartOfDayTime(now);

  const resolved = contact.hotTopics
    .filter((topic) => topic.status === 'resolved')
    .map((topic): ContactLifeTimelineEntry | null => {
      const date = parseTimelineDate(topic.resolvedAt) ?? parseTimelineDate(topic.eventDate);
      if (!date) return null;

      return {
        id: topic.id,
        title: topic.title,
        context: topic.context,
        resolution: topic.resolution,
        date,
        isBirthday: Boolean(topic.birthdayContactId),
        isSyntheticBirthday: false,
        timelineStatus: 'resolved',
      };
    })
    .filter((entry): entry is ContactLifeTimelineEntry => entry !== null)
    .sort(sortByDateAsc);

  const upcoming = filterToNextBirthdayTopic(contact.hotTopics)
    .filter((topic) => topic.status === 'active' && Boolean(topic.eventDate))
    .map((topic): ContactLifeTimelineEntry | null => {
      const date = parseTimelineDate(topic.eventDate);
      if (!date || getStartOfDayTime(date) < todayTime) return null;

      return {
        id: topic.id,
        title: topic.title,
        context: topic.context,
        date,
        isBirthday: Boolean(topic.birthdayContactId),
        isSyntheticBirthday: false,
        timelineStatus: 'active',
      };
    })
    .filter((entry): entry is ContactLifeTimelineEntry => entry !== null)
    .sort(sortByDateAsc);

  const hasBirthdayHotTopic = upcoming.some((entry) => entry.isBirthday);
  if (contact.birthdayDay && contact.birthdayMonth && !hasBirthdayHotTopic) {
    upcoming.push({
      id: `birthday-${contact.id}`,
      title: `${contact.firstName}'s birthday`,
      date: getNextBirthdayDate(contact.birthdayDay, contact.birthdayMonth, now),
      isBirthday: true,
      isSyntheticBirthday: true,
      timelineStatus: 'active',
    });
    upcoming.sort(sortByDateAsc);
  }

  return { resolved, upcoming };
}
