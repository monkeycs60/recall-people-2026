import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { addDays, setHours, setMinutes, setSeconds, isBefore } from 'date-fns';

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

  cancelAllReminders: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  setupNotificationListener: (onNotificationTap: (eventId: string) => void): (() => void) => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
      const eventId = response.notification.request.content.data?.eventId as string;
      if (eventId) {
        onNotificationTap(eventId);
      }
    });

    return () => subscription.remove();
  },
};
