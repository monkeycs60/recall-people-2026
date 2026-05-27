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
import type { Note } from '@/types';

type Tone = { ring: string; halo: string };

const toneRotation: Tone[] = [
  { ring: Colors.primary, halo: 'rgba(91,61,245,0.18)' },
  { ring: Colors.amber, halo: 'rgba(245,166,35,0.22)' },
  { ring: Colors.mint, halo: 'rgba(46,204,139,0.22)' },
  { ring: Colors.accent, halo: 'rgba(255,107,74,0.22)' },
];

function pickEmoji(note: Note): string {
  const haystack = `${note.title ?? ''} ${note.transcription ?? ''}`.toLowerCase();
  if (haystack.includes('lease') || haystack.includes('bail') || haystack.includes('contrato')) return '🔑';
  if (haystack.includes('coffee') || haystack.includes('café') || haystack.includes('caffè')) return '☕️';
  if (haystack.includes('move') || haystack.includes('moving') || haystack.includes('déménage') || haystack.includes('umzug')) return '✈️';
  if (haystack.includes('apartment') || haystack.includes('appart') || haystack.includes('viewing')) return '🏠';
  if (haystack.includes('birthday') || haystack.includes('anniversaire') || haystack.includes('cumpleaños') || haystack.includes('geburtstag')) return '🎂';
  if (haystack.includes('ceramic') || haystack.includes('pottery') || haystack.includes('poterie')) return '🎨';
  if (haystack.includes('wedding') || haystack.includes('mariage')) return '💍';
  if (haystack.includes('call') || haystack.includes('appel')) return '📞';
  return '✨';
}

function getDayDiff(eventDate: Date, today: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const stripTime = (input: Date) => Date.UTC(input.getFullYear(), input.getMonth(), input.getDate());
  return Math.round((stripTime(today) - stripTime(eventDate)) / msPerDay);
}

export default function ContactNotesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const contactId = params.id as string;
  const { contact, isLoading } = useContactQuery(contactId);

  const today = useMemo(() => new Date(), []);

  const stats = useMemo(() => {
    if (!contact) return { notes: 0, knownFor: '', upcoming: 0 };
    const upcoming = contact.hotTopics.filter((topic) => {
      if (topic.status !== 'active' || !topic.eventDate) return false;
      return new Date(topic.eventDate).getTime() >= today.getTime();
    }).length;

    const oldestNote = contact.notes.slice().sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    const knownDays = oldestNote
      ? getDayDiff(new Date(oldestNote.createdAt), today)
      : 0;
    const knownForLabel = knownDays >= 365
      ? t('contactNotes.statKnownYears', { count: Math.max(1, Math.floor(knownDays / 365)) })
      : knownDays >= 30
        ? t('contactNotes.statKnownMonths', { count: Math.max(1, Math.floor(knownDays / 30)) })
        : t('contactNotes.statKnownDays', { count: Math.max(1, knownDays) });

    return {
      notes: contact.notes.length,
      knownFor: knownForLabel,
      upcoming,
    };
  }, [contact, today, t]);

  const sortedNotes = useMemo(() => {
    if (!contact) return [];
    return contact.notes.slice().sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [contact]);

  if (isLoading) return <ContactDetailSkeleton />;

  if (!contact) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const formatRelativeAge = (createdAt: string): string => {
    const days = getDayDiff(new Date(createdAt), today);
    if (days <= 0) return t('contactNotes.relativeToday');
    if (days === 1) return t('contactNotes.relativeYesterday');
    if (days < 30) return t('contactNotes.relativeDaysAgo', { count: days });
    if (days < 365) return t('contactNotes.relativeMonthsAgo', { count: Math.floor(days / 30) });
    return t('contactNotes.relativeYearsAgo', { count: Math.floor(days / 365) });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.topBarTitleColumn}>
          <Text style={styles.topBarEyebrow}>{t('contactNotes.eyebrow')}</Text>
          <Text style={styles.topBarTitle}>
            {contact.firstName} {contact.lastName || ''}
          </Text>
        </View>
        <ContactAvatar
          firstName={contact.firstName}
          lastName={contact.lastName}
          gender={contact.gender}
          avatarUrl={contact.avatarUrl}
          size="small"
          cacheKey={contact.updatedAt}
        />
      </View>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{stats.notes}</Text>
          <Text style={styles.statLabel}>{t('contactNotes.statNotes')}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statValue, { color: Colors.accent }]}>{stats.knownFor}</Text>
          <Text style={styles.statLabel}>{t('contactNotes.statKnown')}</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={[styles.statValue, { color: Colors.mint }]}>{stats.upcoming}</Text>
          <Text style={styles.statLabel}>{t('contactNotes.statUpcoming')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {sortedNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📔</Text>
            <Text style={styles.emptyTitle}>{t('contactNotes.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>
              {t('contactNotes.emptyBody', { firstName: contact.firstName })}
            </Text>
          </View>
        ) : (
          <View style={styles.timelineWrapper}>
            <View style={styles.timelineLine} />
            {sortedNotes.map((note, index) => {
              const tone = toneRotation[index % toneRotation.length];
              const titleText = note.title?.trim() || t('contactNotes.untitledNote');
              return (
                <View key={note.id} style={styles.timelineRow}>
                  <View style={styles.nodeColumn}>
                    <View
                      style={[
                        styles.nodeCircle,
                        { borderColor: tone.ring, shadowColor: tone.ring },
                      ]}
                    >
                      <View
                        style={[
                          styles.nodeHalo,
                          { backgroundColor: tone.halo },
                        ]}
                      />
                      <Text style={styles.nodeEmoji}>{pickEmoji(note)}</Text>
                    </View>
                    <Text style={styles.nodeDate}>{formatRelativeAge(note.createdAt).toUpperCase()}</Text>
                  </View>
                  <View style={styles.noteCard}>
                    <Text style={styles.noteTitle} numberOfLines={2}>
                      {titleText}
                    </Text>
                    <Text style={styles.noteBody} numberOfLines={3}>
                      {note.transcription}
                    </Text>
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
  topBarEyebrow: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  topBarTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 18,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadows.card,
  },
  statValue: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  timelineWrapper: { position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 31,
    top: 14,
    bottom: 14,
    width: 2,
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 18,
  },
  nodeColumn: {
    width: 64,
    alignItems: 'center',
  },
  nodeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  nodeHalo: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 23,
  },
  nodeEmoji: { fontSize: 16 },
  nodeDate: {
    fontFamily: Fonts.sans.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 11,
  },
  noteCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    ...Shadows.card,
  },
  noteTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  noteBody: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 4,
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
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: Fonts.sans.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
