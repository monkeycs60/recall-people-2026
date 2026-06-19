import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';
import {
  getEventReminderTriggerDate,
  getNotSeenReminderTriggerDate,
  getPostEventFollowUpTriggerDate,
  getWeeklyDigestTriggerDate,
} from '@/lib/notification-schedule';

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

  hasPermissions: async (): Promise<boolean> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  scheduleCaptureDemoNotification: async (): Promise<string | null> => {
    const hasPermission = await notificationService.requestPermissions();
    if (!hasPermission) return null;

    const channelId = 'capture-demo-reminders-v1';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: 'Capture demo reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const demoNotifications = [
      {
        title: 'Maya Brooks',
        body: 'Her solar startup launches tomorrow — send a good luck note.',
      },
      {
        title: 'Leo Bennett',
        body: 'How did the FormFlow investor demo go? Time to follow up.',
      },
      {
        title: 'Sofia Garcia',
        body: "It's been 3 weeks — reconnect before her gallery opening.",
      },
    ];

    const identifiers = await Promise.all(
      demoNotifications.map((demoNotification, index) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: demoNotification.title,
            body: demoNotification.body,
            sound: 'default',
            data: { type: 'capture_demo' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2 + index,
            channelId,
          },
        })
      )
    );

    return identifiers[identifiers.length - 1] ?? null;
  },

  scheduleEventReminder: async (
    eventId: string,
    eventDate: string,
    title: string,
    contactName: string,
    options: { requestPermission?: boolean } = {}
  ): Promise<string | null> => {
    const hasPermission = options.requestPermission === false
      ? await notificationService.hasPermissions()
      : await notificationService.requestPermissions();
    if (!hasPermission) return null;

    const triggerDate = getEventReminderTriggerDate(eventDate);
    if (!triggerDate) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: contactName,
        body: i18n.t('reminder.eventTomorrow', { title }),
        data: { eventId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return identifier;
  },

  cancelEventReminder: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  cancelEventRemindersByEventId: async (eventId: string): Promise<void> => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const eventReminders = scheduledNotifications.filter(
      (notification) => notification.content.data?.eventId === eventId
    );

    await Promise.all(
      eventReminders.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
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

  getScheduledReminderDataByType: async (type: string): Promise<Record<string, unknown>[]> => {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    return scheduledNotifications
      .filter((notification) => notification.content.data?.type === type)
      .map((notification) => notification.content.data);
  },

  scheduleNotSeenReminder: async (
    contactId: string,
    contactName: string,
    daysSince: number,
    options: { requestPermission?: boolean } = {}
  ): Promise<string | null> => {
    const hasPermission = options.requestPermission === false
      ? await notificationService.hasPermissions()
      : await notificationService.requestPermissions();
    if (!hasPermission) return null;

    const triggerDate = getNotSeenReminderTriggerDate();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: contactName,
        body: i18n.t('reminder.notSeen', { count: daysSince }),
        data: { contactId, type: 'not_seen' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return identifier;
  },

  scheduleWeeklyDigest: async (
    eventsCount: number,
    staleCount: number,
    options: { requestPermission?: boolean } = {}
  ): Promise<string | null> => {
    const hasPermission = options.requestPermission === false
      ? await notificationService.hasPermissions()
      : await notificationService.requestPermissions();
    if (!hasPermission) return null;

    await notificationService.cancelRemindersByType('weekly_digest');

    const triggerDate = getWeeklyDigestTriggerDate();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('digest.title'),
        body: i18n.t('digest.body', { events: eventsCount, contacts: staleCount }),
        data: { type: 'weekly_digest', screen: 'upcoming' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return identifier;
  },

  schedulePostEventFollowUp: async (
    contactId: string,
    hotTopicId: string,
    title: string,
    contactName: string,
    options: { requestPermission?: boolean } = {}
  ): Promise<string | null> => {
    const hasPermission = options.requestPermission === false
      ? await notificationService.hasPermissions()
      : await notificationService.requestPermissions();
    if (!hasPermission) return null;

    const triggerDate = getPostEventFollowUpTriggerDate();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: contactName,
        body: i18n.t('reminder.postEvent', { title }),
        data: { contactId, hotTopicId, type: 'post_event' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return identifier;
  },

  cancelAllReminders: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  setupNotificationListener: (onNotificationTap: (data: Record<string, unknown>) => void): (() => void) => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
      const data = response.notification.request.content.data;

      onNotificationTap(data);
    });

    return () => subscription.remove();
  },
};
