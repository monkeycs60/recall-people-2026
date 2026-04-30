export type NotificationRoute =
  | { type: 'contact'; contactId: string }
  | { type: 'event'; eventId: string }
  | { type: 'upcoming' };

type NotificationData = Record<string, unknown> | null | undefined;

const getString = (data: NotificationData, key: string): string | undefined => {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const getNotificationRoute = (data: NotificationData): NotificationRoute | null => {
  const contactId = getString(data, 'contactId');
  if (contactId) {
    return { type: 'contact', contactId };
  }

  const eventId = getString(data, 'eventId');
  if (eventId) {
    return { type: 'event', eventId };
  }

  const type = getString(data, 'type');
  const screen = getString(data, 'screen');
  if (type === 'weekly_digest' || screen === 'upcoming') {
    return { type: 'upcoming' };
  }

  return null;
};
