import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Check, ChevronLeft, Edit3 } from 'lucide-react-native';
import { useContactQuery, useUpdateHotTopic } from '@/hooks/useContactQuery';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import {
  TimelineEventEditSheet,
  type TimelineEventEditSheetEvent,
  type TimelineEventEditValues,
} from '@/components/contact/TimelineEventEditSheet';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { ContactDetailSkeleton } from '@/components/skeleton/ContactDetailSkeleton';
import { formatLocalizedDate } from '@/utils/dateLocale';
import { getContactLifeTimelineSections, type ContactLifeTimelineEntry } from '@/utils/contactLifeTimeline';
import { notificationService } from '@/services/notification.service';
import { showErrorToast } from '@/lib/error-handler';
import type { HotTopic } from '@/types';

type ToneKey = 'amber' | 'primary' | 'accent' | 'mint';
type TimelineTranslate = (key: string, options?: Record<string, unknown>) => string;

type TimelineEntry = {
  id: string;
  date?: Date;
  monthLabel: string;
  dayLabel: string;
  title: string;
  context?: string;
  subtitle?: string;
  diffDays?: number;
  isUndated: boolean;
  isHighlighted: boolean;
  isBirthday: boolean;
  isSyntheticBirthday: boolean;
  emoji: string;
  tone: ToneKey;
  timelineStatus: 'active' | 'resolved';
  resolution?: string;
};

type TimelineEventRowProps = {
  entry: TimelineEntry;
  translate: TimelineTranslate;
  canEdit?: boolean;
  onEdit?: (entry: TimelineEntry) => void;
};

const tonePalette: Record<ToneKey, { color: string; background: string; shadowTint: string }> = {
  amber: { color: Colors.amber, background: Colors.amberLight, shadowTint: 'rgba(245,166,35,0.25)' },
  primary: { color: Colors.primary, background: Colors.primaryLight, shadowTint: 'rgba(91,61,245,0.25)' },
  accent: { color: Colors.accent, background: Colors.accentLight, shadowTint: 'rgba(255,107,74,0.25)' },
  mint: { color: Colors.mint, background: Colors.mintLight, shadowTint: 'rgba(46,204,139,0.25)' },
};

const toneRotation: ToneKey[] = ['amber', 'primary', 'accent', 'mint'];

function pickEmoji(title: string, isBirthday: boolean): string {
  if (isBirthday) return '🎂';
  const haystack = title.toLowerCase();
  if (haystack.includes('lease') || haystack.includes('bail') || haystack.includes('contrato')) return '🔑';
  if (haystack.includes('move') || haystack.includes('moving') || haystack.includes('déménage') || haystack.includes('mudanza') || haystack.includes('umzug')) return '✈️';
  if (haystack.includes('apartment') || haystack.includes('appart') || haystack.includes('viewing') || haystack.includes('visite')) return '🏠';
  if (haystack.includes('birthday') || haystack.includes('anniversaire') || haystack.includes('cumpleaños') || haystack.includes('compleanno') || haystack.includes('geburtstag')) return '🎂';
  if (haystack.includes('wedding') || haystack.includes('mariage') || haystack.includes('boda')) return '💍';
  if (haystack.includes('travel') || haystack.includes('trip') || haystack.includes('voyage')) return '🧳';
  if (haystack.includes('meeting') || haystack.includes('rdv') || haystack.includes('réunion')) return '💼';
  if (haystack.includes('call') || haystack.includes('appel')) return '📞';
  return '✨';
}

function getDayDiff(eventDate: Date, today: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const stripTime = (input: Date) => Date.UTC(input.getFullYear(), input.getMonth(), input.getDate());
  return Math.round((stripTime(eventDate) - stripTime(today)) / msPerDay);
}

