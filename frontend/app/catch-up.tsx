import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, ChevronLeft, Mic, X } from 'lucide-react-native';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useContactPreviewsQuery } from '@/hooks/useContactPreviewsQuery';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { getOverdueCatchupItems, type OverdueCatchupItem } from '@/utils/catchup';
import { hotTopicService } from '@/services/hot-topic.service';
import { queryKeys } from '@/lib/query-keys';
import { showErrorToast } from '@/lib/error-handler';
import { useAppStore } from '@/stores/app-store';

export default function CatchUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { contacts, refetch } = useContactsQuery();
  const { previews, refetchAll: refetchPreviews } = useContactPreviewsQuery(contacts);
  const setPreselectedContactId = useAppStore((state) => state.setPreselectedContactId);
  const setPreselectedHotTopicId = useAppStore((state) => state.setPreselectedHotTopicId);

  const [activeItem, setActiveItem] = useState<OverdueCatchupItem | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [optimisticallyResolvedIds, setOptimisticallyResolvedIds] = useState<Set<string>>(new Set());
  const [resolvedTodayCount, setResolvedTodayCount] = useState(0);

  const items = useMemo(() => (
    getOverdueCatchupItems(contacts, previews).filter(
      (item) => !optimisticallyResolvedIds.has(item.topic.id)
    )
  ), [contacts, previews, optimisticallyResolvedIds]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchPreviews()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refetchPreviews]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const openResolveSheet = (item: OverdueCatchupItem) => {
    setActiveItem(item);
    setResolutionText('');
  };

  const closeResolveSheet = () => {
    setActiveItem(null);
    setResolutionText('');
  };

  const resolveItem = async (item: OverdueCatchupItem, resolution?: string) => {
    const topicId = item.topic.id;
    const contactId = item.contact.id;

    // Optimistic: close the sheet and hide the item immediately so it feels instant.
    setActiveItem(null);
    setResolutionText('');
    setOptimisticallyResolvedIds((previousIds) => new Set(previousIds).add(topicId));
    setResolvedTodayCount((count) => count + 1);

    try {
      await hotTopicService.resolve(topicId, resolution?.trim() || undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(contactId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(contactId) });
      await refetchPreviews();
    } catch (error) {
      // Rollback: bring the item back and undo the counter.
      setOptimisticallyResolvedIds((previousIds) => {
        const nextIds = new Set(previousIds);
        nextIds.delete(topicId);
        return nextIds;
      });
      setResolvedTodayCount((count) => Math.max(0, count - 1));
      showErrorToast(t('errors.generic'));
    }
  };

  const handleResolveWithText = async () => {
    if (!activeItem) return;
    await resolveItem(activeItem, resolutionText);
  };

  const handleResolveWithoutNote = async () => {
    if (!activeItem) return;
    await resolveItem(activeItem);
  };

  const handleRecordTopic = (item: OverdueCatchupItem) => {
    setPreselectedContactId(item.contact.id);
    setPreselectedHotTopicId(item.topic.id);
    router.push({
      pathname: '/record',
      params: { initialMode: 'audio' },
    });
  };

  const renderTopicRow = (item: OverdueCatchupItem) => {
    return (
      <View key={item.topic.id} style={styles.topicRow}>
        <ContactAvatar
          firstName={item.contact.firstName}
          lastName={item.contact.lastName}
          gender={item.contact.gender}
          avatarUrl={item.contact.avatarUrl}
          size="tiny"
          cacheKey={item.contact.updatedAt}
          recyclingKey={`catch-up-${item.topic.id}`}
        />

        <View style={styles.topicTextColumn}>
          <View style={styles.topicHeaderLine}>
            <Text style={styles.contactName} numberOfLines={1}>
              {getContactDisplayName(item.contact)}
            </Text>
            <Text style={styles.overduePill} numberOfLines={1}>
              {t('catchUp.daysOverdue', { count: item.daysOverdue })}
            </Text>
          </View>
          <Text style={styles.topicTitle} numberOfLines={1}>
            {item.topic.title}
          </Text>
        </View>

        <View style={styles.topicActions}>
          <Pressable
            style={styles.iconButton}
            onPress={() => openResolveSheet(item)}
          >
            <Check size={16} color={Colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <Pressable
            style={styles.recordButton}
            onPress={() => handleRecordTopic(item)}
          >
            <Mic size={15} color={Colors.textInverse} strokeWidth={2.6} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.titleColumn}>
          <Text style={styles.title}>{t('catchUp.title')}</Text>
          <Text style={styles.subtitle}>
            {t('catchUp.subtitle', { count: items.length })}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
          items.length === 0 && styles.emptyScrollContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <CheckCircle2 size={38} color={Colors.textInverse} strokeWidth={2.5} />
            </View>
            <Text style={styles.emptyTitle}>{t('catchUp.allCaughtUpTitle')}</Text>
            <Text style={styles.emptyBody}>{t('catchUp.allCaughtUpBody')}</Text>
            {resolvedTodayCount > 0 && (
              <View style={styles.reconnectedPill}>
                <Text style={styles.reconnectedText}>
                  {t('catchUp.reconnectedToday', { count: resolvedTodayCount })}
                </Text>
              </View>
            )}
            <Pressable style={styles.backToContactsButton} onPress={() => router.dismissTo('/(tabs)')}>
              <Text style={styles.backToContactsText}>{t('catchUp.backToContacts')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel}>{t('catchUp.needsYouNow')}</Text>
            <View style={styles.topicList}>
              {items.map(renderTopicRow)}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!activeItem}
        transparent
        animationType="fade"
        onRequestClose={closeResolveSheet}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeResolveSheet}>
            <Pressable style={styles.resolveSheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetIcon}>
                  <Check size={16} color={Colors.success} strokeWidth={2.6} />
                </View>
                <View style={styles.sheetTitleColumn}>
                  <Text style={styles.sheetTitle}>{t('catchUp.resolveTitle')}</Text>
                  {activeItem && (
                    <Text style={styles.sheetSubtitle} numberOfLines={1}>
                      {activeItem.topic.title}
                    </Text>
                  )}
                </View>
                <Pressable style={styles.sheetCloseButton} onPress={closeResolveSheet}>
                  <X size={16} color={Colors.textMuted} strokeWidth={2.3} />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>{t('catchUp.outcomeLabel')}</Text>
              <TextInput
                style={styles.resolutionInput}
                value={resolutionText}
                onChangeText={setResolutionText}
                placeholder={t('catchUp.outcomePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                autoFocus
                spellCheck
                autoCorrect
              />

              <View style={styles.quickAddRow}>
                {[t('catchUp.quickWentWell'), t('catchUp.quickDidIt'), t('catchUp.quickCancelled')].map((label) => (
                  <Pressable
                    key={label}
                    style={styles.quickAddChip}
                    onPress={() => setResolutionText(label)}
                  >
                    <Text style={styles.quickAddText}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={styles.resolveButton}
                onPress={handleResolveWithText}
              >
                <Check size={16} color={Colors.textInverse} strokeWidth={2.6} />
                <Text style={styles.resolveButtonText}>{t('catchUp.resolveAndSave')}</Text>
              </Pressable>

              <Pressable
                style={styles.resolveWithoutNoteButton}
                onPress={handleResolveWithoutNote}
              >
                <Text style={styles.resolveWithoutNoteText}>{t('catchUp.resolveWithoutNote')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
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
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listSection: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  topicList: {
    gap: 8,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  topicTextColumn: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topicHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  contactName: {
    flexShrink: 1,
    minWidth: 0,
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  overduePill: {
    flexShrink: 0,
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    color: Colors.error,
    backgroundColor: '#FFE2DE',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  topicTitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  recordButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.fab,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 20,
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
  reconnectedPill: {
    marginTop: 16,
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...Shadows.card,
  },
  reconnectedText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  backToContactsButton: {
    alignSelf: 'stretch',
    marginTop: 64,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.fab,
  },
  backToContactsText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.textInverse,
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(29, 26, 46, 0.46)',
  },
  resolveSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.hairlineStrong,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sheetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successLight,
  },
  sheetTitleColumn: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  inputLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: 7,
  },
  resolutionInput: {
    minHeight: 82,
    maxHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.sans.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
    marginBottom: 14,
  },
  quickAddChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: Colors.surfaceAlt,
  },
  quickAddText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  resolveButton: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
  },
  resolveButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 14,
    color: Colors.textInverse,
  },
  resolveWithoutNoteButton: {
    alignItems: 'center',
    paddingTop: 14,
  },
  resolveWithoutNoteText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
