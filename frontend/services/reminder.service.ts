import { getDatabase } from '@/lib/db';
import { notificationService } from './notification.service';
import { useSettingsStore } from '@/stores/settings-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';
import {
  buildStaleContactReminderFilter,
  CONTACT_REMINDER_NEVER_DAYS,
  getEffectiveReminderFrequencyDays,
} from '@/lib/reminder-frequency';

type StaleContact = {
  id: string;
  first_name: string;
  last_name: string | null;
  last_contact_at: string;
};

type ContactReminderCandidate = StaleContact & {
  reminder_frequency_days: number | null;
};

type PostEventHotTopic = {
  id: string;
  title: string;
  contact_id: string;
  first_name: string;
  last_name: string | null;
};

type UpcomingDatedHotTopic = {
  id: string;
  title: string;
  event_date: string;
  birthday_contact_id: string | null;
  first_name: string;
  last_name: string | null;
};

const EVENT_RESCHEDULE_LIMIT = 15;

type CountResult = {
  count: number;
};

type ScheduleOptions = {
  requestPermission?: boolean;
};

export const reminderService = {
  scheduleNotSeenReminders: async (options: ScheduleOptions = {}) => {
    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;
    const db = await getDatabase();
    const staleFilter = buildStaleContactReminderFilter(thresholdDays);

    await notificationService.cancelNotSeenReminders();

    const staleContacts = await db.getAllAsync<StaleContact>(
      `SELECT id, first_name, last_name, last_contact_at FROM contacts
       WHERE last_contact_at IS NOT NULL
         AND ${staleFilter.whereSql}
       ORDER BY last_contact_at ASC LIMIT 5`,
      staleFilter.params
    );

    for (const contact of staleContacts) {
      const daysSince = differenceInDays(new Date(), new Date(contact.last_contact_at));
      const contactName = contact.last_name
        ? `${contact.first_name} ${contact.last_name}`
        : contact.first_name;

      await notificationService.scheduleNotSeenReminder(
        contact.id,
        contactName,
        daysSince,
        options
      );
    }
  },

  rescheduleEventReminders: async (options: ScheduleOptions = {}) => {
    const db = await getDatabase();
    await notificationService.cancelAllEventReminders();

    const todayLocal = format(new Date(), 'yyyy-MM-dd');
    const upcomingTopics = await db.getAllAsync<UpcomingDatedHotTopic>(
      `SELECT ht.id, ht.title, ht.event_date, ht.birthday_contact_id, c.first_name, c.last_name
       FROM hot_topics ht
       JOIN contacts c ON c.id = ht.contact_id
       WHERE ht.status = 'active'
         AND ht.event_date IS NOT NULL
         AND date(ht.event_date) >= ?
         AND ht.deleted_at IS NULL
         AND c.deleted_at IS NULL
       ORDER BY ht.event_date ASC
       LIMIT ${EVENT_RESCHEDULE_LIMIT}`,
      [todayLocal]
    );

    for (const topic of upcomingTopics) {
      const contactName = topic.last_name
        ? `${topic.first_name} ${topic.last_name}`
        : topic.first_name;

      await notificationService.scheduleEventReminder(
        topic.id,
        topic.event_date,
        topic.title,
        contactName,
        options
      );

      if (topic.birthday_contact_id) {
        await notificationService.scheduleBirthdayWeekAheadReminder(
          topic.id,
          topic.event_date,
          topic.first_name,
          options
        );
      }
    }
  },

  rescheduleNotSeenReminderForContact: async (contactId: string, options: ScheduleOptions = {}) => {
    const db = await getDatabase();
    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;

    await notificationService.cancelNotSeenReminders(contactId);

    const contact = await db.getFirstAsync<ContactReminderCandidate>(
      `SELECT id, first_name, last_name, last_contact_at, reminder_frequency_days
       FROM contacts
       WHERE id = ? AND last_contact_at IS NOT NULL`,
      [contactId]
    );

    if (!contact) return;

    const effectiveFrequencyDays = getEffectiveReminderFrequencyDays(
      contact.reminder_frequency_days,
      thresholdDays
    );

    if (effectiveFrequencyDays === CONTACT_REMINDER_NEVER_DAYS) return;

    const daysSince = differenceInDays(new Date(), new Date(contact.last_contact_at));
    if (daysSince < effectiveFrequencyDays) return;

    const contactName = contact.last_name
      ? `${contact.first_name} ${contact.last_name}`
      : contact.first_name;

    await notificationService.scheduleNotSeenReminder(
      contact.id,
      contactName,
      daysSince,
      options
    );
  },

  scheduleWeeklyDigest: async (options: ScheduleOptions = {}) => {
    const { isPremium } = useSubscriptionStore.getState();
    if (!isPremium) {
      await notificationService.cancelRemindersByType('weekly_digest');
      return;
    }

    const { weeklyDigestEnabled } = useSettingsStore.getState();
    if (!weeklyDigestEnabled) {
      await notificationService.cancelRemindersByType('weekly_digest');
      return;
    }

    const db = await getDatabase();
    const today = startOfDay(new Date());
    const digestWindowStart = format(today, 'yyyy-MM-dd');
    const digestWindowEnd = format(addDays(today, 8), 'yyyy-MM-dd');

    const eventsResult = await db.getFirstAsync<CountResult>(
      `SELECT COUNT(*) as count FROM hot_topics
       WHERE status = 'active'
         AND event_date IS NOT NULL
         AND date(event_date) >= ?
         AND date(event_date) < ?`,
      [digestWindowStart, digestWindowEnd]
    );

    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;
    const staleFilter = buildStaleContactReminderFilter(thresholdDays);
    const staleResult = await db.getFirstAsync<CountResult>(
      `SELECT COUNT(*) as count FROM contacts
       WHERE last_contact_at IS NOT NULL
         AND ${staleFilter.whereSql}`,
      staleFilter.params
    );

    const eventsCount = eventsResult?.count ?? 0;
    const staleCount = staleResult?.count ?? 0;

    if (eventsCount === 0 && staleCount === 0) {
      await notificationService.cancelRemindersByType('weekly_digest');
      return;
    }

    await notificationService.scheduleWeeklyDigest(eventsCount, staleCount, options);
  },

  cancelWeeklyDigest: async () => {
    await notificationService.cancelRemindersByType('weekly_digest');
  },

  schedulePostEventFollowUps: async (options: ScheduleOptions = {}) => {
    const { isPremium } = useSubscriptionStore.getState();
    if (!isPremium) {
      await notificationService.cancelRemindersByType('post_event');
      return;
    }

    const { postEventFollowUpEnabled } = useSettingsStore.getState();
    if (!postEventFollowUpEnabled) {
      await notificationService.cancelRemindersByType('post_event');
      return;
    }

    const db = await getDatabase();
    const today = startOfDay(new Date());
    const followUpWindowStart = format(addDays(today, -4), 'yyyy-MM-dd');
    const followUpWindowEnd = format(today, 'yyyy-MM-dd');

    const hotTopics = await db.getAllAsync<PostEventHotTopic>(
      `SELECT ht.id, ht.title, ht.contact_id, c.first_name, c.last_name
       FROM hot_topics ht
       JOIN contacts c ON c.id = ht.contact_id
       WHERE ht.status = 'active'
         AND ht.event_date IS NOT NULL
         AND date(ht.event_date) >= ?
         AND date(ht.event_date) < ?
         AND ht.notified_at IS NULL
         AND ht.birthday_contact_id IS NULL
       LIMIT 3`,
      [followUpWindowStart, followUpWindowEnd]
    );

    for (const hotTopic of hotTopics) {
      const contactName = hotTopic.last_name
        ? `${hotTopic.first_name} ${hotTopic.last_name}`
        : hotTopic.first_name;

      const notificationId = await notificationService.schedulePostEventFollowUp(
        hotTopic.contact_id,
        hotTopic.id,
        hotTopic.title,
        contactName,
        options
      );

      if (!notificationId) continue;

      await db.runAsync(
        `UPDATE hot_topics SET notified_at = datetime('now') WHERE id = ?`,
        [hotTopic.id]
      );
    }
  },

  cancelPostEventFollowUps: async () => {
    const scheduledPostEvents = await notificationService.getScheduledReminderDataByType('post_event');
    const hotTopicIds = scheduledPostEvents
      .map((data) => data.hotTopicId)
      .filter((hotTopicId): hotTopicId is string => typeof hotTopicId === 'string' && hotTopicId.length > 0);

    await notificationService.cancelRemindersByType('post_event');

    if (hotTopicIds.length === 0) return;

    const db = await getDatabase();
    const placeholders = hotTopicIds.map(() => '?').join(', ');
    await db.runAsync(
      `UPDATE hot_topics SET notified_at = NULL WHERE id IN (${placeholders})`,
      hotTopicIds
    );
  },
};
