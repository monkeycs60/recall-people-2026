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
import { useGroupsQuery, useContactIdsForGroup } from '@/hooks/useGroupsQuery';
import { Contact, HotTopic } from '@/types';
import {
  Search,
  Plus,
  Settings,
  Mic,
  X,
  Users,
} from 'lucide-react-native';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { ContactListSkeleton } from '@/components/skeleton/ContactListSkeleton';
import { CreateContactModal } from '@/components/contact/CreateContactModal';
import { GlobalGroupsManagementSheet } from '@/components/contact/GlobalGroupsManagementSheet';
import { Paywall } from '@/components/Paywall';
import { queryKeys } from '@/lib/query-keys';
import { contactService } from '@/services/contact.service';
import { formatDistanceToNow } from 'date-fns';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getDateLocale } from '@/utils/dateLocale';
import { useSettingsStore } from '@/stores/settings-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { useAppStore } from '@/stores/app-store';
import { generateAvatarFromHints } from '@/lib/api';
import { showErrorToast, showInfoToast } from '@/lib/error-handler';

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

function isWithinOneMonth(dateString: string | undefined): boolean {
  if (!dateString) return true;
  try {
    return differenceInDays(parseISO(dateString), new Date()) <= 30;
  } catch {
    return true;
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

export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { contacts, isLoading, refetch, isPlaceholderData } = useContactsQuery();
  const { previews: contactPreviews, refetchAll: refetchPreviews } = useContactPreviewsQuery(contacts);
  const { groups } = useGroupsQuery();
  const notSeenThresholdDays = useSettingsStore((state) => state.notSeenThresholdDays);
  const syncQuotas = useSubscriptionStore((state) => state.syncQuotas);
  const canCreateContact = useSubscriptionStore((state) => state.canCreateContact);
  const { addPendingAvatarGeneration, removePendingAvatarGeneration, isAvatarGenerating } = useAppStore();

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const groupsSheetRef = useRef<BottomSheetModal>(null);

  const { data: groupContactIds } = useContactIdsForGroup(selectedGroupId);

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchPreviews();
      syncQuotas();
    }, [refetch, refetchPreviews, syncQuotas])
  );

  const handleGroupSelect = (groupId: string | null) => {
    setSelectedGroupId(groupId === selectedGroupId ? null : groupId);
  };

  const handleOpenCreateContact = () => {
    if (!canCreateContact(contacts.length)) {
      setShowPaywall(true);
      return;
    }

    setIsCreateModalVisible(true);
  };

  const handleCreateContact = async (firstName: string, lastName: string) => {
    if (!canCreateContact(contacts.length)) {
      setIsCreateModalVisible(false);
      setShowPaywall(true);
      return;
    }

    const newContact = await contactService.create({
      firstName,
      lastName: lastName || undefined,
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    setIsCreateModalVisible(false);

    addPendingAvatarGeneration(newContact.id);
    showInfoToast(
      t('contact.avatar.generationStartedTitle'),
      t('contact.avatar.generationStartedDescription')
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

    router.push(`/contact/${newContact.id}`);
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Contact }> }) => {
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

    return filteredContacts.sort((contactA, contactB) => {
      const dateA = contactA.lastContactAt ? new Date(contactA.lastContactAt).getTime() : 0;
      const dateB = contactB.lastContactAt ? new Date(contactB.lastContactAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [contacts, filterText, selectedGroupId, groupContactIds]);

  const handleRefresh = async () => {
    setIsPullRefreshing(true);
    await Promise.all([refetch(), refetchPreviews()]);
    setIsPullRefreshing(false);
  };

  const groupChips = useMemo(() => {
    const allChip = { id: null as string | null, name: t('contacts.allGroup'), count: contacts.length };
    const groupList = groups.map((group) => ({
      id: group.id as string | null,
      name: group.name,
      count: 0,
    }));
    return [allChip, ...groupList];
  }, [groups, contacts, t]);

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
                const isHot = isWithinOneMonth(topic.eventDate);
                return (
                  <View
                    key={topic.id}
                    style={[
                      styles.topicPill,
                      { backgroundColor: isHot ? Colors.accentLight : Colors.amberLight },
                    ]}
                  >
                    <Text style={styles.topicPillEmoji}>
                      {isHot ? '\uD83D\uDD25' : '\uD83D\uDCC5'}
                    </Text>
                    <Text
                      style={[
                        styles.topicPillText,
                        { color: isHot ? '#B03A11' : '#6B4B00' },
                      ]}
                      numberOfLines={1}
                    >
                      {topic.title}
                    </Text>
                    {topic.eventDate && (
                      <Text style={styles.topicPillDate}>
                        {'· '}{formatHotTopicDate(topic.eventDate)}
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
            <Text style={styles.screenTitle}>Recall</Text>
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
              onPress={() => router.push('/(tabs)/profile')}>
              <Settings size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {needsFollowupCount > 0 && (
          <View style={styles.followUpRow}>
            <Text style={styles.followUpText}>
              <Text style={styles.followUpBold}>{needsFollowupCount} {t('contacts.people')}</Text>
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
            <Text style={styles.sectionLabel}>{t('contacts.recentSection')}</Text>
            <Text style={styles.sectionCount}>{allContacts.length} {t('contacts.people')}</Text>
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

      <CreateContactModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreate={handleCreateContact}
      />

      <GlobalGroupsManagementSheet ref={groupsSheetRef} />

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} reason="contact_limit" />
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
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topicPillEmoji: {
    fontSize: 11,
  },
  topicPillText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  topicPillDate: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    opacity: 0.55,
    color: Colors.textMuted,
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
});
