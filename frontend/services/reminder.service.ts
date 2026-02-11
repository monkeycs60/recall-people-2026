import { getDatabase } from '@/lib/db';
import { notificationService } from './notification.service';
import { useSettingsStore } from '@/stores/settings-store';
import { differenceInDays } from 'date-fns';

type StaleContact = {
  id: string;
  first_name: string;
  last_name: string | null;
  last_contact_at: string;
};

export const reminderService = {
  scheduleNotSeenReminders: async () => {
    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;

    if (thresholdDays === 0) return;

    const db = await getDatabase();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);
    const cutoffISO = cutoffDate.toISOString();

    const staleContacts = await db.getAllAsync<StaleContact>(
      `SELECT id, first_name, last_name, last_contact_at FROM contacts
       WHERE last_contact_at IS NOT NULL AND last_contact_at < ?
       ORDER BY last_contact_at ASC LIMIT 5`,
      [cutoffISO]
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
};
