import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet, Animated, Dimensions, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useContactPreviewsQuery } from '@/hooks/useContactPreviewsQuery';
import { useAppStore } from '@/stores/app-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { extractInfo, DetectionResult } from '@/lib/api';
import { showErrorToast } from '@/lib/error-handler';
import { Contact } from '@/types';
import { hotTopicService } from '@/services/hot-topic.service';
import { Search, ChevronRight, CheckCircle2, Plus, Pencil, ArrowRight } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography, Fonts, Shadows } from '@/constants/theme';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { getDateLocale } from '@/utils/dateLocale';
import { Paywall } from '@/components/Paywall';

export default function SelectContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;
  const detectionParam = params.detection as string | undefined;
  const skipAvatarGeneration = params.skipAvatarGeneration as string | undefined;

  const detection: DetectionResult | null = useMemo(() => {
    if (!detectionParam) return null;
    try {
      return JSON.parse(detectionParam) as DetectionResult;
    } catch {
      return null;
    }
  }, [detectionParam]);

  const { contacts } = useContactsQuery();
  const { groups } = useGroupsQuery();
  const { setCurrentExtraction, setRecordingState } = useAppStore();

  const [isExtracting, setIsExtracting] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasEditedName, setHasEditedName] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const suggestedContact = useMemo(() => {
    if (!detection?.contactId) return null;
    return contacts.find((contact) => contact.id === detection.contactId) || null;
  }, [detection, contacts]);

  const candidateContacts = useMemo(() => {
    if (!detection?.candidateIds?.length) return [];
    return contacts.filter((contact) => detection.candidateIds.includes(contact.id));
  }, [detection, contacts]);

  const suggestedIds = useMemo(() => {
    const ids = new Set<string>();
    if (suggestedContact) ids.add(suggestedContact.id);
    candidateContacts.forEach((contact) => ids.add(contact.id));
    return ids;
  }, [suggestedContact, candidateContacts]);

  const suggestedContacts = useMemo(() => {
    const list: Contact[] = [];
    if (suggestedContact) list.push(suggestedContact);
    candidateContacts.forEach((contact) => {
      if (contact.id !== suggestedContact?.id) list.push(contact);
    });
    return list;
  }, [suggestedContact, candidateContacts]);

  const highlightedSuggestedContact = suggestedContacts[0] || null;
  const highlightedSuggestedContacts = useMemo(
    () => highlightedSuggestedContact ? [highlightedSuggestedContact] : [],
    [highlightedSuggestedContact]
  );
  const { previews: highlightedContactPreviews } = useContactPreviewsQuery(highlightedSuggestedContacts);

  const detectedName = useMemo(() => {
    if (!detection) return '';
    if (detection.lastName) return `${detection.firstName} ${detection.lastName}`;
    if (detection.suggestedNickname) return detection.suggestedNickname;
    return detection.firstName;
  }, [detection]);

  useEffect(() => {
    if (detectedName && !hasEditedName) {
      setNewContactName(detectedName);
    }
  }, [detectedName, hasEditedName]);

  const filteredContacts = useMemo(() => {
    const filtered = searchQuery
      ? contacts.filter(
          (contact) =>
            contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : contacts;
    return filtered.filter((contact) => !suggestedIds.has(contact.id));
  }, [contacts, searchQuery, suggestedIds]);

  const highlightedContactMeta = useMemo(() => {
    if (!highlightedSuggestedContact) return [];

    const preview = highlightedContactPreviews.get(highlightedSuggestedContact.id);
    const openTopicCount = preview?.hotTopics.length ?? 0;
    const metaParts: string[] = [];

    if (openTopicCount > 0) {
      metaParts.push(t('selectContact.openTopics', { count: openTopicCount }));
    }

    if (highlightedSuggestedContact.lastContactAt) {
      try {
        const distance = formatDistanceToNow(parseISO(highlightedSuggestedContact.lastContactAt), {
          addSuffix: false,
          locale: getDateLocale(),
        });

        if (distance) {
          metaParts.push(t('selectContact.seenAgo', { distance }));
        }
      } catch {
        return metaParts;
      }
    }

    return metaParts;
  }, [highlightedSuggestedContact, highlightedContactPreviews, t]);

  const handleSelectContact = async (contact: Contact) => {
    setIsExtracting(true);
    try {
      const contactsForExtraction = contacts.map((contactItem) => ({
        id: contactItem.id,
        firstName: contactItem.firstName,
        lastName: contactItem.lastName,
      }));

      const hotTopics = await hotTopicService.getByContact(contact.id);

      const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

      const { extraction } = await extractInfo({
        transcription,
        existingContacts: contactsForExtraction,
        currentContact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          facts: [],
          hotTopics: activeHotTopics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            context: topic.context,
          })),
        },
      });

      extraction.contactIdentified.id = contact.id;
      extraction.contactIdentified.needsDisambiguation = false;

      setCurrentExtraction(extraction);

      router.replace({
        pathname: '/review',
        params: {
          contactId: contact.id,
          audioUri,
          transcription,
          extraction: JSON.stringify(extraction),
          skipAvatarGeneration,
        },
      });
    } catch (error) {
      console.error('Extraction failed:', error);
      setIsExtracting(false);
      showErrorToast(
        t('selectContact.extractionFailed'),
        t('selectContact.extractionFailedDescription')
      );
    }
  };

  const handleCreateNew = async () => {
    const canCreate = useSubscriptionStore.getState().canCreateContact(contacts.length);
    if (!canCreate) {
      setShowPaywall(true);
      return;
    }

    setIsExtracting(true);
    try {
      const contactsForExtraction = contacts.map((contactItem) => ({
        id: contactItem.id,
        firstName: contactItem.firstName,
        lastName: contactItem.lastName,
      }));

      const groupsForExtraction = groups.map((group) => ({
        id: group.id,
        name: group.name,
      }));

      const { extraction } = await extractInfo({
        transcription,
        existingContacts: contactsForExtraction,
        existingGroups: groupsForExtraction,
      });

      if (hasEditedName && newContactName.trim()) {
        const parts = newContactName.trim().split(' ');
        extraction.contactIdentified.firstName = parts[0];
        extraction.contactIdentified.lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
        extraction.contactIdentified.suggestedNickname = undefined;
        if (detection) {
          extraction.contactIdentified.gender = detection.gender;
          extraction.contactIdentified.avatarHints = detection.avatarHints;
        }
      } else if (detection) {
        extraction.contactIdentified.firstName = detection.firstName;
        extraction.contactIdentified.lastName = detection.lastName || undefined;
        extraction.contactIdentified.suggestedNickname = detection.suggestedNickname || undefined;
        extraction.contactIdentified.gender = detection.gender;
        extraction.contactIdentified.avatarHints = detection.avatarHints;
      }

      setCurrentExtraction(extraction);

      router.replace({
        pathname: '/review',
        params: {
          contactId: 'new',
          audioUri,
          transcription,
          extraction: JSON.stringify(extraction),
        },
      });
    } catch (error) {
      console.error('Extraction failed:', error);
      setIsExtracting(false);
      showErrorToast(
        t('selectContact.extractionFailed'),
        t('selectContact.extractionFailedDescription')
      );
    }
  };

  const handleCancel = () => {
    setRecordingState('idle');
    router.back();
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screenContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {isExtracting ? (
            <View style={styles.loadingFullScreen}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t('selectContact.analyzing')}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('selectContact.question')}</Text>

              {highlightedSuggestedContact ? (
                <View style={styles.decisionBlock}>
                  <View style={styles.existingSuggestionCard}>
                    <View style={styles.matchStatusRow}>
                      <CheckCircle2
                        size={18}
                        color={Colors.surface}
                        fill={Colors.primary}
                        strokeWidth={2.6}
                      />
                      <Text style={styles.matchStatusText}>{t('selectContact.alreadyInContacts')}</Text>
                    </View>

                    <View style={styles.matchPersonRow}>
                      <ContactAvatar
                        firstName={highlightedSuggestedContact.firstName}
                        lastName={highlightedSuggestedContact.lastName}
                        gender={highlightedSuggestedContact.gender}
                        avatarUrl={highlightedSuggestedContact.avatarUrl}
                        size="small"
                        cacheKey={highlightedSuggestedContact.updatedAt}
                        recyclingKey={highlightedSuggestedContact.id}
                      />
                      <View style={styles.matchTextBlock}>
                        <Text
                          style={styles.matchName}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.82}
                        >
                          {getContactDisplayName(highlightedSuggestedContact)}
                        </Text>
                        {highlightedContactMeta.length > 0 && (
                          <Text style={styles.matchMeta} numberOfLines={1}>
                            {highlightedContactMeta.join(' · ')}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryActionButton,
                        pressed && styles.primaryActionButtonPressed,
                      ]}
                      onPress={() => handleSelectContact(highlightedSuggestedContact)}
                    >
                      <Text
                        style={styles.primaryActionButtonText}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                      >
                        {t('selectContact.addNoteToContact', {
                          name: highlightedSuggestedContact.firstName,
                        })}
                      </Text>
                      <ArrowRight size={18} color={Colors.textInverse} strokeWidth={2.6} />
                    </Pressable>
                  </View>

                  <View style={styles.notThemRow}>
                    <Text style={styles.notThemText}>{t('selectContact.notThem')}</Text>
                    <Pressable
                      onPress={handleCreateNew}
                      disabled={!newContactName.trim()}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.createNewLink,
                          !newContactName.trim() && styles.createNewLinkDisabled,
                        ]}
                      >
                        {t('selectContact.createANewContact')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.newPersonCard}>
                  <View style={styles.newPersonStatusRow}>
                    <View style={styles.newPersonDot} />
                    <Text style={styles.newPersonStatusText}>{t('selectContact.newPersonStatus')}</Text>
                  </View>

                  <View style={styles.newPersonInputWrapper}>
                    <TextInput
                      style={styles.newPersonInput}
                      placeholder={t('selectContact.firstNamePlaceholder')}
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="words"
                      autoCorrect={true}
                      spellCheck={true}
                      value={newContactName}
                      onChangeText={(text) => {
                        setNewContactName(text);
                        setHasEditedName(true);
                      }}
                    />
                    <Pencil size={18} color={Colors.textMuted} strokeWidth={2.2} />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryActionButton,
                      styles.newPersonActionButton,
                      pressed && styles.primaryActionButtonPressed,
                      !newContactName.trim() && styles.primaryActionButtonDisabled,
                    ]}
                    onPress={handleCreateNew}
                    disabled={!newContactName.trim()}
                  >
                    <Plus
                      size={19}
                      color={newContactName.trim() ? Colors.textInverse : Colors.textMuted}
                      strokeWidth={2.8}
                    />
                    <Text
                      style={[
                        styles.primaryActionButtonText,
                        !newContactName.trim() && styles.primaryActionButtonTextDisabled,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {t('selectContact.createContactButton')}
                    </Text>
                  </Pressable>
                </View>
              )}

              {highlightedSuggestedContact ? (
                <View style={styles.separator} />
              ) : (
                <View style={styles.choiceSeparator}>
                  <View style={styles.choiceSeparatorLine} />
                  <Text style={styles.choiceSeparatorText}>{t('selectContact.orChooseExisting')}</Text>
                  <View style={styles.choiceSeparatorLine} />
                </View>
              )}

              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('selectContact.searchPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {filteredContacts.length > 0 && (
                <View style={styles.contactsSection}>
                  {highlightedSuggestedContact && !searchQuery && (
                    <Text style={styles.sectionLabel}>{t('selectContact.allContacts')}</Text>
                  )}
                  <View style={styles.contactsList}>
                    {filteredContacts.map((contact, index) => (
                      <Pressable
                        key={contact.id}
                        style={({ pressed }) => [
                          styles.contactRow,
                          index === 0 && styles.contactRowFirst,
                          index === filteredContacts.length - 1 && styles.contactRowLast,
                          pressed && styles.contactRowPressed,
                        ]}
                        onPress={() => handleSelectContact(contact)}
                      >
                        <ContactAvatar
                          firstName={contact.firstName}
                          lastName={contact.lastName}
                          gender={contact.gender}
                          avatarUrl={contact.avatarUrl}
                          size="tiny"
                          cacheKey={contact.updatedAt}
                          recyclingKey={contact.id}
                        />
                        <Text style={styles.contactName}>{getContactDisplayName(contact)}</Text>
                        <ChevronRight size={18} color={Colors.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </ScrollView>

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} reason="contact_limit" />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  loadingFullScreen: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Math.min(Dimensions.get('window').height * 0.6, 500),
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
  },
  decisionBlock: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  existingSuggestionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: Spacing.md,
    gap: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
  },
  matchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  matchStatusText: {
    ...Typography.labelSmall,
    color: Colors.primary,
  },
  matchPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  matchTextBlock: {
    flex: 1,
    gap: 2,
  },
  matchName: {
    color: Colors.textPrimary,
    ...Typography.title,
  },
  matchMeta: {
    color: Colors.textMuted,
    ...Typography.bodySmall,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3,
  },
  primaryActionButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  primaryActionButtonDisabled: {
    backgroundColor: Colors.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryActionButtonText: {
    color: Colors.textInverse,
    ...Typography.titleMedium,
    textAlign: 'center',
  },
  primaryActionButtonTextDisabled: {
    color: Colors.textMuted,
  },
  notThemRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  notThemText: {
    color: Colors.textMuted,
    ...Typography.bodySmall,
  },
  createNewLink: {
    color: Colors.textSecondary,
    ...Typography.bodySmall,
    fontFamily: Fonts.sans.bold,
    textDecorationLine: 'underline',
  },
  createNewLinkDisabled: {
    color: Colors.textMuted,
  },
  newPersonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.md,
    gap: 12,
    marginBottom: Spacing.lg,
    ...Shadows.elevated,
  },
  newPersonStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  newPersonDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.amber,
  },
  newPersonStatusText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  newPersonInputWrapper: {
    minHeight: 48,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  newPersonInput: {
    flex: 1,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    ...Typography.bodyLarge,
  },
  newPersonActionButton: {
    shadowOpacity: 0.16,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginBottom: Spacing.lg,
  },
  choiceSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  choiceSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.hairline,
  },
  choiceSeparatorText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    marginBottom: Spacing.md,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.bodyMedium,
  },
  contactsSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    letterSpacing: 1,
  },
  contactsList: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  contactRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
    gap: Spacing.sm,
  },
  contactRowFirst: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  contactRowLast: {
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    borderBottomWidth: 0,
  },
  contactRowPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  contactName: {
    flex: 1,
    color: Colors.textPrimary,
    ...Typography.bodyLarge,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  cancelText: {
    color: Colors.textMuted,
    ...Typography.bodyMedium,
    textDecorationLine: 'underline',
  },
});
