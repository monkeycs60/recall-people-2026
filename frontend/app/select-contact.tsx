import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useAppStore } from '@/stores/app-store';
import { extractInfo, DetectionResult } from '@/lib/api';
import { Contact } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { User, Plus, Search, Sparkles, Edit3, CheckCircle2 } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

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
      if (detection.suggestedNickname) {
        return `${detection.firstName} ${detection.suggestedNickname}`;
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

      const [facts, hotTopics] = await Promise.all([
        factService.getByContact(contact.id),
        hotTopicService.getByContact(contact.id),
      ]);

      const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

      const { extraction } = await extractInfo({
        transcription,
        existingContacts: contactsForExtraction,
        currentContact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          facts: facts.map((fact) => ({
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
          })),
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
      } else if (detection) {
        // No edit - use detection values and clear extraction values
        extraction.contactIdentified.firstName = detection.firstName;
        extraction.contactIdentified.lastName = detection.lastName || undefined;
        extraction.contactIdentified.suggestedNickname = detection.suggestedNickname || undefined;
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

  if (isExtracting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('selectContact.analyzing')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <Sparkles size={24} color={Colors.primary} />
        <Text style={styles.title}>{t('selectContact.question')}</Text>
      </View>

      <Text style={styles.transcriptionPreview}>
        "{transcription.slice(0, 100)}{transcription.length > 100 ? '...' : ''}"
      </Text>

      {hasSuggestions && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CheckCircle2 size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('selectContact.suggestion')}</Text>
          </View>

          {suggestedContact && (
            <Pressable
              style={styles.suggestedContactCard}
              onPress={() => handleSelectContact(suggestedContact)}
            >
              <View style={styles.avatarPrimary}>
                <User size={24} color={Colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>
                  {suggestedContact.firstName} {suggestedContact.lastName || suggestedContact.nickname || ''}
                </Text>
                {suggestedContact.aiSummary && (
                  <Text style={styles.contactSummary} numberOfLines={1}>
                    {suggestedContact.aiSummary}
                  </Text>
                )}
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
                  style={styles.candidateContactCard}
                  onPress={() => handleSelectContact(contact)}
                >
                  <View style={styles.avatarSecondary}>
                    <User size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>
                      {contact.firstName} {contact.lastName || contact.nickname || ''}
                    </Text>
                    {contact.aiSummary && (
                      <Text style={styles.contactSummary} numberOfLines={1}>
                        {contact.aiSummary}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('selectContact.newContact')}</Text>

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

        <Pressable style={styles.createNewButton} onPress={handleCreateNew}>
          <View style={styles.createNewContent}>
            <Plus size={20} color={Colors.primary} />
            <Text style={styles.createNewText}>
              {newContactDisplayName
                ? t('selectContact.createContact', { name: newContactDisplayName })
                : t('selectContact.createNewContact')}
            </Text>
          </View>
        </Pressable>

        {!isEditingNewName && (
          <Pressable
            style={styles.editNameButton}
            onPress={() => {
              setIsEditingNewName(true);
              // Pre-fill with full display name (firstName + lastName or nickname)
              const fullName = detection
                ? detection.lastName
                  ? `${detection.firstName} ${detection.lastName}`
                  : detection.suggestedNickname
                    ? `${detection.firstName} ${detection.suggestedNickname}`
                    : detection.firstName
                : '';
              setNewContactName(fullName);
            }}
          >
            <Edit3 size={16} color={Colors.textMuted} />
            <Text style={styles.editNameButtonText}>{t('selectContact.editName')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textMuted} />
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('selectContact.allContacts')}</Text>

          {filteredContacts.map((contact) => (
            <Pressable
              key={contact.id}
              style={styles.contactCard}
              onPress={() => handleSelectContact(contact)}
            >
              <View style={styles.avatarSmall}>
                <User size={20} color={Colors.textMuted} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactNameSmall}>
                  {contact.firstName} {contact.lastName || contact.nickname || ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    ...Typography.bodyMedium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.headlineLarge,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  transcriptionPreview: {
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    ...Typography.bodySmall,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
  disambiguationHint: {
    color: Colors.textSecondary,
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  suggestedContactCard: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  candidateContactCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  contactCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  avatarPrimary: {
    width: 48,
    height: 48,
    backgroundColor: Colors.primary + '25',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarSecondary: {
    width: 40,
    height: 40,
    backgroundColor: Colors.primary + '15',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    backgroundColor: Colors.surfaceHover,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: Colors.textPrimary,
    ...Typography.titleLarge,
  },
  contactNameSmall: {
    color: Colors.textPrimary,
    ...Typography.titleMedium,
  },
  contactSummary: {
    color: Colors.textMuted,
    ...Typography.bodySmall,
    marginTop: 2,
  },
  editNameContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  editNameLabel: {
    color: Colors.textSecondary,
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  editNameInput: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    color: Colors.textPrimary,
    ...Typography.bodyMedium,
  },
  createNewButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primary + '60',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: Colors.primary + '08',
  },
  createNewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createNewText: {
    color: Colors.primary,
    ...Typography.titleMedium,
    marginLeft: Spacing.sm,
  },
  editNameButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editNameButtonText: {
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
    ...Typography.bodySmall,
  },
  searchContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    color: Colors.textPrimary,
    ...Typography.bodyMedium,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cancelText: {
    color: Colors.textMuted,
    ...Typography.bodyMedium,
  },
});
