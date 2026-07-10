import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settings-store';
import {
  getEventReminderTriggerDate,
  getEventDayMorningTriggerDate,
  getBirthdayWeekAheadTriggerDate,
  getNextMorningOccurrence,
  getNotSeenReminderTriggerDate,
  getPostEventFollowUpTriggerDate,
  getWeeklyDigestTriggerDate,
  parseReminderTime,
  DEFAULT_EVENING_REMINDER_TIME,
  DEFAULT_MORNING_REMINDER_TIME,
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

export const EVENT_EVENING_CATEGORY = 'event_evening_reminder';
export const SNOOZE_TOMORROW_MORNING_ACTION = 'snooze_tomorrow_morning';

const getEveningTime = () =>
  parseReminderTime(useSettingsStore.getState().eveningReminderTime, DEFAULT_EVENING_REMINDER_TIME);
const getMorningTime = () =>
  parseReminderTime(useSettingsStore.getState().morningReminderTime, DEFAULT_MORNING_REMINDER_TIME);

export const notificationService = {
  registerNotificationCategories: async (): Promise<void> => {
    await Notifications.setNotificationCategoryAsync(EVENT_EVENING_CATEGORY, [
      {
        identifier: SNOOZE_TOMORROW_MORNING_ACTION,
        buttonTitle: i18n.t('reminder.snoozeTomorrowMorning'),
        options: { opensAppToForeground: false },
      },
    ]);
  },

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

    const now = new Date();
    const eveningTriggerDate = getEventReminderTriggerDate(eventDate, now, getEveningTime());
    const morningTriggerDate = getEventDayMorningTriggerDate(eventDate, now, getMorningTime());

    let eveningIdentifier: string | null = null;
    if (eveningTriggerDate) {
      eveningIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: contactName,
          body: i18n.t('reminder.eventTomorrow', { title }),
          categoryIdentifier: EVENT_EVENING_CATEGORY,
          data: { eventId, type: 'event_evening', title, contactName },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: eveningTriggerDate,
        },
      });
    }

    let morningIdentifier: string | null = null;
    if (morningTriggerDate) {
      morningIdentifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: contactName,
          body: i18n.t('reminder.eventToday', { title }),
          data: { eventId, type: 'event_morning' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morningTriggerDate,
        },
      });
    }

    return eveningIdentifier ?? morningIdentifier;
  },

  scheduleBirthdayWeekAheadReminder: async (
    eventId: string,
    eventDate: string,
    contactFirstName: string,
    options: { requestPermission?: boolean } = {}
  ): Promise<string | null> => {
    const hasPermission = options.requestPermission === false
      ? await notificationService.hasPermissions()
      : await notificationService.requestPermissions();
    if (!hasPermission) return null;

    const triggerDate = getBirthdayWeekAheadTriggerDate(eventDate, new Date(), getMorningTime());
    if (!triggerDate) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: contactFirstName,
        body: i18n.t('reminder.birthdayWeekAhead', { firstName: contactFirstName }),
        data: { eventId, type: 'birthday_week_ahead' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return identifier;
  },

  snoozeEventReminderToMorning: async (
    eventId: string,
    title: string,
    contactName: string
  ): Promise<void> => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const morningDuplicates = scheduled.filter(
      (notification) =>
        notification.content.data?.eventId === eventId &&
        notification.content.data?.type === 'event_morning'
    );
    await Promise.all(
      morningDuplicates.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: contactName,
        body: i18n.t('reminder.eventToday', { title }),
        data: { eventId, type: 'event_morning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: getNextMorningOccurrence(new Date(), getMorningTime()),
      },
    });
  },

  cancelAllEventReminders: async (): Promise<void> => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const eventReminders = scheduled.filter((notification) => {
      const data = notification.content.data;
      return typeof data?.eventId === 'string' && data.eventId.length > 0;
    });
    await Promise.all(
      eventReminders.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
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

    const triggerDate = getNotSeenReminderTriggerDate(new Date(), getMorningTime());

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

    const triggerDate = getPostEventFollowUpTriggerDate(new Date(), getMorningTime());

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

  dismissNotification: async (notificationIdentifier: string): Promise<void> => {
    await Notifications.dismissNotificationAsync(notificationIdentifier);
  },

  setupNotificationListener: (
    onNotificationTap: (
      data: Record<string, unknown>,
      actionIdentifier: string,
      notificationIdentifier: string
    ) => void
  ): (() => void) => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
      const data = response.notification.request.content.data;

      onNotificationTap(data, response.actionIdentifier, response.notification.request.identifier);
    });

    return () => subscription.remove();
  },
};
