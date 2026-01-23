import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { hotTopicService } from '@/services/hot-topic.service';
import { contactService } from '@/services/contact.service';
import { HotTopic, Contact } from '@/types';
import { Colors } from '@/constants/theme';
import { Calendar } from 'lucide-react-native';
import { SwipeableEventCard } from '@/components/upcoming/SwipeableEventCard';
import { EventListSkeleton } from '@/components/skeleton/EventListSkeleton';

type TimelineDay = {
  date: Date;
  events: Array<HotTopic & { contact: Contact }>;
  isToday: boolean;
};

type FeedView = 'upcoming' | 'past';

export default function UpcomingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<FeedView>('upcoming');
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);
  const [pastEvents, setPastEvents] = useState<Array<HotTopic & { contact: Contact }>>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const locale = i18n.language === 'fr' ? fr : enUS;

  const loadEvents = useCallback(async () => {
    if (view === 'upcoming') {
      const hotTopics = await hotTopicService.getUpcoming(365);

      // Filter birthday duplicates: only show the closest upcoming birthday per contact
      const seenBirthdayContacts = new Set<string>();
      const filteredTopics = hotTopics.filter((topic) => {
        if (topic.birthdayContactId) {
          if (seenBirthdayContacts.has(topic.birthdayContactId)) {
            return false;
          }
          seenBirthdayContacts.add(topic.birthdayContactId);
        }
        return true;
      });

      const topicsWithContacts = await Promise.all(
        filteredTopics.map(async (topic) => {
          const contact = await contactService.getById(topic.contactId);
          return { ...topic, contact: contact! };
        })
      );

      const today = startOfDay(new Date());

      // Group events by date (only days with events)
      const eventsByDate = new Map<string, Array<HotTopic & { contact: Contact }>>();

      for (const topic of topicsWithContacts) {
        if (topic.eventDate) {
          const dateKey = startOfDay(new Date(topic.eventDate)).toISOString();
          const existing = eventsByDate.get(dateKey) || [];
          existing.push(topic);
          eventsByDate.set(dateKey, existing);
        }
      }

      // Convert to timeline format, sorted by date
      const days: TimelineDay[] = Array.from(eventsByDate.entries())
        .map(([dateKey, events]) => ({
          date: new Date(dateKey),
          events,
          isToday: isSameDay(new Date(dateKey), today),
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      setTimeline(days);
    } else {
      // Past view: hot topics don't track past events, show empty
      setPastEvents([]);
    }

    setHasLoaded(true);
  }, [view]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleEventPress = (contactId: string) => {
    router.push(`/contact/${contactId}`);
  };

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    await hotTopicService.delete(eventId);
    setTimeline((currentTimeline) =>
      currentTimeline
        .map((day) => ({
          ...day,
          events: day.events.filter((event) => event.id !== eventId),
        }))
        .filter((day) => day.events.length > 0)
    );
  }, []);

  const formatDayHeader = (date: Date, dayIsToday: boolean): string => {
    if (dayIsToday) {
      return `${t('upcoming.today')} — ${format(date, 'EEE d MMM', { locale })}`;
    }
    return format(date, 'EEE d MMM', { locale });
  };

  const hasAnyEvents = timeline.some((day) => day.events.length > 0);

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top }]}>
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
        {!hasLoaded ? (
          <EventListSkeleton />
        ) : view === 'upcoming' ? (
          hasAnyEvents ? (
            timeline.map((day) => (
              <View key={day.date.toISOString()} style={styles.dayContainer}>
                <Text style={[styles.dayHeader, day.isToday && styles.dayHeaderToday]}>
                  {formatDayHeader(day.date, day.isToday)}
                </Text>

                {day.events.map((event) => (
                  <SwipeableEventCard
                    key={event.id}
                    event={event}
                    onPress={handleEventPress}
                    onDelete={handleDeleteEvent}
                  />
                ))}
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
                    {event.contact.firstName} {event.contact.lastName || ''}{event.eventDate ? ` • ${format(new Date(event.eventDate), 'd MMM', { locale })}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('upcoming.noPastEvents')}</Text>
          )
        )}
      </ScrollView>
    </GestureHandlerRootView>
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
    backgroundColor: Colors.calendar,
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
    color: Colors.calendar,
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
