import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { eventService } from '@/services/event.service';
import { contactService } from '@/services/contact.service';
import { Event, Contact } from '@/types';
import { Colors } from '@/constants/theme';
import { Calendar } from 'lucide-react-native';

type TimelineDay = {
  date: Date;
  events: Array<Event & { contact: Contact }>;
  isToday: boolean;
};

type FeedView = 'upcoming' | 'past';

export default function UpcomingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<FeedView>('upcoming');
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);
  const [pastEvents, setPastEvents] = useState<Array<Event & { contact: Contact }>>([]);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language === 'fr' ? fr : enUS;

  const loadEvents = useCallback(async () => {
    setLoading(true);

    if (view === 'upcoming') {
      const events = await eventService.getUpcoming(30);
      const eventsWithContacts = await Promise.all(
        events.map(async (event) => {
          const contact = await contactService.getById(event.contactId);
          return { ...event, contact: contact! };
        })
      );

      const days: TimelineDay[] = [];
      const today = startOfDay(new Date());

      for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
        const date = addDays(today, dayIndex);
        const dayEvents = eventsWithContacts.filter((event) =>
          isSameDay(new Date(event.eventDate), date)
        );
        days.push({
          date,
          events: dayEvents,
          isToday: dayIndex === 0,
        });
      }

      setTimeline(days);
    } else {
      const events = await eventService.getPast(30);
      const eventsWithContacts = await Promise.all(
        events.map(async (event) => {
          const contact = await contactService.getById(event.contactId);
          return { ...event, contact: contact! };
        })
      );
      setPastEvents(eventsWithContacts);
    }

    setLoading(false);
  }, [view]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleEventPress = (contactId: string) => {
    router.push(`/contact/${contactId}`);
  };

  const formatDayHeader = (date: Date, dayIsToday: boolean): string => {
    if (dayIsToday) {
      return `${t('upcoming.today')} — ${format(date, 'EEE d MMM', { locale })}`;
    }
    return format(date, 'EEE d MMM', { locale });
  };

  const hasAnyEvents = timeline.some((day) => day.events.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segment, view === 'upcoming' && styles.segmentActive]}
            onPress={() => setView('upcoming')}
          >
            <Text style={[styles.segmentText, view === 'upcoming' && styles.segmentTextActive]}>
              {t('upcoming.title')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, view === 'past' && styles.segmentActive]}
            onPress={() => setView('past')}
          >
            <Text style={[styles.segmentText, view === 'past' && styles.segmentTextActive]}>
              {t('upcoming.past')}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {view === 'upcoming' ? (
          hasAnyEvents ? (
            timeline.map((day) => (
              <View key={day.date.toISOString()} style={styles.dayContainer}>
                <Text style={[styles.dayHeader, day.isToday && styles.dayHeaderToday]}>
                  {formatDayHeader(day.date, day.isToday)}
                </Text>

                {day.events.length > 0 ? (
                  day.events.map((event) => (
                    <Pressable
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => handleEventPress(event.contactId)}
                    >
                      <Calendar size={16} color={Colors.info} />
                      <View style={styles.eventContent}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventContact}>
                          {event.contact.firstName} {event.contact.lastName || ''}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyDay} />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('upcoming.noEvents')}</Text>
          )
        ) : (
          pastEvents.length > 0 ? (
            pastEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.pastEventCard}
                onPress={() => handleEventPress(event.contactId)}
              >
                <Calendar size={16} color={Colors.textMuted} />
                <View style={styles.eventContent}>
                  <Text style={styles.pastEventTitle}>{event.title}</Text>
                  <Text style={styles.eventContact}>
                    {event.contact.firstName} {event.contact.lastName || ''} • {format(new Date(event.eventDate), 'd MMM', { locale })}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('upcoming.noPastEvents')}</Text>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textInverse,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  dayHeaderToday: {
    color: Colors.primary,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventContent: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  eventContact: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyDay: {
    height: 4,
  },
  pastEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.7,
  },
  pastEventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: 40,
  },
});
