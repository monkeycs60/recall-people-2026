import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useAppStore } from '@/stores/app-store';
import { extractInfo, DetectionResult } from '@/lib/api';
import { Contact } from '@/types';
import { hotTopicService } from '@/services/hot-topic.service';
import { User, Search, Sparkles, Edit3, ChevronRight, UserPlus } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography, Fonts } from '@/constants/theme';

export default function SelectContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;
  const detectionParam = params.detection as string | undefined;

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
  const [isEditingNewName, setIsEditingNewName] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const suggestedContact = useMemo(() => {
    if (!detection?.contactId) return null;
    return contacts.find((contact) => contact.id === detection.contactId) || null;
  }, [detection, contacts]);

  const candidateContacts = useMemo(() => {
    if (!detection?.candidateIds?.length) return [];
    return contacts.filter((contact) => detection.candidateIds.includes(contact.id));
  }, [detection, contacts]);

  const hasSuggestions = suggestedContact || candidateContacts.length > 0;

  const suggestedIds = useMemo(() => {
    const ids = new Set<string>();
    if (suggestedContact) ids.add(suggestedContact.id);
    candidateContacts.forEach((contact) => ids.add(contact.id));
    return ids;
  }, [suggestedContact, candidateContacts]);

  const newContactDisplayName = useMemo(() => {
    if (isEditingNewName && newContactName.trim()) {
      return newContactName.trim();
    }
    if (detection) {
      if (detection.lastName) {
        return `${detection.firstName} ${detection.lastName}`;
      }
      // suggestedNickname already contains the first name (e.g., "Paul Google")
      if (detection.suggestedNickname) {
        return detection.suggestedNickname;
      }
      return detection.firstName;
    }
    return '';
  }, [detection, isEditingNewName, newContactName]);

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
        },
      });
    } catch (error) {
      console.error('Extraction failed:', error);
      setIsExtracting(false);
    }
  };

  const handleCreateNew = async () => {
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

      if (isEditingNewName && newContactName.trim()) {
        // User edited the name - use their input and clear any extraction values
        const parts = newContactName.trim().split(' ');
        extraction.contactIdentified.firstName = parts[0];
        extraction.contactIdentified.lastName = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
        extraction.contactIdentified.suggestedNickname = undefined;
        // Keep the gender and avatarHints from detection even when name is edited
        if (detection) {
          extraction.contactIdentified.gender = detection.gender;
          extraction.contactIdentified.avatarHints = detection.avatarHints;
        }
      } else if (detection) {
        // No edit - use detection values and clear extraction values
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

  if (isExtracting) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('selectContact.analyzing')}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.heroSection}>
          <View style={styles.sparklesContainer}>
            <Sparkles size={20} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{t('selectContact.question')}</Text>
          <View style={styles.transcriptionCard}>
            <Text style={styles.transcriptionText} numberOfLines={2}>
              {transcription.slice(0, 120)}{transcription.length > 120 ? '...' : ''}
            </Text>
          </View>
        </View>

        {hasSuggestions && (
          <View style={styles.suggestionSection}>
            <View style={styles.sectionLabelContainer}>
              <View style={styles.sectionLabelLine} />
              <Text style={styles.sectionLabel}>{t('selectContact.suggestion')}</Text>
              <View style={styles.sectionLabelLine} />
            </View>

            {suggestedContact && (
              <Pressable
                style={({ pressed }) => [
                  styles.suggestedContactCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleSelectContact(suggestedContact)}
              >
                <View style={styles.suggestedCardGlow} />
                <View style={styles.suggestedCardContent}>
                  <View style={styles.avatarPrimary}>
                    <User size={26} color={Colors.textInverse} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.suggestedContactName}>
                      {suggestedContact.firstName} {suggestedContact.lastName || suggestedContact.nickname || ''}
                    </Text>
                    {suggestedContact.aiSummary && (
                      <Text style={styles.contactSummary} numberOfLines={1}>
                        {suggestedContact.aiSummary}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={22} color={Colors.primary} />
                </View>
              </Pressable>
            )}

            {candidateContacts.length > 0 && !suggestedContact && (
              <>
                <Text style={styles.disambiguationHint}>
                  {t('selectContact.multipleMatches', { name: detection?.firstName })}
                </Text>
                {candidateContacts.map((contact) => (
                  <Pressable
                    key={contact.id}
                    style={({ pressed }) => [
                      styles.candidateContactCard,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => handleSelectContact(contact)}
                  >
                    <View style={styles.avatarSecondary}>
                      <User size={22} color={Colors.primary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.candidateContactName}>
                        {contact.firstName} {contact.lastName || contact.nickname || ''}
                      </Text>
                      {contact.aiSummary && (
                        <Text style={styles.contactSummary} numberOfLines={1}>
                          {contact.aiSummary}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={20} color={Colors.textMuted} />
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        <View style={styles.newContactSection}>
          <View style={styles.sectionLabelContainer}>
            <View style={styles.sectionLabelLine} />
            <Text style={styles.sectionLabel}>{t('selectContact.newContact')}</Text>
            <View style={styles.sectionLabelLine} />
          </View>

          {isEditingNewName && (
            <View style={styles.editNameContainer}>
              <Text style={styles.editNameLabel}>{t('selectContact.contactName')}</Text>
              <TextInput
                style={styles.editNameInput}
                placeholder={t('selectContact.firstNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={newContactName}
                onChangeText={setNewContactName}
                autoFocus
              />
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.createNewButton,
              pressed && styles.createNewButtonPressed,
            ]}
            onPress={handleCreateNew}
          >
            <View style={styles.createNewIconContainer}>
              <UserPlus size={22} color={Colors.textInverse} />
            </View>
            <Text style={styles.createNewText}>
              {newContactDisplayName
                ? t('selectContact.createContact', { name: newContactDisplayName })
                : t('selectContact.createNewContact')}
            </Text>
          </Pressable>

          {!isEditingNewName && (
            <Pressable
              style={styles.editNameButton}
              onPress={() => {
                setIsEditingNewName(true);
                const fullName = detection
                  ? detection.lastName
                    ? `${detection.firstName} ${detection.lastName}`
                    : detection.suggestedNickname || detection.firstName
                  : '';
                setNewContactName(fullName);
              }}
            >
              <Edit3 size={14} color={Colors.textMuted} />
              <Text style={styles.editNameButtonText}>{t('selectContact.editName')}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.searchSection}>
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
        </View>

        {filteredContacts.length > 0 && (
          <View style={styles.contactsListSection}>
            <Text style={styles.contactsListHeader}>{t('selectContact.allContacts')}</Text>
            <View style={styles.contactsList}>
              {filteredContacts.map((contact, index) => (
                <Pressable
                  key={contact.id}
                  style={({ pressed }) => [
                    styles.contactCard,
                    index === 0 && styles.contactCardFirst,
                    index === filteredContacts.length - 1 && styles.contactCardLast,
                    pressed && styles.contactCardPressed,
                  ]}
                  onPress={() => handleSelectContact(contact)}
                >
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarInitial}>
                      {contact.firstName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.contactNameSmall}>
                    {contact.firstName} {contact.lastName || contact.nickname || ''}
                  </Text>
                  <ChevronRight size={18} color={Colors.border} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    ...Typography.titleMedium,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  sparklesContainer: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primaryLight,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontFamily: Fonts.serif.semibold,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  transcriptionCard: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    width: '100%',
  },
  transcriptionText: {
    color: Colors.textSecondary,
    ...Typography.bodyMedium,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  suggestionSection: {
    marginBottom: Spacing.xl,
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  sectionLabel: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
    letterSpacing: 1,
  },
  suggestedContactCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  suggestedCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  suggestedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  avatarPrimary: {
    width: 52,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  suggestedContactName: {
    color: Colors.textPrimary,
    fontFamily: Fonts.serif.semibold,
    fontSize: 20,
    lineHeight: 26,
  },
  contactSummary: {
    color: Colors.textMuted,
    ...Typography.bodySmall,
    marginTop: 4,
  },
  disambiguationHint: {
    color: Colors.textSecondary,
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  candidateContactCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarSecondary: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primaryLight,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  candidateContactName: {
    color: Colors.textPrimary,
    ...Typography.titleLarge,
  },
  newContactSection: {
    marginBottom: Spacing.xl,
  },
  editNameContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editNameLabel: {
    color: Colors.textSecondary,
    ...Typography.labelMedium,
    marginBottom: Spacing.xs,
  },
  editNameInput: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    ...Typography.bodyLarge,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createNewButton: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createNewButtonPressed: {
    backgroundColor: Colors.surfaceHover,
    borderColor: Colors.primary,
  },
  createNewIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  createNewText: {
    flex: 1,
    color: Colors.textPrimary,
    ...Typography.titleMedium,
  },
  editNameButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editNameButtonText: {
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
    ...Typography.bodySmall,
    textDecorationLine: 'underline',
  },
  searchSection: {
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.bodyMedium,
  },
  contactsListSection: {
    marginBottom: Spacing.lg,
  },
  contactsListHeader: {
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  contactCardFirst: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  contactCardLast: {
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    borderBottomWidth: 0,
  },
  contactCardPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    backgroundColor: Colors.secondaryLight,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarInitial: {
    color: Colors.secondary,
    ...Typography.titleMedium,
    fontWeight: '600',
  },
  contactNameSmall: {
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
