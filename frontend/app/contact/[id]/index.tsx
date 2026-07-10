import { View, Text, ScrollView, Pressable, Platform, KeyboardAvoidingView, StyleSheet, BackHandler, Modal } from 'react-native';
import { OptionPickerSheet } from '@/components/ui/OptionPickerSheet';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useContactQuery,
  useRegenerateSummary,
  useResolveHotTopic,
} from '@/hooks/useContactQuery';
import { useUpdateContact, useDeleteContact } from '@/hooks/useContactsQuery';
import { useGroupsForContact, useGroupsQuery } from '@/hooks/useGroupsQuery';
import {
  ChevronLeft,
  Edit3,
  Plus,
  Trash2,
  MoreVertical,
  Bell,
  Users,
  Phone,
  Mail,
  Mic,
  Sparkles,
  MessageCircle,
  MapPin,
  Heart,
  RefreshCcw,
  BookOpen,
  ArrowRight,
  ChevronRight,
} from 'lucide-react-native';
import type { InputMode } from '@/components/InputModeToggle';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { DeleteContactDialog } from '@/components/contact/DeleteContactDialog';
import { PhoneEditSheet } from '@/components/contact/PhoneEditSheet';
import { EmailEditSheet } from '@/components/contact/EmailEditSheet';
import { BirthdayEditSheet } from '@/components/contact/BirthdayEditSheet';
import { AvatarEditModal } from '@/components/contact/AvatarEditModal';
import { NameEditSheet } from '@/components/contact/NameEditSheet';
import { MeetingContextEditSheet } from '@/components/contact/MeetingContextEditSheet';
import { LovesEditSheet } from '@/components/contact/LovesEditSheet';
import { GroupsManagementSheet } from '@/components/contact/GroupsManagementSheet';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import { screenshotMode } from '@/lib/config';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppStore } from '@/stores/app-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { useSettingsStore } from '@/stores/settings-store';
import { ContactDetailSkeleton } from '@/components/skeleton/ContactDetailSkeleton';
import { Paywall } from '@/components/Paywall';
import { REMINDER_FREQUENCY_PRESETS } from '@/lib/reminder-frequency';
import { formatLocalizedDate } from '@/utils/dateLocale';
import { getMeetingContext } from '@/utils/meetingContext';
import { filterToNextBirthdayTopic, getPastUnresolvedHotTopics, isHotTopicTodayOrFuture, parseHotTopicDate } from '@/utils/hotTopics';
import { PostEventFollowUpCard } from '@/components/contact/PostEventFollowUpCard';
import type { HotTopic } from '@/types';

type ToneKey = 'amber' | 'primary' | 'accent' | 'mint';

const toneAccent: Record<ToneKey, string> = {
  amber: Colors.amber,
  primary: Colors.primary,
  accent: Colors.accent,
  mint: Colors.mint,
};

const toneRotation: ToneKey[] = ['amber', 'primary', 'accent', 'mint'];

