import { getDatabase } from '@/lib/db';
import { notificationService } from './notification.service';
import { useSettingsStore } from '@/stores/settings-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { differenceInDays } from 'date-fns';

type StaleContact = {
  id: string;
  first_name: string;
  last_name: string | null;
  last_contact_at: string;
};

type PostEventHotTopic = {
  id: string;
  title: string;
  contact_id: string;
  first_name: string;
  last_name: string | null;
};

type CountResult = {
  count: number;
};

export const reminderService = {
  scheduleNotSeenReminders: async () => {
    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;

    if (thresholdDays === 0) return;

    const db = await getDatabase();

    const staleContacts = await db.getAllAsync<StaleContact>(
      `SELECT id, first_name, last_name, last_contact_at FROM contacts
       WHERE last_contact_at IS NOT NULL
         AND (reminder_frequency_days IS NULL OR reminder_frequency_days != -1)
         AND (
           (reminder_frequency_days IS NOT NULL AND julianday('now') - julianday(last_contact_at) > reminder_frequency_days)
           OR (reminder_frequency_days IS NULL AND julianday('now') - julianday(last_contact_at) > ?)
         )
       ORDER BY last_contact_at ASC LIMIT 5`,
      [thresholdDays]
    );

    for (const contact of staleContacts) {
      const daysSince = differenceInDays(new Date(), new Date(contact.last_contact_at));
      const contactName = contact.last_name
        ? `${contact.first_name} ${contact.last_name}`
        : contact.first_name;

      await notificationService.scheduleNotSeenReminder(
        contact.id,
        contactName,
        daysSince
      );
    }
  },

  scheduleWeeklyDigest: async () => {
    const { isPremium } = useSubscriptionStore.getState();
    if (!isPremium) return;

    const db = await getDatabase();

    const eventsResult = await db.getFirstAsync<CountResult>(
      `SELECT COUNT(*) as count FROM hot_topics
       WHERE status = 'active'
         AND event_date IS NOT NULL
         AND date(event_date) BETWEEN date('now') AND date('now', '+7 days')`
    );

    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;
    const staleResult = await db.getFirstAsync<CountResult>(
      `SELECT COUNT(*) as count FROM contacts
       WHERE last_contact_at IS NOT NULL
         AND (reminder_frequency_days IS NULL OR reminder_frequency_days != -1)
         AND (
           (reminder_frequency_days IS NOT NULL AND julianday('now') - julianday(last_contact_at) > reminder_frequency_days)
           OR (reminder_frequency_days IS NULL AND julianday('now') - julianday(last_contact_at) > ?)
         )`,
      [thresholdDays || 30]
    );

    const eventsCount = eventsResult?.count ?? 0;
    const staleCount = staleResult?.count ?? 0;

    if (eventsCount === 0 && staleCount === 0) return;

    await notificationService.scheduleWeeklyDigest(eventsCount, staleCount);
  },

  schedulePostEventFollowUps: async () => {
    const { isPremium } = useSubscriptionStore.getState();
    if (!isPremium) return;

    const db = await getDatabase();

    const hotTopics = await db.getAllAsync<PostEventHotTopic>(
      `SELECT ht.id, ht.title, ht.contact_id, c.first_name, c.last_name
       FROM hot_topics ht
       JOIN contacts c ON c.id = ht.contact_id
       WHERE ht.status = 'active'
         AND ht.event_date IS NOT NULL
         AND date(ht.event_date) BETWEEN date('now', '-4 days') AND date('now', '-1 day')
         AND ht.notified_at IS NULL
         AND ht.birthday_contact_id IS NULL
       LIMIT 3`
    );

    for (const hotTopic of hotTopics) {
      const contactName = hotTopic.last_name
        ? `${hotTopic.first_name} ${hotTopic.last_name}`
        : hotTopic.first_name;

      await notificationService.schedulePostEventFollowUp(
        hotTopic.contact_id,
        hotTopic.id,
        hotTopic.title,
        contactName
      );

      await db.runAsync(
        `UPDATE hot_topics SET notified_at = datetime('now') WHERE id = ?`,
        [hotTopic.id]
      );
    }
  },
};
