import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { useContactQuery } from '@/hooks/useContactQuery';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { ContactDetailSkeleton } from '@/components/skeleton/ContactDetailSkeleton';
import { formatLocalizedDate } from '@/utils/dateLocale';
import { filterToNextBirthdayTopic } from '@/utils/hotTopics';
import type { HotTopic } from '@/types';

type ToneKey = 'amber' | 'primary' | 'accent' | 'mint';

type TimelineEntry = {
  id: string;
  date: Date;
  monthLabel: string;
  dayLabel: string;
  title: string;
  subtitle?: string;
  diffDays: number;
  isHighlighted: boolean;
  emoji: string;
  tone: ToneKey;
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

export default function ContactComingUpScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const contactId = params.id as string;
  const { contact, isLoading } = useContactQuery(contactId);

  const today = useMemo(() => new Date(), []);
  const todayLabel = useMemo(
    () => formatLocalizedDate(today, { day: 'numeric', month: 'short' }).toUpperCase(),
    [today]
  );

  const entries: TimelineEntry[] = useMemo(() => {
    if (!contact) return [];
    const activeUpcoming: HotTopic[] = filterToNextBirthdayTopic(contact.hotTopics)
      .filter((topic) => topic.status === 'active' && topic.eventDate)
      .slice()
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());
    const hasBirthdayHotTopic = activeUpcoming.some((topic) => topic.birthdayContactId);

    const list = activeUpcoming.map<TimelineEntry>((topic, index) => {
      const eventDate = new Date(topic.eventDate!);
      const diffDays = getDayDiff(eventDate, today);
      const isBirthday = Boolean(topic.birthdayContactId);
      return {
        id: topic.id,
        date: eventDate,
        monthLabel: getMonthLabel(eventDate, i18n.language),
        dayLabel: String(eventDate.getDate()),
        title: topic.title,
        subtitle: topic.context || (isBirthday && contact.birthdayYear
          ? t('contactComingUp.birthdayTurning', { age: eventDate.getFullYear() - contact.birthdayYear })
          : undefined),
        diffDays,
        isHighlighted: index === 0,
        emoji: pickEmoji(topic.title, isBirthday),
        tone: toneRotation[index % toneRotation.length],
      };
    });

    if (contact.birthdayDay && contact.birthdayMonth && !hasBirthdayHotTopic) {
      const year = today.getFullYear();
      const candidate = new Date(year, contact.birthdayMonth - 1, contact.birthdayDay);
      if (candidate.getTime() < today.getTime()) {
        candidate.setFullYear(year + 1);
      }
      const diffDays = getDayDiff(candidate, today);
      list.push({
        id: `birthday-${contact.id}`,
        date: candidate,
        monthLabel: getMonthLabel(candidate, i18n.language),
        dayLabel: String(candidate.getDate()),
        title: t('contactComingUp.birthdayTitle', { firstName: contact.firstName }),
        subtitle: contact.birthdayYear ? t('contactComingUp.birthdayTurning', { age: candidate.getFullYear() - contact.birthdayYear }) : undefined,
        diffDays,
        isHighlighted: false,
        emoji: '🎂',
        tone: 'mint',
      });
    }

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [contact, today, i18n.language, t]);

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

      <View style={styles.todayMarkerRow}>
        <View style={styles.todayMarkerLine} />
        <Text style={styles.todayMarkerLabel}>
          {t('contactComingUp.todayLabel')} · {todayLabel}
        </Text>
        <View style={styles.todayMarkerLine} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
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
            {entries.map((entry) => {
              const palette = tonePalette[entry.tone];
              const cardBackground = entry.isHighlighted ? palette.background : Colors.surface;
              return (
                <View key={entry.id} style={styles.timelineRow}>
                  <View style={styles.dateColumn}>
                    <View style={[styles.dateChip, { borderColor: palette.color }]}>
                      <Text style={[styles.dateDay, { color: palette.color }]}>{entry.dayLabel}</Text>
                      <Text style={[styles.dateMonth, { color: palette.color }]}>{entry.monthLabel}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.eventCard,
                      { backgroundColor: cardBackground },
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
                        <Text style={styles.eventCardEmoji}>{entry.emoji}</Text>
                        <Text style={styles.eventCardTitle} numberOfLines={2}>
                          {entry.title}
                        </Text>
                      </View>
                      <Text style={styles.eventCardSoon} numberOfLines={1}>
                        {entry.diffDays <= 0
                          ? t('contactComingUp.today')
                          : t('contactComingUp.inDays', { count: entry.diffDays })}
                      </Text>
                    </View>
                    {entry.subtitle ? (
                      <Text style={styles.eventCardBody} numberOfLines={3}>
                        {entry.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    marginTop: 3,
    marginLeft: 'auto',
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'right',
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
