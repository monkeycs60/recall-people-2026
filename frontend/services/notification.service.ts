import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { addDays, setHours, setMinutes, setSeconds, isBefore, nextMonday } from 'date-fns';
import i18n from '@/lib/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  scheduleEventReminder: async (
    eventId: string,
    eventDate: string,
    title: string,
    contactName: string
  ): Promise<string | null> => {
    const hasPermission = await notificationService.requestPermissions();
    if (!hasPermission) return null;

    const eventDateObj = new Date(eventDate);
    let triggerDate = addDays(eventDateObj, -1);
    triggerDate = setHours(triggerDate, 19);
    triggerDate = setMinutes(triggerDate, 0);
    triggerDate = setSeconds(triggerDate, 0);

    if (isBefore(triggerDate, new Date())) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recall People',
        body: `Demain : ${contactName} ${title}`,
        data: { eventId },
      },
      trigger: triggerDate,
    });

    return identifier;
  },

  cancelEventReminder: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  cancelNotSeenReminders: async (contactId?: string): Promise<void> => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const notSeenReminders = scheduledNotifications.filter((notification) => {
      const data = notification.content.data;
      return data?.type === 'not_seen' && (!contactId || data?.contactId === contactId);
    });

    await Promise.all(
      notSeenReminders.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
  },

  cancelRemindersByType: async (type: string): Promise<void> => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const matchingNotifications = scheduledNotifications.filter(
      (notification) => notification.content.data?.type === type
    );

    await Promise.all(
      matchingNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
  },

  scheduleNotSeenReminder: async (
    contactId: string,
    contactName: string,
    daysSince: number
  ): Promise<string | null> => {
    const hasPermission = await notificationService.requestPermissions();
    if (!hasPermission) return null;

    let triggerDate = addDays(new Date(), 1);
    triggerDate = setHours(triggerDate, 10);
    triggerDate = setMinutes(triggerDate, 0);
    triggerDate = setSeconds(triggerDate, 0);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recall People',
        body: `${contactName} — ${daysSince} jours sans nouvelles`,
        data: { contactId, type: 'not_seen' },
      },
      trigger: triggerDate,
    });

    return identifier;
  },

  scheduleWeeklyDigest: async (
    eventsCount: number,
    staleCount: number
  ): Promise<string | null> => {
    const hasPermission = await notificationService.requestPermissions();
    if (!hasPermission) return null;

    await notificationService.cancelRemindersByType('weekly_digest');

    let triggerDate = nextMonday(new Date());
    triggerDate = setHours(triggerDate, 9);
    triggerDate = setMinutes(triggerDate, 0);
    triggerDate = setSeconds(triggerDate, 0);

    if (isBefore(triggerDate, new Date())) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recall People',
        body: i18n.t('digest.body', { events: eventsCount, contacts: staleCount }),
        data: { type: 'weekly_digest' },
      },
      trigger: triggerDate,
    });

    return identifier;
  },

  schedulePostEventFollowUp: async (
    contactId: string,
    hotTopicId: string,
    title: string,
    contactName: string
  ): Promise<string | null> => {
    const hasPermission = await notificationService.requestPermissions();
    if (!hasPermission) return null;

    let triggerDate = addDays(new Date(), 1);
    triggerDate = setHours(triggerDate, 10);
    triggerDate = setMinutes(triggerDate, 0);
    triggerDate = setSeconds(triggerDate, 0);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recall People',
        body: i18n.t('reminder.postEvent', { title, name: contactName }),
        data: { contactId, hotTopicId, type: 'post_event' },
      },
      trigger: triggerDate,
    });

    return identifier;
  },

  cancelAllReminders: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  setupNotificationListener: (onNotificationTap: (data: { eventId?: string; contactId?: string }) => void): (() => void) => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
      const data = response.notification.request.content.data;
      const eventId = data?.eventId as string | undefined;
      const contactId = data?.contactId as string | undefined;

      if (eventId || contactId) {
        onNotificationTap({ eventId, contactId });
      }
    });

    return () => subscription.remove();
  },
};
