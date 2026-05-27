import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, RefreshCcw } from 'lucide-react-native';
import { useContactQuery, useRegenerateSuggestedQuestions } from '@/hooks/useContactQuery';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { ContactDetailSkeleton } from '@/components/skeleton/ContactDetailSkeleton';

const tonePresets: { background: string; textColor: string; labelColor: string; rotation: number; marginRight: number; marginLeft: number }[] = [
  {
    background: Colors.surface,
    textColor: Colors.textPrimary,
    labelColor: Colors.primary,
    rotation: -1,
    marginRight: 36,
    marginLeft: 0,
  },
  {
    background: Colors.primary,
    textColor: Colors.textInverse,
    labelColor: 'rgba(255,255,255,0.75)',
    rotation: 0.8,
    marginRight: 50,
    marginLeft: 22,
  },
  {
    background: Colors.surface,
    textColor: Colors.textPrimary,
    labelColor: Colors.accent,
    rotation: -0.5,
    marginRight: 80,
    marginLeft: 0,
  },
];

const sectionLabels: ('ask' | 'followUp' | 'remember')[] = ['ask', 'followUp', 'remember'];

export default function ContactIcebreakersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const contactId = params.id as string;
  const { contact, isLoading, isWaitingForSuggestedQuestions } = useContactQuery(contactId);
  const regenerateSuggestedQuestions = useRegenerateSuggestedQuestions();

  const questions = useMemo(() => {
    if (!contact?.suggestedQuestions) return [];
    return contact.suggestedQuestions.slice(0, 3);
  }, [contact?.suggestedQuestions]);

  if (isLoading) return <ContactDetailSkeleton />;

  if (!contact) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const hasNotes = contact.notes.length > 0;
  const canRegenerate = hasNotes && !regenerateSuggestedQuestions.isPending;
  const isRefreshing = regenerateSuggestedQuestions.isPending || isWaitingForSuggestedQuestions;

  const handleRefresh = () => {
    if (canRegenerate) regenerateSuggestedQuestions.mutate({ contactId });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.topBarLabel}>{t('contactIcebreakers.headerLabel')}</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.heroBlock}>
        <ContactAvatar
          firstName={contact.firstName}
          lastName={contact.lastName}
          gender={contact.gender}
          avatarUrl={contact.avatarUrl}
          size="medium"
          cacheKey={contact.updatedAt}
        />
        <Text style={styles.heroTitle}>
          {t('contactIcebreakers.heroTitle', { firstName: contact.firstName })}
        </Text>
        <Text style={styles.heroSubtitle}>
          {t('contactIcebreakers.heroSubtitle', { count: questions.length, firstName: contact.firstName })}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {questions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>
              {isRefreshing ? t('contactIcebreakers.generating') : t('contactIcebreakers.emptyTitle')}
            </Text>
            <Text style={styles.emptyBody}>
              {hasNotes
                ? t('contactIcebreakers.emptyBodyWithNotes', { firstName: contact.firstName })
                : t('contactIcebreakers.emptyBodyNoNotes', { firstName: contact.firstName })}
            </Text>
            {isRefreshing && <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />}
          </View>
        ) : (
          questions.map((question, index) => {
            const tone = tonePresets[index % tonePresets.length];
            const sectionKey = sectionLabels[index % sectionLabels.length];
            return (
              <View
                key={`${question}-${index}`}
                style={[
                  styles.bubble,
                  {
                    backgroundColor: tone.background,
                    transform: [{ rotate: `${tone.rotation}deg` }],
                    marginRight: tone.marginRight,
                    marginLeft: tone.marginLeft,
                  },
                ]}
              >
                <Text style={[styles.bubbleLabel, { color: tone.labelColor }]}>
                  ✦ {t(`contactIcebreakers.bucket.${sectionKey}`)}
                </Text>
                <Text style={[styles.bubbleText, { color: tone.textColor }]}>{question}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={[styles.footerHint, !canRegenerate && styles.footerHintDisabled]}
        onPress={handleRefresh}
        disabled={!canRegenerate}
      >
        <RefreshCcw size={12} color={Colors.textMuted} strokeWidth={2.4} />
        <Text style={styles.footerHintText}>
          {isRefreshing
            ? t('contactIcebreakers.refreshing')
            : t('contactIcebreakers.footerHint')}
        </Text>
      </Pressable>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
  backButtonPlaceholder: { width: 42 },
  topBarLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  heroBlock: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  heroTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    gap: 16,
  },
  bubble: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: '#1D1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  bubbleLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
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
  footerHint: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  footerHintDisabled: { opacity: 0.6 },
  footerHintText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
