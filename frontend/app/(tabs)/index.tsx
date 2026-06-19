import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { useState, useRef, useCallback, useMemo } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useContactPreviewsQuery } from '@/hooks/useContactPreviewsQuery';
import { useGroupsQuery, useContactIdsForGroup, useGroupContactCounts } from '@/hooks/useGroupsQuery';
import { Contact, HotTopic } from '@/types';
import {
  Search,
  Plus,
  ListFilter,
  Mic,
  X,
  Users,
  AlertTriangle,
  Bell,
  CalendarDays,
  BotMessageSquare,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Flag,
  Flame,
  Sunrise,
} from 'lucide-react-native';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { ContactListSkeleton } from '@/components/skeleton/ContactListSkeleton';
import { CreateContactSheet } from '@/components/contact/CreateContactSheet';
import { ContactSortSheet, getContactSortLabelKey } from '@/components/contact/ContactSortSheet';
import { GlobalGroupsManagementSheet } from '@/components/contact/GlobalGroupsManagementSheet';
import { Paywall } from '@/components/Paywall';
import { queryKeys } from '@/lib/query-keys';
import { contactService } from '@/services/contact.service';
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { getDateLocale } from '@/utils/dateLocale';
import { useSettingsStore } from '@/stores/settings-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { useAppStore } from '@/stores/app-store';
import { useContactSortPreference } from '@/hooks/useContactSortPreference';
import { generateAvatarFromHints } from '@/lib/api';
import { showErrorToast, showInfoToast } from '@/lib/error-handler';
import { buildGroupChips } from '@/lib/group-cache';
import { getOverdueCatchupItems } from '@/utils/catchup';
import { getHotTopicDateTone, type HotTopicDateToneName } from '@/utils/hotTopics';
import { sortContacts } from '@/utils/contactSort';

const FOLLOW_UP_THRESHOLD_DAYS = 14;

const prefetchContactDetails = (
  queryClient: QueryClient,
  contactId: string
) => {
  queryClient.prefetchQuery({
    queryKey: queryKeys.contacts.detail(contactId),
    queryFn: () => contactService.getById(contactId),
    staleTime: 5 * 60 * 1000,
  });
};

function getTopHotTopics(hotTopics: HotTopic[], maxCount: number = 2): { topics: HotTopic[]; remainingCount: number } {
  if (!hotTopics || hotTopics.length === 0) return { topics: [], remainingCount: 0 };

  const activeTopics = hotTopics.filter((topic) => topic.status === 'active');

  const sortedTopics = activeTopics.sort((topicA, topicB) => {
    if (topicA.eventDate && topicB.eventDate) {
      return parseISO(topicA.eventDate).getTime() - parseISO(topicB.eventDate).getTime();
    }
    if (topicA.eventDate) return -1;
    if (topicB.eventDate) return 1;
    return 0;
  });

  return {
    topics: sortedTopics.slice(0, maxCount),
    remainingCount: Math.max(0, sortedTopics.length - maxCount),
  };
}

function formatHotTopicDate(dateString: string): string {
  try {
    return format(parseISO(dateString), 'd MMM', { locale: getDateLocale() });
  } catch {
    return '';
  }
}

function formatLastContactTime(lastContactAt: string | undefined): string {
  if (!lastContactAt) return '';
  try {
    return formatDistanceToNow(parseISO(lastContactAt), {
      addSuffix: false,
      locale: getDateLocale(),
    });
  } catch {
    return '';
  }
}

const hotTopicIcons: Record<HotTopicDateToneName, typeof CalendarDays> = {
  overdue: AlertTriangle,
  imminent: Flame,
  thisWeek: Bell,
  thisMonth: CalendarDays,
  thisQuarter: Flag,
  later: Sunrise,
  undated: CircleDashed,
};

function getHotTopicIcon(toneName: HotTopicDateToneName) {
  return hotTopicIcons[toneName];
}