function compareHotTopicEventDateAsc(first: HotTopic, second: HotTopic): number {
  const firstTime = parseHotTopicDate(first.eventDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const secondTime = parseHotTopicDate(second.eventDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return firstTime - secondTime;
}

function getUpcomingHotTopics(hotTopics: HotTopic[], today: Date): HotTopic[] {
  return filterToNextBirthdayTopic(hotTopics, today)
    .filter((topic) =>
      topic.status === 'active' &&
      Boolean(topic.eventDate) &&
      isHotTopicTodayOrFuture(topic.eventDate, today)
    )
    .slice()
    .sort(compareHotTopicEventDateAsc);
}

function getNextThreeUpcoming(hotTopics: HotTopic[], today: Date): HotTopic[] {
  return getUpcomingHotTopics(hotTopics, today).slice(0, 3);
}

function formatShortDate(value: string, language: string): string {
  const date = parseHotTopicDate(value) ?? new Date(value);
  return date.toLocaleDateString(language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`, {
    month: 'short',
    day: 'numeric',
  });
}

function formatBirthdayChipLabel(day: number, month: number, language: string): string {
  const date = new Date(2000, month - 1, day);
  return date.toLocaleDateString(language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`, {
    month: 'short',
    day: 'numeric',
  }).replace('.', '');
}

function dayDiff(eventDate: Date, today: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const stripTime = (input: Date) => Date.UTC(input.getFullYear(), input.getMonth(), input.getDate());
  return Math.round((stripTime(eventDate) - stripTime(today)) / msPerDay);
}

export default function ContactDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;
  const { setPreselectedContactId, setPreselectedHotTopicId, isAvatarGenerating } = useAppStore();
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const notSeenThresholdDays = useSettingsStore((state) => state.notSeenThresholdDays);

  const { contact, isLoading, isWaitingForSummary, invalidate, refetch } = useContactQuery(contactId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();
  const regenerateSummaryMutation = useRegenerateSummary();
  const resolveHotTopicMutation = useResolveHotTopic();

  const { groups: allGroups } = useGroupsQuery();
  const { data: contactGroups = [] } = useGroupsForContact(contactId);

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isSummaryClamped, setIsSummaryClamped] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const groupsSheetRef = useRef<BottomSheetModal>(null);
  const reminderFrequencySheetRef = useRef<BottomSheetModal>(null);
  const nameSheetRef = useRef<BottomSheetModal>(null);
  const phoneSheetRef = useRef<BottomSheetModal>(null);
  const emailSheetRef = useRef<BottomSheetModal>(null);
  const birthdaySheetRef = useRef<BottomSheetModal>(null);
  const meetingContextSheetRef = useRef<BottomSheetModal>(null);
  const lovesSheetRef = useRef<BottomSheetModal>(null);

  const handleOpenGroupsSheet = useCallback(() => {
    groupsSheetRef.current?.present();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      router.dismissTo('/(tabs)');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router]);

  const today = useMemo(() => new Date(), []);

  const upcomingPreview = useMemo(() => {
    if (!contact) return [] as { id: string; label: string; dateLabel: string; soonLabel: string; tone: ToneKey }[];
    const upcoming = getNextThreeUpcoming(contact.hotTopics, today);
    return upcoming.map((topic, index) => {
      const eventDate = parseHotTopicDate(topic.eventDate!) ?? new Date(topic.eventDate!);
      const diff = dayDiff(eventDate, today);
      return {
        id: topic.id,
        label: topic.title,
        dateLabel: formatShortDate(topic.eventDate!, i18n.language),
        soonLabel: diff === 0 ? t('contactComingUp.today') : t('contactComingUp.inDays', { count: diff }),
        tone: toneRotation[index % toneRotation.length],
      };
    });
  }, [contact, i18n.language, today, t]);

  const totalUpcoming = useMemo(() => {
    if (!contact) return 0;
    return getUpcomingHotTopics(contact.hotTopics, today).length;
  }, [contact, today]);

  const remainingUpcoming = Math.max(0, totalUpcoming - upcomingPreview.length);

  const pastUnresolvedTopics = useMemo(() => {
    if (!contact) return [];
    return getPastUnresolvedHotTopics(contact.hotTopics, today);
  }, [contact, today]);
  const firstPastUnresolvedTopic = pastUnresolvedTopics[0];

  const meetingContext = useMemo(() => {
    if (!contact) return null;
    return getMeetingContext(contact.notes, contact.meetingContext);
  }, [contact]);

  const handleDelete = async () => {
    if (contact) {
      await deleteContactMutation.mutateAsync(contact.id);
      router.replace('/(tabs)');
    }
  };

  const handleSavePhone = async (value: string | null) => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: { phone: value || undefined },
    });
  };

  const handleSaveEmail = async (value: string | null) => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: { email: value || undefined },
    });
  };

  const handleSaveBirthday = async (day: number | null, month: number | null, year: number | null) => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: {
        birthdayDay: day,
        birthdayMonth: month,
        birthdayYear: year,
      },
    });
  };

  const handleSaveName = async (firstName: string, lastName: string | null) => {
    if (!contact) return;
    await updateContactMutation.mutateAsync({
      id: contact.id,
      data: {
        firstName,
        lastName: lastName || undefined,
      },
    });
  };

  const handleSaveMeetingContext = async (value: string) => {
    if (!contact) return;
    await updateContactMutation.mutateAsync({
      id: contact.id,
      data: { meetingContext: value },
    });
  };

  const handleSaveLoves = async (value: string[]) => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: { loves: value },
    });
  };

  const handleAddNote = (mode: InputMode) => {
    setPreselectedContactId(contactId);
    setPreselectedHotTopicId(null);
    router.push({
      pathname: '/record',
      params: { initialMode: mode },
    });
  };

  const handleResolvePostEventTopic = (topicId: string) => {
    resolveHotTopicMutation.mutate({ id: topicId, contactId });
  };

  const handleTellPostEventStory = (topicId: string) => {
    setPreselectedContactId(contactId);
    setPreselectedHotTopicId(topicId);
    router.push({
      pathname: '/record',
      params: { initialMode: 'audio' },
    });
  };

  const handleAskAboutContact = () => {
    router.push({
      pathname: '/ask',
      params: { contactId },
    });
  };

  const handleNavigateComingUp = () => {
    router.push(`/contact/${contactId}/coming-up`);
  };

  const handleNavigateIcebreakers = () => {
    router.push(`/contact/${contactId}/icebreakers`);
  };

  const handleNavigateNotes = () => {
    router.push(`/contact/${contactId}/notes`);
  };

  const handleRegenerateSummary = () => {
    regenerateSummaryMutation.mutate({ contactId });
  };

  useEffect(() => {
    setIsSummaryClamped(false);
    setIsSummaryExpanded(false);
  }, [contact?.aiSummary, isWaitingForSummary]);

  const defaultLabel = notSeenThresholdDays === 0
    ? t('contact.reminderNever')
    : t('settings.notSeenDays', { count: notSeenThresholdDays });

  const getReminderFrequencyLabel = (value: number | undefined): string => {
    if (value === undefined || value === null) return `${t('contact.reminderDefault')} (${defaultLabel})`;
    if (value === 7) return t('contact.reminderWeek');
    if (value === 14) return t('contact.reminderWeeks');
    if (value === 30) return t('contact.reminderMonth');
    if (value === 60) return t('contact.reminderTwoMonths');
    if (value === 90) return t('contact.reminderQuarter');
    if (value === 180) return t('contact.reminderSixMonths');
    if (value === 365) return t('contact.reminderYear');
    if (value === -1) return t('contact.reminderNever');
    return t('contact.reminderCustomDays', { count: value });
  };

  const getCatchupTileLabel = (value: number | undefined): string => {
    if (value === undefined || value === null) {
      return notSeenThresholdDays === 0
        ? t('contact.reminderNever')
        : t('contact.reminderCustomDays', { count: notSeenThresholdDays });
    }
    return getReminderFrequencyLabel(value);
  };

  const reminderFrequencyOptions: { label: string; value: number | null }[] = [
    { label: `${t('contact.reminderDefault')} (${defaultLabel})`, value: null },
    ...REMINDER_FREQUENCY_PRESETS.map((value) => ({
      label: getReminderFrequencyLabel(value),
      value,
    })),
    { label: t('contact.reminderNever'), value: -1 },
  ];

  const handleReminderFrequencyPress = () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    reminderFrequencySheetRef.current?.present();
  };

  const handleReminderFrequencySelect = (value: number | null) => {
    updateContactMutation.mutate({
      id: contactId,
      data: { reminderFrequencyDays: value },
    });
  };

  if (isLoading) {
    return <ContactDetailSkeleton />;
  }

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const hasNotes = contact.notes.length > 0;
  const birthdayLabel = contact.birthdayDay && contact.birthdayMonth
    ? formatBirthdayChipLabel(contact.birthdayDay, contact.birthdayMonth, i18n.language)
    : null;
  const summaryHasContent = Boolean(contact.aiSummary) || isWaitingForSummary;
  const summaryText = isWaitingForSummary && !contact.aiSummary
    ? t('contactProfile.summaryGenerating')
    : contact.aiSummary ?? '';
  const loves = contact.loves ?? [];
  const primaryGroupName = contactGroups[0]?.name;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.background]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.heroSection}
          >
            <View style={{ paddingTop: insets.top }} />

            <View style={styles.heroTopBar}>
              <Pressable style={styles.heroBackButton} onPress={() => router.back()}>
                <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.heroActions}>
                <Pressable style={styles.heroActionButton} onPress={() => nameSheetRef.current?.present()}>
                  <Edit3 size={14} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={styles.heroActionButton}
                  onPress={() => setShowOptionsMenu(!showOptionsMenu)}
                >
                  <MoreVertical size={14} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {showOptionsMenu && (
              <View style={styles.optionsMenu}>
                <Pressable
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 size={18} color={Colors.error} />
                  <Text style={styles.optionsMenuItemTextDanger}>
                    {t('contact.menu.delete')}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={styles.heroContent}>
              <ContactAvatar
                firstName={contact.firstName}
                lastName={contact.lastName}
                gender={contact.gender}
                avatarUrl={contact.avatarUrl}
                size="large"
                onPress={() => setShowAvatarModal(true)}
                showEditBadge
                cacheKey={contact.updatedAt}
                isGenerating={isAvatarGenerating(contactId)}
              />
              <View style={styles.heroTextColumn}>
                {contact.lastContactAt && (
                  <Text style={styles.heroEyebrow}>
                    {t('contact.lastContact').toUpperCase()} {formatLocalizedDate(contact.lastContactAt, { day: 'numeric', month: 'short' }).toUpperCase()}
                  </Text>
                )}
                <Text style={styles.contactName}>
                  {contact.firstName} {contact.lastName || ''}
                </Text>
                <View style={styles.profileMetaRows}>
                  <View style={styles.groupMetaRow}>
                    {contactGroups.length > 0 ? (
                      <>
                        <Pressable style={styles.groupChip} onPress={handleOpenGroupsSheet}>
                          <Text style={styles.groupChipText}>{primaryGroupName}</Text>
                        </Pressable>
                        {contactGroups.length > 1 && (
                          <Pressable style={styles.groupChip} onPress={handleOpenGroupsSheet}>
                            <Text style={styles.groupChipText}>+{contactGroups.length - 1}</Text>
                          </Pressable>
                        )}
                        <Pressable
                          style={styles.manageGroupsButton}
                          onPress={handleOpenGroupsSheet}
                          accessibilityLabel={t('contact.groupsSheet.title')}
                        >
                          <Users size={13} color={Colors.primary} />
                        </Pressable>
                      </>
                    ) : (
                      <Pressable style={styles.addGroupButton} onPress={handleOpenGroupsSheet}>
                        <Plus size={12} color={Colors.primary} />
                        <Text style={styles.addGroupText}>{t('contact.addGroup')}</Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.contactInfoRow}>
                    <Pressable
                      style={[
                        styles.infoChip,
                        birthdayLabel ? styles.infoChipFilled : styles.infoChipEmpty,
                      ]}
                      onPress={() => birthdaySheetRef.current?.present()}
                    >
                      <Text style={styles.infoChipEmoji}>🎂</Text>
                      <Text style={styles.infoChipText}>
                        {birthdayLabel || t('contactProfile.tileBirthdayEmpty')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.iconChip,
                        contact.phone ? styles.infoChipFilled : styles.infoChipEmpty,
                      ]}
                      onPress={() => phoneSheetRef.current?.present()}
                      accessibilityLabel={contact.phone || t('contact.contactCard.addPhone')}
                    >
                      <Phone size={13} color={contact.phone ? Colors.primary : Colors.textMuted} strokeWidth={2.3} />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.iconChip,
                        contact.email ? styles.infoChipFilled : styles.infoChipEmpty,
                      ]}
                      onPress={() => emailSheetRef.current?.present()}
                      accessibilityLabel={contact.email || t('contact.contactCard.addEmail')}
                    >
                      <Mail size={13} color={contact.email ? Colors.primary : Colors.textMuted} strokeWidth={2.3} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.bentoSection}>
          {firstPastUnresolvedTopic && (
            <PostEventFollowUpCard
              topic={firstPastUnresolvedTopic}
              onResolve={() => handleResolvePostEventTopic(firstPastUnresolvedTopic.id)}
              onTellStory={() => handleTellPostEventStory(firstPastUnresolvedTopic.id)}
            />
          )}

          <Pressable style={styles.heroTile} onPress={handleNavigateComingUp}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroTileBackground}
            >
              <View style={styles.heroTileHeader}>
                <Text style={styles.heroTileEyebrow}>
                  {t('contactProfile.heroTileEyebrow', { firstName: contact.firstName })}
                </Text>
                <View style={styles.heroTileViewAllRow}>
                  <Text style={styles.heroTileViewAll}>{t('contactProfile.viewAll')}</Text>
                  <ArrowRight size={12} color={Colors.textInverse} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={styles.heroTileTitle}>
                {totalUpcoming > 0
                  ? t('contactProfile.heroTileTitle', { count: totalUpcoming })
                  : t('contactProfile.heroTileEmpty')}
              </Text>
              {upcomingPreview.length > 0 && (
                <View style={styles.heroTimelineWrapper}>
                  <View style={styles.heroTimelineLine} />
                  {upcomingPreview.map((entry, index) => {
                    const accent = toneAccent[entry.tone];
                    return (
                      <View key={entry.id} style={styles.heroTimelineRow}>
                        <View style={[styles.heroTimelineDot, { backgroundColor: index === 0 ? Colors.textInverse : 'rgba(255,255,255,0.7)', borderColor: accent }]} />
                        <Text style={styles.heroTimelineDate}>{entry.dateLabel}</Text>
                        <Text style={styles.heroTimelineLabel} numberOfLines={1}>{entry.label}</Text>
                        <Text style={styles.heroTimelineSoon} numberOfLines={1}>{entry.soonLabel}</Text>
                      </View>
                    );
                  })}
                  {remainingUpcoming > 0 && (
                    <View style={styles.heroTimelineMore}>
                      <Text style={styles.heroTimelineMoreText}>
                        +{remainingUpcoming} {t('contactProfile.moreUpcoming')}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </LinearGradient>
          </Pressable>

          {summaryHasContent ? (
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.summaryInlineWrap}>
              <View style={styles.summaryFloating}>
                <View style={styles.summaryFloatingHeader}>
                  <BookOpen size={13} color={Colors.primary} strokeWidth={2.4} />
                  <Text style={styles.summaryFloatingLabel}>
                    {t('contactProfile.summaryHeaderShort')}
                  </Text>
                  <View style={styles.summaryHeaderActions}>
                    {hasNotes && (
                      <Pressable
                        style={styles.summaryRefreshButton}
                        onPress={handleRegenerateSummary}
                        disabled={regenerateSummaryMutation.isPending}
                      >
                        <RefreshCcw size={10} color={Colors.primary} strokeWidth={2.4} />
                      </Pressable>
                    )}
                  </View>
                </View>
                <Text
                  style={styles.summaryFloatingBody}
                  numberOfLines={isSummaryExpanded ? undefined : 2}
                >
                  {summaryText}
                </Text>
                <Text
                  style={[styles.summaryFloatingBody, styles.summaryMeasureText]}
                  onTextLayout={(event) => {
                    const nextIsClamped = event.nativeEvent.lines.length > 2;
                    setIsSummaryClamped((previous) => previous === nextIsClamped ? previous : nextIsClamped);
                  }}
                >
                  {summaryText}
                </Text>
                {(isSummaryClamped || isSummaryExpanded) && !isWaitingForSummary && (
                  <View style={styles.summaryMoreRow}>
                    <Pressable
                      style={styles.summaryMoreButton}
                      onPress={() => setIsSummaryExpanded((current) => !current)}
                    >
                      <Text style={styles.summaryMoreButtonText}>
                        {isSummaryExpanded
                          ? t('contactProfile.summaryLess')
                          : t('contactProfile.summaryMore')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={styles.summaryInlineWrap}>
              <View style={styles.summaryFloating}>
                <View style={styles.summaryFloatingHeader}>
                  <BookOpen size={13} color={Colors.primary} strokeWidth={2.4} />
                  <Text style={styles.summaryFloatingLabel}>
                    {t('contactProfile.summaryHeaderShort')}
                  </Text>
                </View>
                <Text style={styles.summaryFloatingBody} numberOfLines={2}>
                  {t('contactProfile.summaryEmptyTitle', { firstName: contact.firstName })}
                </Text>
              </View>
            </Animated.View>
          )}

          <View style={styles.bentoRow}>
            <Pressable style={styles.smallTile} onPress={handleNavigateIcebreakers}>
              <Sparkles size={20} color={Colors.primary} strokeWidth={2.2} />
              <Text style={styles.smallTileTitle}>{t('contactProfile.tileIcebreakers')}</Text>
              <Text style={styles.smallTileMeta}>
                {t('contactProfile.tileIcebreakersMeta', { count: contact.suggestedQuestions?.length ?? 0 })}
              </Text>
              <View style={styles.tileChevron}>
                <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2.4} />
              </View>
            </Pressable>

            <Pressable style={styles.smallTile} onPress={handleNavigateNotes}>
              <MessageCircle size={20} color={Colors.mint} strokeWidth={2.2} />
              <Text style={styles.smallTileTitle}>{t('contactProfile.tileAllNotes')}</Text>
              <Text style={styles.smallTileMeta}>
                {t('contactProfile.tileAllNotesMeta', { count: contact.notes.length })}
              </Text>
              <View style={styles.tileChevron}>
                <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2.4} />
              </View>
            </Pressable>
          </View>

          <View style={styles.bentoRow}>
            <Pressable
              style={styles.smallTile}
              onPress={() => meetingContextSheetRef.current?.present()}
            >
              <MapPin size={20} color={Colors.accent} strokeWidth={2.2} />
              <Text style={styles.smallTileTitle}>{t('contactProfile.tileWhereWeMet')}</Text>
              <Text style={styles.smallTileMeta} numberOfLines={2}>
                {meetingContext?.context || t('contactProfile.tileWhereWeMetEmpty')}
              </Text>
              <View style={styles.tileChevron}>
                <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2.4} />
              </View>
            </Pressable>

            <Pressable style={styles.smallTile} onPress={() => lovesSheetRef.current?.present()}>
              <Heart size={20} color={Colors.error} fill={Colors.error} strokeWidth={2.2} />
              <Text style={styles.smallTileTitle}>{t('contactProfile.tileLoves')}</Text>
              {loves.length > 0 ? (
                <View style={styles.loveChipsRow}>
                  {loves.slice(0, 3).map((love) => (
                    <View key={love} style={styles.loveChip}>
                      <Text style={styles.loveChipText} numberOfLines={1}>{love}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.smallTileMeta} numberOfLines={1}>
                  {t('contactProfile.tileLovesEmpty')}
                </Text>
              )}
              <View style={styles.tileChevron}>
                <ChevronRight size={14} color={Colors.textMuted} strokeWidth={2.4} />
              </View>
            </Pressable>
          </View>

          <Pressable style={styles.catchupReminderTile} onPress={handleReminderFrequencyPress}>
            <View style={styles.catchupReminderIconWrap}>
              <Bell size={18} color={Colors.amber} strokeWidth={2.2} />
            </View>
            <View style={styles.catchupReminderTextColumn}>
              <Text style={styles.catchupReminderTitle}>{t('contactProfile.tileCatchupReminder')}</Text>
              <Text style={styles.catchupReminderSubtitle} numberOfLines={1}>
                {getCatchupTileLabel(contact.reminderFrequencyDays)}
              </Text>
            </View>
            {!isPremium && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
            <ChevronRight size={16} color={Colors.textMuted} strokeWidth={2.4} />
          </Pressable>

        </Animated.View>

      </ScrollView>

      {!screenshotMode && (
        <View
          pointerEvents="box-none"
          style={[styles.floatingActions, { bottom: insets.bottom + 18 }]}
        >
          <Pressable
            style={styles.floatingAskButton}
            onPress={handleAskAboutContact}
            accessibilityLabel={t('contactProfile.actionAsk')}
          >
            <Sparkles size={22} color={Colors.primary} strokeWidth={2.3} />
          </Pressable>

          <Pressable
            style={styles.floatingNewNoteButton}
            onPress={() => handleAddNote('audio' as InputMode)}
            accessibilityLabel={t('contactProfile.actionNewNote')}
          >
            <Mic size={20} color={Colors.textInverse} strokeWidth={2.4} />
            <Text style={styles.floatingNewNoteText}>
              {t('contactProfile.actionNewNote')}
            </Text>
          </Pressable>
        </View>
      )}

      <DeleteContactDialog
        visible={showDeleteDialog}
        contactName={`${contact.firstName} ${contact.lastName || ''}`.trim()}
        contactFirstName={contact.firstName}
        contactLastName={contact.lastName}
        avatarUrl={contact.avatarUrl}
        gender={contact.gender}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={async () => {
          setShowDeleteDialog(false);
          await handleDelete();
        }}
      />

      <PhoneEditSheet
        ref={phoneSheetRef}
        initialValue={contact.phone}
        onSave={handleSavePhone}
      />

      <EmailEditSheet
        ref={emailSheetRef}
        initialValue={contact.email}
        onSave={handleSaveEmail}
      />

      <BirthdayEditSheet
        ref={birthdaySheetRef}
        initialDay={contact.birthdayDay}
        initialMonth={contact.birthdayMonth}
        initialYear={contact.birthdayYear}
        onSave={handleSaveBirthday}
      />

      {showAvatarModal && (
        <AvatarEditModal
          visible={showAvatarModal}
          contactId={contactId}
          firstName={contact?.firstName || ''}
          currentAvatarUrl={contact?.avatarUrl}
          onSave={() => invalidate()}
          onClose={() => setShowAvatarModal(false)}
        />
      )}

      <NameEditSheet
        ref={nameSheetRef}
        initialFirstName={contact.firstName}
        initialLastName={contact.lastName}
        onSave={handleSaveName}
      />

      <MeetingContextEditSheet
        ref={meetingContextSheetRef}
        initialValue={meetingContext?.context || ''}
        onSave={handleSaveMeetingContext}
      />

      <LovesEditSheet
        ref={lovesSheetRef}
        initialLoves={loves}
        onSave={handleSaveLoves}
      />

      <GroupsManagementSheet
        ref={groupsSheetRef}
        contactId={contactId}
        contactFirstName={contact.firstName}
        allGroups={allGroups}
        contactGroups={contactGroups}
      />

      <OptionPickerSheet
        ref={reminderFrequencySheetRef}
        title={t('contact.reminderFrequency')}
        options={reminderFrequencyOptions}
        selectedValue={contact.reminderFrequencyDays}
        onSelect={handleReminderFrequencySelect}
      />

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall
          reason="proactive_reminders"
          onClose={() => setShowPaywall(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: Colors.textSecondary, fontSize: 16 },
  scrollView: { flex: 1, backgroundColor: Colors.background },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsMenu: {
    position: 'absolute',
    top: 90,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    minWidth: 200,
    zIndex: 20,
    ...Shadows.floating,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionsMenuItemTextDanger: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  heroTextColumn: { flex: 1 },
  heroEyebrow: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  contactName: {
    fontFamily: Fonts.sans.bold,
    fontSize: 26,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  profileMetaRows: {
    marginTop: 8,
    gap: 7,
  },
  groupMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  contactInfoRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
  },
  groupChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  groupChipText: {
    color: Colors.primary,
    fontSize: 11,
    fontFamily: Fonts.sans.bold,
  },
  infoChip: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 14,
  },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoChipFilled: {
    backgroundColor: Colors.surface,
  },
  infoChipEmpty: {
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  infoChipEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoChipText: {
    color: Colors.primary,
    fontSize: 11,
    fontFamily: Fonts.sans.bold,
  },
  manageGroupsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addGroupText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: Fonts.sans.bold,
  },
  bentoSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  heroTile: {
    borderRadius: 22,
    overflow: 'hidden',
    ...Shadows.card,
  },
  heroTileBackground: {
    padding: 18,
  },
  heroTileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTileEyebrow: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.78)',
    flex: 1,
  },
  heroTileViewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroTileViewAll: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    color: Colors.textInverse,
  },
  heroTileTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: Colors.textInverse,
    marginTop: 6,
  },
  heroTimelineWrapper: {
    marginTop: 14,
    paddingLeft: 4,
    gap: 8,
  },
  heroTimelineLine: {
    position: 'absolute',
    left: 8,
    top: 6,
    bottom: 6,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 18,
    position: 'relative',
  },
  heroTimelineDot: {
    position: 'absolute',
    left: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  heroTimelineDate: {
    width: 50,
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.9)',
  },
  heroTimelineLabel: {
    flex: 1,
    fontFamily: Fonts.sans.bold,
    fontSize: 13.5,
    letterSpacing: -0.1,
    color: Colors.textInverse,
  },
  heroTimelineSoon: {
    minWidth: 44,
    marginLeft: 4,
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'right',
  },
  heroTimelineMore: {
    paddingLeft: 18,
    marginTop: 2,
  },
  heroTimelineMoreText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    minHeight: 110,
    ...Shadows.card,
  },
  smallTileTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
    marginTop: 10,
  },
  smallTileMeta: {
    fontFamily: Fonts.sans.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  loveChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  loveChip: {
    maxWidth: '100%',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  loveChipText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  tileChevron: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.55,
  },
  tileTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catchupReminderTile: {
    minHeight: 74,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.card,
  },
  catchupReminderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catchupReminderTextColumn: {
    flex: 1,
  },
  catchupReminderTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  catchupReminderSubtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionTile: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionTilePrimary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  actionTileSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  actionTileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileIconWrapSecondary: {
    backgroundColor: Colors.primaryLight,
  },
  actionTileTextColumn: { flex: 1 },
  actionTilePrimaryTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    color: Colors.textInverse,
    letterSpacing: -0.1,
  },
  actionTilePrimarySubtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  actionTileSecondaryTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: -0.1,
  },
  actionTileSecondarySubtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  floatingActions: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingAskButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    shadowColor: '#1D1A2E',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  floatingNewNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  floatingNewNoteText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: Colors.textInverse,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  summaryFloatingWrap: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  summaryInlineWrap: {
    width: '100%',
  },
  summaryFloating: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.hairline,
    shadowColor: '#1D1A2E',
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  summaryFloatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 7,
  },
  summaryFloatingLabel: {
    flex: 1,
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.primary,
  },
  summaryHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  summaryMoreButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  summaryMoreButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  summaryRefreshButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryFloatingBody: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.textPrimary,
  },
  summaryMoreRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  summaryMeasureText: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 42,
    opacity: 0,
  },
  summaryEmptyWrap: {
    paddingHorizontal: 20,
    marginTop: 22,
    alignItems: 'center',
  },
  summaryEmptyTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  summaryEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  summaryEmptyButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13.5,
    color: Colors.textInverse,
  },
  proBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