function getMonthLabel(date: Date, language: string): string {
  return date.toLocaleDateString(language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`, { month: 'short' }).replace('.', '').toUpperCase();
}

function buildTimelineEntry(
  entry: ContactLifeTimelineEntry,
  index: number,
  today: Date,
  language: string,
  birthdayYear: number | undefined,
  birthdayTitle: string,
  birthdayTurning: string | undefined,
  highlightActive = true
): TimelineEntry {
  const diffDays = getDayDiff(entry.date, today);
  const title = entry.isSyntheticBirthday ? birthdayTitle : entry.title;
  const subtitle = entry.timelineStatus === 'resolved'
    ? entry.resolution || entry.context
    : entry.context || (entry.isBirthday && birthdayYear ? birthdayTurning : undefined);

  return {
    id: entry.id,
    date: entry.date,
    monthLabel: getMonthLabel(entry.date, language),
    dayLabel: String(entry.date.getDate()),
    title,
    context: entry.context,
    subtitle,
    diffDays,
    isUndated: false,
    isHighlighted: highlightActive && entry.timelineStatus === 'active' && index === 0,
    isBirthday: entry.isBirthday,
    isSyntheticBirthday: entry.isSyntheticBirthday,
    emoji: entry.timelineStatus === 'resolved' ? '' : pickEmoji(title, entry.isBirthday),
    tone: entry.timelineStatus === 'resolved' ? 'mint' : toneRotation[index % toneRotation.length],
    timelineStatus: entry.timelineStatus,
    resolution: entry.resolution,
  };
}

function buildUndatedTimelineEntry(topic: HotTopic, index: number): TimelineEntry {
  return {
    id: topic.id,
    monthLabel: '',
    dayLabel: '—',
    title: topic.title,
    context: topic.context,
    subtitle: topic.context,
    isHighlighted: false,
    isUndated: true,
    isBirthday: false,
    isSyntheticBirthday: false,
    emoji: pickEmoji(topic.title, false),
    tone: toneRotation[index % toneRotation.length],
    timelineStatus: 'active',
  };
}

function getTimelineEntryTimeLabel(
  entry: TimelineEntry,
  translate: TimelineTranslate
): string {
  if (entry.isUndated) return translate('contactComingUp.undated');

  if (entry.timelineStatus === 'resolved') {
    const daysAgo = Math.max(0, -(entry.diffDays ?? 0));
    if (daysAgo === 0) return translate('contactNotes.relativeToday');
    if (daysAgo === 1) return translate('contactNotes.relativeYesterday');
    if (daysAgo < 30) return translate('contactNotes.relativeDaysAgo', { count: daysAgo });
    if (daysAgo < 365) return translate('contactNotes.relativeMonthsAgo', { count: Math.floor(daysAgo / 30) });
    return translate('contactNotes.relativeYearsAgo', { count: Math.floor(daysAgo / 365) });
  }

  if ((entry.diffDays ?? 0) < 0) {
    const daysAgo = Math.abs(entry.diffDays ?? 0);
    if (daysAgo === 1) return translate('contactNotes.relativeYesterday');
    if (daysAgo < 30) return translate('contactNotes.relativeDaysAgo', { count: daysAgo });
    if (daysAgo < 365) return translate('contactNotes.relativeMonthsAgo', { count: Math.floor(daysAgo / 30) });
    return translate('contactNotes.relativeYearsAgo', { count: Math.floor(daysAgo / 365) });
  }

  return entry.diffDays === 0
    ? translate('contactComingUp.today')
    : translate('contactComingUp.inDays', { count: entry.diffDays });
}

function TimelineEventRow({ entry, translate, canEdit = false, onEdit }: TimelineEventRowProps) {
  const isResolved = entry.timelineStatus === 'resolved';
  const palette = isResolved
    ? { color: Colors.success, background: Colors.successLight }
    : tonePalette[entry.tone];
  const cardBackground = isResolved
    ? Colors.successLight
    : entry.isHighlighted
      ? palette.background
      : Colors.surface;

  return (
    <View key={entry.id} style={styles.timelineRow}>
      <View style={styles.dateColumn}>
        <View
          style={[
            styles.dateChip,
            isResolved && styles.resolvedDateChip,
            { borderColor: palette.color },
          ]}
        >
          <Text style={[styles.dateDay, { color: palette.color }]}>{entry.dayLabel}</Text>
          <Text style={[styles.dateMonth, { color: palette.color }]}>{entry.monthLabel}</Text>
        </View>
      </View>
      <View
        style={[
          styles.eventCard,
          { backgroundColor: cardBackground },
          isResolved && styles.resolvedEventCard,
          entry.isHighlighted && {
            borderColor: palette.color,
            borderWidth: 2,
            shadowColor: palette.color,
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          },
        ]}
      >
        <View style={styles.eventCardHeader}>
          <View style={styles.eventCardTitleRow}>
            {isResolved ? (
              <Check style={styles.resolvedTitleCheck} size={16} color={Colors.success} strokeWidth={2.8} />
            ) : (
              <Text style={styles.eventCardEmoji}>{entry.emoji}</Text>
            )}
            <Text style={styles.eventCardTitle} numberOfLines={2}>
              {entry.title}
            </Text>
          </View>
          <View style={styles.eventCardTrailing}>
            <Text style={styles.eventCardSoon} numberOfLines={1}>
              {getTimelineEntryTimeLabel(entry, translate)}
            </Text>
            {canEdit ? (
              <Pressable
                style={styles.eventCardEditButton}
                onPress={() => onEdit?.(entry)}
                accessibilityRole="button"
                accessibilityLabel={translate('common.edit')}
                hitSlop={8}
              >
                <Edit3 size={14} color={Colors.primary} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
        </View>
        {entry.subtitle ? (
          <Text style={styles.eventCardBody} numberOfLines={3}>
            {entry.subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ContactComingUpScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const contactId = params.id as string;
  const { contact, isLoading } = useContactQuery(contactId);
  const updateHotTopicMutation = useUpdateHotTopic();
  const scrollRef = useRef<ScrollView>(null);
  const editSheetRef = useRef<BottomSheetModal>(null);
  const hasScrolledToTodayRef = useRef(false);
  const [todayMarkerY, setTodayMarkerY] = useState<number | null>(null);
  const [selectedTimelineEntry, setSelectedTimelineEntry] = useState<TimelineEntry | null>(null);
  const [isSavingTimelineEntry, setIsSavingTimelineEntry] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(
    () => formatLocalizedDate(today, { day: 'numeric', month: 'short' }).toUpperCase(),
    [today]
  );

  const timelineSections = useMemo(() => {
    if (!contact) return { past: [], upcoming: [], undated: [] };
    return getContactLifeTimelineSections(contact, today);
  }, [contact, today]);

  const pastEntries: TimelineEntry[] = useMemo(() => {
    if (!contact) return [];
    return timelineSections.past.map((entry, index) => buildTimelineEntry(
      entry,
      index,
      today,
      i18n.language,
      contact.birthdayYear,
      t('contactComingUp.birthdayTitle', { firstName: contact.firstName }),
      contact.birthdayYear ? t('contactComingUp.birthdayTurning', { age: entry.date.getFullYear() - contact.birthdayYear }) : undefined,
      false
    ));
  }, [contact, timelineSections.past, today, i18n.language, t]);

  const upcomingEntries: TimelineEntry[] = useMemo(() => {
    if (!contact) return [];
    return timelineSections.upcoming.map((entry, index) => buildTimelineEntry(
      entry,
      index,
      today,
      i18n.language,
      contact.birthdayYear,
      t('contactComingUp.birthdayTitle', { firstName: contact.firstName }),
      contact.birthdayYear ? t('contactComingUp.birthdayTurning', { age: entry.date.getFullYear() - contact.birthdayYear }) : undefined
    ));
  }, [contact, timelineSections.upcoming, today, i18n.language, t]);

  const undatedEntries: TimelineEntry[] = useMemo(() => (
    timelineSections.undated.map((topic, index) => buildUndatedTimelineEntry(topic, index))
  ), [timelineSections.undated]);

  const hasTimelineEntries = (
    pastEntries.length > 0 || upcomingEntries.length > 0 || undatedEntries.length > 0
  );

  const handleEditTimelineEntry = (entry: TimelineEntry) => {
    if (entry.timelineStatus !== 'active' || entry.isBirthday) return;

    setSelectedTimelineEntry(entry);
    requestAnimationFrame(() => editSheetRef.current?.present());
  };

  const handleSaveTimelineEntry = async (
    entry: TimelineEventEditSheetEvent,
    values: TimelineEventEditValues
  ) => {
    if (!contact) return;

    setIsSavingTimelineEntry(true);
    try {
      await updateHotTopicMutation.mutateAsync({
        id: entry.id,
        contactId: contact.id,
        data: {
          title: values.title,
          context: values.context,
          eventDate: values.eventDate,
        },
      });

      try {
        await notificationService.cancelEventRemindersByEventId(entry.id);
        if (values.eventDate) {
          await notificationService.scheduleEventReminder(
            entry.id,
            values.eventDate,
            values.title,
            contact.firstName,
            { requestPermission: false }
          );
        }
      } catch (notificationError) {
        console.warn('Failed to refresh event reminders:', notificationError);
      }
    } catch (error) {
      console.error('Failed to update timeline event:', error);
      showErrorToast(t('errors.generic'));
      throw error;
    } finally {
      setIsSavingTimelineEntry(false);
    }
  };

  useEffect(() => {
    hasScrolledToTodayRef.current = false;
    setTodayMarkerY(null);
  }, [contactId]);

  useEffect(() => {
    if (todayMarkerY === null || hasScrolledToTodayRef.current) return;

    const frameId = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, todayMarkerY - 8), animated: false });
      hasScrolledToTodayRef.current = true;
    });

    return () => cancelAnimationFrame(frameId);
  }, [todayMarkerY]);

  if (isLoading) return <ContactDetailSkeleton />;

  if (!contact) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <ContactAvatar
          firstName={contact.firstName}
          lastName={contact.lastName}
          gender={contact.gender}
          avatarUrl={contact.avatarUrl}
          size="small"
          cacheKey={contact.updatedAt}
        />
        <View style={styles.topBarTitleColumn}>
          <Text style={styles.topBarTitle}>
            {t('contactComingUp.title', { firstName: contact.firstName })}
          </Text>
          <Text style={styles.topBarSubtitle}>{t('contactComingUp.subtitle')}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {!hasTimelineEntries ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>{t('contactComingUp.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>
              {t('contactComingUp.emptyBody', { firstName: contact.firstName })}
            </Text>
          </View>
        ) : (
          <View style={styles.timelineWrapper}>
            <View style={styles.timelineDottedLine} />
            {pastEntries.map((entry) => (
              <TimelineEventRow
                key={entry.id}
                entry={entry}
                translate={t}
                canEdit={entry.timelineStatus === 'active' && !entry.isBirthday}
                onEdit={handleEditTimelineEntry}
              />
            ))}

            <View
              style={styles.todayMarkerRow}
              onLayout={(event) => setTodayMarkerY(event.nativeEvent.layout.y)}
            >
              <View style={styles.todayMarkerLine} />
              <Text style={styles.todayMarkerLabel}>
                {t('contactComingUp.todayLabel')} · {todayLabel}
              </Text>
              <View style={styles.todayMarkerLine} />
            </View>

            {upcomingEntries.map((entry) => (
              <TimelineEventRow
                key={entry.id}
                entry={entry}
                translate={t}
                canEdit={entry.timelineStatus === 'active' && !entry.isBirthday}
                onEdit={handleEditTimelineEntry}
              />
            ))}

            {undatedEntries.length > 0 ? (
              <>
                <View style={styles.undatedMarkerRow}>
                  <View style={styles.todayMarkerLine} />
                  <Text style={styles.undatedMarkerLabel}>{t('contactComingUp.undatedSection')}</Text>
                  <View style={styles.todayMarkerLine} />
                </View>
                {undatedEntries.map((entry) => (
                  <TimelineEventRow
                    key={entry.id}
                    entry={entry}
                    translate={t}
                    canEdit
                    onEdit={handleEditTimelineEntry}
                  />
                ))}
              </>
            ) : null}
          </View>
        )}
      </ScrollView>
      <TimelineEventEditSheet
        key={selectedTimelineEntry?.id ?? 'timeline-event-edit'}
        ref={editSheetRef}
        event={selectedTimelineEntry}
        isSaving={isSavingTimelineEntry}
        onSave={handleSaveTimelineEntry}
        onDismiss={() => setSelectedTimelineEntry(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  notFoundText: { color: Colors.textSecondary, fontSize: 16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  topBarTitleColumn: { flex: 1 },
  topBarTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  topBarSubtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  todayMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 2,
    marginBottom: 18,
  },
  todayMarkerLine: { flex: 1, height: 1, backgroundColor: Colors.hairline },
  todayMarkerLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.textInverse,
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  undatedMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 2,
    marginBottom: 18,
  },
  undatedMarkerLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  timelineWrapper: { position: 'relative' },
  timelineDottedLine: {
    position: 'absolute',
    left: 32,
    top: 6,
    bottom: 6,
    width: 2,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
    borderStyle: 'dashed',
    opacity: 0.25,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },
  dateColumn: {
    width: 64,
    alignItems: 'center',
    paddingTop: 2,
    zIndex: 2,
  },
  dateChip: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedDateChip: {
    backgroundColor: Colors.surface,
  },
  dateMonth: {
    fontFamily: Fonts.sans.bold,
    fontSize: 9,
    letterSpacing: 0.7,
    marginTop: -1,
  },
  dateDay: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    lineHeight: 24,
  },
  eventCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    ...Shadows.card,
  },
  resolvedEventCard: {
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventCardTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  eventCardEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  resolvedTitleCheck: {
    marginTop: 2,
  },
  eventCardTitle: {
    flex: 1,
    flexShrink: 1,
    fontFamily: Fonts.sans.bold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  eventCardSoon: {
    minWidth: 48,
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  eventCardTrailing: {
    alignItems: 'flex-end',
    gap: 8,
  },
  eventCardEditButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardBody: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyBody: {
    fontFamily: Fonts.sans.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