export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { contacts, isLoading, refetch, isPlaceholderData } = useContactsQuery();
  const { previews: contactPreviews, refetchAll: refetchPreviews } = useContactPreviewsQuery(contacts);
  const { groups, refetch: refetchGroups } = useGroupsQuery();
  const { data: contactCountByGroupId = {}, refetch: refetchGroupContactCounts } =
    useGroupContactCounts();
  const notSeenThresholdDays = useSettingsStore((state) => state.notSeenThresholdDays);
  const hasSeenGuidedTour = useSettingsStore((state) => state.hasSeenGuidedTour);
  const setHasSeenGuidedTour = useSettingsStore((state) => state.setHasSeenGuidedTour);
  const syncQuotas = useSubscriptionStore((state) => state.syncQuotas);
  const canCreateContact = useSubscriptionStore((state) => state.canCreateContact);
  const {
    addPendingAvatarGeneration,
    removePendingAvatarGeneration,
    isAvatarGenerating,
    setPreselectedContactId,
    setPreselectedHotTopicId,
  } = useAppStore();
  const { sortMode, setSortMode, isSaving: isSavingSortMode } = useContactSortPreference();

  const [showPaywall, setShowPaywall] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const createContactSheetRef = useRef<BottomSheetModal>(null);
  const groupsSheetRef = useRef<BottomSheetModal>(null);
  const sortSheetRef = useRef<BottomSheetModal>(null);

  const { data: groupContactIds, refetch: refetchGroupContactIds } =
    useContactIdsForGroup(selectedGroupId);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchPreviews();
      refetchGroups();
      refetchGroupContactCounts();
      if (selectedGroupId) {
        refetchGroupContactIds();
      }
      syncQuotas();
    }, [
      refetch,
      refetchPreviews,
      refetchGroups,
      refetchGroupContactCounts,
      refetchGroupContactIds,
      selectedGroupId,
      syncQuotas,
    ])
  );

  const handleGroupSelect = (groupId: string | null) => {
    setSelectedGroupId(groupId === selectedGroupId ? null : groupId);
  };

  const handleOpenCreateContact = () => {
    if (!canCreateContact(contacts.length)) {
      setShowPaywall(true);
      return;
    }

    createContactSheetRef.current?.present();
  };

  const formatPeopleCount = (count: number) => t('contacts.peopleCount', { count });

  const handleCreateContact = async (firstName: string, lastName: string): Promise<Contact | null> => {
    if (!canCreateContact(contacts.length)) {
      createContactSheetRef.current?.dismiss();
      setShowPaywall(true);
      return null;
    }

    const newContact = await contactService.create({
      firstName,
      lastName: lastName || undefined,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });

    addPendingAvatarGeneration(newContact.id);
    showInfoToast(
      t('contacts.createModal.createdTitle'),
      t('contacts.createModal.avatarPendingDescription'),
      6000
    );
    generateAvatarFromHints({
      contactId: newContact.id,
      gender: 'unknown',
      avatarHints: {
        physical: null,
        personality: null,
        interest: null,
        context: null,
      },
    })
      .then(async (result) => {
        await contactService.update(newContact.id, { avatarUrl: result.avatarUrl });
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(newContact.id) });
      })
      .catch((error) => {
        console.warn('[Avatar Auto] Generation failed after contact creation:', error);
        showErrorToast(t('contact.avatar.generateError'));
      })
      .finally(() => {
        removePendingAvatarGeneration(newContact.id);
      });

    return newContact;
  };

  const openManualContactRecord = (contact: Contact, initialMode: 'audio' | 'text') => {
    setPreselectedContactId(contact.id);
    setPreselectedHotTopicId(null);
    router.push({
      pathname: '/record',
      params: { initialMode },
    });
  };

  const handleManualContactSkip = (contact: Contact) => {
    router.push(`/contact/${contact.id}`);
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: Contact }[] }) => {
      viewableItems.forEach(({ item }) => {
        prefetchContactDetails(queryClient, item.id);
      });
    },
    [queryClient]
  );

  const hasAnimatedRef = useRef(false);
  const shouldAnimate = !hasAnimatedRef.current && !isPlaceholderData;
  if (contacts.length > 0 && !isPlaceholderData) {
    hasAnimatedRef.current = true;
  }

  const needsFollowupCount = useMemo(() => {
    return contacts.filter((contact) => {
      if (!contact.lastContactAt) return false;
      const daysSince = differenceInDays(new Date(), parseISO(contact.lastContactAt));
      return daysSince >= (notSeenThresholdDays || FOLLOW_UP_THRESHOLD_DAYS);
    }).length;
  }, [contacts, notSeenThresholdDays]);

  const allContacts = useMemo(() => {
    let filteredContacts = contacts;

    if (selectedGroupId && groupContactIds) {
      filteredContacts = filteredContacts.filter((contact) =>
        groupContactIds.includes(contact.id)
      );
    }

    if (filterText.trim()) {
      const searchTerm = filterText.toLowerCase();
      filteredContacts = filteredContacts.filter((contact) =>
        contact.firstName.toLowerCase().includes(searchTerm) ||
        (contact.lastName?.toLowerCase().includes(searchTerm))
      );
    }

    return sortContacts(filteredContacts, contactPreviews, sortMode);
  }, [contacts, filterText, selectedGroupId, groupContactIds, contactPreviews, sortMode]);

  const overdueItems = useMemo(
    () => getOverdueCatchupItems(allContacts, contactPreviews),
    [allContacts, contactPreviews]
  );

  const overdueHotTopicCount = useMemo(() => {
    return overdueItems.length;
  }, [overdueItems]);

  const overdueContacts = useMemo(() => {
    const seenContactIds = new Set<string>();
    return overdueItems
      .filter((item) => {
        if (seenContactIds.has(item.contact.id)) return false;
        seenContactIds.add(item.contact.id);
        return true;
      })
      .map((item) => ({ contact: item.contact }));
  }, [overdueItems]);

  const handleRefresh = async () => {
    setIsPullRefreshing(true);
    await Promise.all([
      refetch(),
      refetchPreviews(),
      refetchGroups(),
      refetchGroupContactCounts(),
      selectedGroupId ? refetchGroupContactIds() : Promise.resolve(),
    ]);
    setIsPullRefreshing(false);
  };

  const groupChips = useMemo(() => {
    return buildGroupChips({
      allGroups: groups,
      contactCountByGroupId,
      allGroupLabel: t('contacts.allGroup'),
      totalContactsCount: contacts.length,
    });
  }, [groups, contactCountByGroupId, contacts.length, t]);

  const renderContact = ({ item, index }: { item: Contact; index: number }) => {
    const preview = contactPreviews.get(item.id);
    const hotTopics = preview?.hotTopics || [];
    const { topics: topHotTopics } = getTopHotTopics(hotTopics, 2);
    const lastContactText = formatLastContactTime(item.lastContactAt);

    const content = (
      <Pressable
        style={styles.contactCard}
        onPress={() => router.push(`/contact/${item.id}`)}>
        <ContactAvatar
          firstName={item.firstName}
          lastName={item.lastName}
          gender={item.gender}
          avatarUrl={item.avatarUrl}
          size="small"
          cacheKey={item.updatedAt}
          recyclingKey={item.id}
          isGenerating={isAvatarGenerating(item.id)}
        />

        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <Text style={styles.contactName}>
              {getContactDisplayName(item)}
            </Text>
            {lastContactText ? (
              <Text style={styles.lastContactTime}>{lastContactText}</Text>
            ) : null}
          </View>

          {topHotTopics.length > 0 && (
            <View style={styles.topicPillsRow}>
              {topHotTopics.map((topic) => {
                const tone = getHotTopicDateTone(topic.eventDate);
                const HotTopicIcon = getHotTopicIcon(tone.name);
                const formattedDate = topic.eventDate ? formatHotTopicDate(topic.eventDate) : '';
                return (
                  <View
                    key={topic.id}
                    style={[
                      styles.topicPill,
                      { borderColor: tone.borderColor },
                    ]}
                  >
                    <View style={[
                      styles.topicPillIcon,
                      { backgroundColor: tone.iconBackgroundColor },
                    ]}>
                      <HotTopicIcon size={13} color={tone.iconColor} strokeWidth={2.4} />
                    </View>
                    <Text
                      style={[
                        styles.topicPillText,
                        { color: tone.textColor },
                      ]}
                      numberOfLines={1}
                    >
                      {topic.title}
                    </Text>
                    {formattedDate && (
                      <Text style={[
                        styles.topicPillDate,
                        {
                          backgroundColor: tone.dateBackgroundColor,
                          color: tone.dateTextColor,
                        },
                      ]}>
                        {'· '}{formattedDate}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </Pressable>
    );

    if (shouldAnimate) {
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          {content}
        </Animated.View>
      );
    }

    return content;
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + 16 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.screenTitle}>Contacts</Text>
            <View style={styles.headerDot} />
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerActionButton}
              onPress={handleOpenCreateContact}>
              <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              style={styles.headerActionButton}
              onPress={() => sortSheetRef.current?.present()}>
              <ListFilter size={17} color={Colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {needsFollowupCount > 0 && (
          <View style={styles.followUpRow}>
            <Text style={styles.followUpText}>
              <Text style={styles.followUpBold}>{formatPeopleCount(needsFollowupCount)}</Text>
              {' '}{t('contacts.needFollowUp')}{' '}
            </Text>
            <Text style={styles.followUpArrow}>{'↗'}</Text>
          </View>
        )}

        {/* Search */}
        {contacts.length > 0 && (
          <View style={styles.searchBar}>
            <Search size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('contacts.filterPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={filterText}
              onChangeText={setFilterText}
            />
            {filterText.length > 0 ? (
              <Pressable onPress={() => setFilterText('')} hitSlop={8}>
                <X size={16} color={Colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Group chips */}
        {contacts.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            {groupChips.map((chip) => {
              const isActive = chip.id === null
                ? selectedGroupId === null
                : selectedGroupId === chip.id;
              return (
                <Pressable
                  key={chip.id ?? 'all'}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => handleGroupSelect(chip.id)}>
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {chip.name}
                  </Text>
                  <Text style={[styles.chipCount, isActive && styles.chipCountActive]}>
                    {chip.count}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={styles.manageGroupsChip}
              onPress={() => groupsSheetRef.current?.present()}>
              <Users size={12} color={Colors.textMuted} />
            </Pressable>
          </ScrollView>
        )}

        {overdueHotTopicCount > 0 && (
          <Pressable
            style={styles.overdueBanner}
            onPress={() => router.push('/catch-up')}
          >
            <View style={styles.overdueAvatarStack}>
              {overdueContacts.slice(0, 2).map(({ contact }, avatarIndex) => (
                <View
                  key={contact.id}
                  style={[
                    styles.overdueAvatarFrame,
                    avatarIndex > 0 && styles.overdueAvatarOffset,
                  ]}
                >
                  <ContactAvatar
                    firstName={contact.firstName}
                    lastName={contact.lastName}
                    gender={contact.gender}
                    avatarUrl={contact.avatarUrl}
                    size="tiny"
                    cacheKey={contact.updatedAt}
                    recyclingKey={`overdue-${contact.id}`}
                    isGenerating={isAvatarGenerating(contact.id)}
                  />
                </View>
              ))}
            </View>
            <View style={styles.overdueTextColumn}>
              <Text style={styles.overdueTitle} numberOfLines={1}>
                {t('contacts.overdueHotTopics', { count: overdueHotTopicCount })}
              </Text>
              <Text style={styles.overdueSubtitle} numberOfLines={1}>
                {t('contacts.overdueHotTopicsSubtitle')}
              </Text>
            </View>
            <ChevronRight size={18} color="#D73524" strokeWidth={2.6} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ContactListSkeleton count={6} />
      ) : contacts.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>{'🌱'}</Text>
          <Text style={styles.emptyStateTitle}>
            {t('contacts.noContacts')}
          </Text>
          <Pressable
            style={styles.emptyStateButton}
            onPress={() => router.push('/record')}>
            <Mic size={16} color={Colors.textInverse} />
            <Text style={styles.emptyStateButtonText}>
              {t('contacts.createFirstNote')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{t(getContactSortLabelKey(sortMode))}</Text>
            <Text style={styles.sectionCount}>{formatPeopleCount(allContacts.length)}</Text>
          </View>

          {allContacts.length === 0 && selectedGroupId ? (
            <View style={styles.emptyGroupContainer}>
              <Users size={48} color={Colors.textMuted} />
              <Text style={styles.emptyGroupText}>
                {t('contacts.noContactsInGroup')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={allContacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              refreshControl={
                <RefreshControl
                  refreshing={isPullRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={Colors.primary}
                />
              }
            />
          )}
        </>
      )}

      <CreateContactSheet
        ref={createContactSheetRef}
        onCreate={handleCreateContact}
        onRecordVoice={(contact) => openManualContactRecord(contact, 'audio')}
        onRecordType={(contact) => openManualContactRecord(contact, 'text')}
        onSkip={handleManualContactSkip}
      />

      <ContactSortSheet
        ref={sortSheetRef}
        selectedMode={sortMode}
        isSaving={isSavingSortMode}
        onSelectMode={setSortMode}
      />

      <GlobalGroupsManagementSheet ref={groupsSheetRef} />

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} reason="contact_limit" />
      </Modal>

      <Modal
        visible={!hasSeenGuidedTour}
        transparent
        animationType="fade"
        onRequestClose={() => setHasSeenGuidedTour(true)}
      >
        <Pressable
          style={[
            styles.guidedTourOverlay,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
          onPress={() => setHasSeenGuidedTour(true)}
        >
          <Pressable style={styles.guidedTourCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.guidedTourIcon}>
              <Mic size={24} color={Colors.textInverse} strokeWidth={2.5} />
            </View>
            <Text style={styles.guidedTourTitle}>{t('guidedTour.title')}</Text>
            <Text style={styles.guidedTourDescription}>{t('guidedTour.description')}</Text>

            <View style={styles.guidedTourSteps}>
              <View style={styles.guidedTourStep}>
                <Users size={17} color={Colors.primary} strokeWidth={2.2} />
                <Text style={styles.guidedTourStepText}>{t('guidedTour.stepContacts')}</Text>
              </View>
              <View style={styles.guidedTourStep}>
                <CalendarDays size={17} color={Colors.amber} strokeWidth={2.2} />
                <Text style={styles.guidedTourStepText}>{t('guidedTour.stepUpcoming')}</Text>
              </View>
              <View style={styles.guidedTourStep}>
                <BotMessageSquare size={17} color={Colors.accent} strokeWidth={2.2} />
                <Text style={styles.guidedTourStepText}>{t('guidedTour.stepAssistant')}</Text>
              </View>
            </View>

            <Pressable
              style={styles.guidedTourButton}
              onPress={() => setHasSeenGuidedTour(true)}
            >
              <CheckCircle2 size={17} color={Colors.textInverse} strokeWidth={2.4} />
              <Text style={styles.guidedTourButtonText}>{t('guidedTour.primary')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  screenTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginBottom: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  followUpText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  followUpBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  followUpArrow: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Shadows.card,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    ...Shadows.fab,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.textInverse,
  },
  chipCount: {
    fontSize: 11,
    color: Colors.textPrimary,
    opacity: 0.7,
  },
  chipCountActive: {
    color: Colors.textInverse,
    opacity: 0.7,
  },
  manageGroupsChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#FFDAD3',
    gap: 10,
  },
  overdueAvatarStack: {
    width: 58,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueAvatarFrame: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFC7BA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFDAD3',
  },
  overdueAvatarOffset: {
    marginLeft: -26,
  },
  overdueTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  overdueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 2,
  },
  overdueSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C2412F',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    ...Shadows.card,
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: Colors.textPrimary,
    flex: 1,
  },
  lastContactTime: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Fonts.mono,
    marginLeft: 8,
  },
  topicPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  topicPillIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topicPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    flexShrink: 1,
    minWidth: 0,
  },
  topicPillDate: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    flexShrink: 0,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  emptyStateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  emptyGroupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyGroupText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  guidedTourOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(29, 26, 46, 0.34)',
    paddingHorizontal: 18,
  },
  guidedTourCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.hairline,
    ...Shadows.floating,
  },
  guidedTourIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginBottom: 14,
  },
  guidedTourTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
  },
  guidedTourDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  guidedTourSteps: {
    marginTop: 16,
    gap: 10,
  },
  guidedTourStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },
  guidedTourStepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  guidedTourButton: {
    marginTop: 18,
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    ...Shadows.fab,
  },
  guidedTourButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
});
