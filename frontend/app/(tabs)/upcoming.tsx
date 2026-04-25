import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { format, startOfDay, isSameDay } from 'date-fns';
import { getDateLocale } from '@/utils/dateLocale';
import { hotTopicService } from '@/services/hot-topic.service';
import { contactService } from '@/services/contact.service';
import { HotTopic, Contact } from '@/types';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { EventListSkeleton } from '@/components/skeleton/EventListSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

type TimelineDay = {
  date: Date;
  events: Array<HotTopic & { contact: Contact }>;
  isToday: boolean;
};

type FeedView = 'upcoming' | 'past';

export default function UpcomingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<FeedView>('upcoming');
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);
  const [pastEvents, setPastEvents] = useState<Array<HotTopic & { contact: Contact }>>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const locale = getDateLocale();

  const loadEvents = useCallback(async () => {
    if (view === 'upcoming') {
      const hotTopics = await hotTopicService.getUpcoming(365);

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
      const eventsByDate = new Map<string, Array<HotTopic & { contact: Contact }>>();

      for (const topic of topicsWithContacts) {
        if (topic.eventDate) {
          const dateKey = startOfDay(new Date(topic.eventDate)).toISOString();
          const existing = eventsByDate.get(dateKey) || [];
          existing.push(topic);
          eventsByDate.set(dateKey, existing);
        }
      }

      const days: TimelineDay[] = Array.from(eventsByDate.entries())
        .map(([dateKey, events]) => ({
          date: new Date(dateKey),
          events,
          isToday: isSameDay(new Date(dateKey), today),
        }))
        .sort((dayA, dayB) => dayA.date.getTime() - dayB.date.getTime());

      setTimeline(days);
    } else {
      const pastTopics = await hotTopicService.getPast(90);

      const pastWithContacts = await Promise.all(
        pastTopics.map(async (topic) => {
          const contact = await contactService.getById(topic.contactId);
          return { ...topic, contact: contact! };
        })
      );

      setPastEvents(pastWithContacts.filter((event) => event.contact));
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t('upcoming.title')}</Text>

        {/* Segmented control */}
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
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
                  <Pressable
                    key={event.id}
                    style={styles.eventCard}
                    onPress={() => handleEventPress(event.contactId)}
                  >
                    <View style={[styles.eventIcon, day.isToday && styles.eventIconToday]}>
                      <Calendar size={16} color={day.isToday ? Colors.textInverse : '#6B4B00'} />
                    </View>
                    <View style={styles.eventContent}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventContact}>
                        {event.contact.firstName} {event.contact.lastName || ''}
                      </Text>
                    </View>
                    <ChevronRight size={14} color={Colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            ))
          ) : (
            <EmptyState
              icon={<Calendar size={48} color={Colors.amberLight} />}
              title={t('upcoming.noEvents')}
              description={t('upcoming.emptyDescription')}
              ctaLabel={t('upcoming.recordNote')}
              onCtaPress={() => router.push('/record')}
            />
          )
        ) : (
          pastEvents.length > 0 ? (
            pastEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventPress(event.contactId)}
              >
                <View style={styles.eventIcon}>
                  <Calendar size={16} color={'#6B4B00'} />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventContact}>
                    {event.contact.firstName} {event.contact.lastName || ''}
                    {event.eventDate ? ` · ${format(new Date(event.eventDate), 'd MMM', { locale })}` : ''}
                  </Text>
                </View>
                <ChevronRight size={14} color={Colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <EmptyState
              icon={<Calendar size={48} color={Colors.textMuted} />}
              title={t('upcoming.noPastEvents')}
              description={t('upcoming.emptyPastDescription')}
            />
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  screenTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    ...Shadows.elevated,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  segmentTextActive: {
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  dayContainer: {
    marginBottom: 18,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayHeaderToday: {
    color: Colors.accent,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    ...Shadows.card,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconToday: {
    backgroundColor: Colors.primary,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  eventContact: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
