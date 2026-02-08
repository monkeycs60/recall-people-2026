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
import { Search, ChevronRight, X } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography, Fonts } from '@/constants/theme';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';

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
  const [newContactName, setNewContactName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasEditedName, setHasEditedName] = useState(false);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.title}>{t('selectContact.question')}</Text>

        {isExtracting ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('selectContact.analyzing')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.createRow}>
              <View style={styles.createInputWrapper}>
                <TextInput
                  style={styles.createInput}
                  placeholder={t('selectContact.firstNamePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={newContactName}
                  onChangeText={(text) => {
                    setNewContactName(text);
                    setHasEditedName(true);
                  }}
                />
                {newContactName.length > 0 && (
                  <Pressable
                    style={styles.clearButton}
                    onPress={() => {
                      setNewContactName('');
                      setHasEditedName(true);
                    }}
                    hitSlop={8}
                  >
                    <X size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                  !newContactName.trim() && styles.createButtonDisabled,
                ]}
                onPress={handleCreateNew}
                disabled={!newContactName.trim()}
              >
                <Text style={[
                  styles.createButtonText,
                  !newContactName.trim() && styles.createButtonTextDisabled,
                ]}>
                  {t('selectContact.createNewContact')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.separator} />

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

            {suggestedContacts.length > 0 && !searchQuery && (
              <View style={styles.contactsSection}>
                <Text style={styles.sectionLabel}>{t('selectContact.suggested')}</Text>
                <View style={styles.contactsList}>
                  {suggestedContacts.map((contact, index) => (
                    <Pressable
                      key={contact.id}
                      style={({ pressed }) => [
                        styles.contactRow,
                        styles.suggestedRow,
                        index === 0 && styles.contactRowFirst,
                        index === suggestedContacts.length - 1 && styles.contactRowLast,
                        pressed && styles.contactRowPressed,
                      ]}
                      onPress={() => handleSelectContact(contact)}
                    >
                      <ContactAvatar
                        firstName={contact.firstName}
                        lastName={contact.lastName}
                        gender={contact.gender}
                        avatarUrl={contact.avatarUrl}
                        size="small"
                        recyclingKey={contact.id}
                      />
                      <Text style={styles.contactName}>{getContactDisplayName(contact)}</Text>
                      <ChevronRight size={18} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {filteredContacts.length > 0 && (
              <View style={styles.contactsSection}>
                {suggestedContacts.length > 0 && !searchQuery && (
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
                        size="small"
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.serif.semibold,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
  },
  createRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  createInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  createInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.bodyLarge,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  createButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  createButtonDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  createButtonText: {
    color: Colors.textInverse,
    ...Typography.titleMedium,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: Colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
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
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contactRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  suggestedRow: {
    backgroundColor: Colors.primaryLight,
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
