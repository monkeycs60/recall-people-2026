import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsStore } from '@/stores/contacts-store';
import { useAppStore } from '@/stores/app-store';
import { extractInfo } from '@/lib/api';
import { Contact } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { groupService } from '@/services/group.service';
import { User, Plus, Search, Sparkles, Edit3 } from 'lucide-react-native';

export default function SelectContactScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;

  const { contacts, findContactsByFirstName } = useContactsStore();
  const { setCurrentExtraction, setRecordingState } = useAppStore();

  const [isExtracting, setIsExtracting] = useState(false);
  const [isEditingNewName, setIsEditingNewName] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  // Extract first name from transcription for suggestions (computed once)
  const detectedName = useMemo(() => {
    const patterns = [
      /j'ai (?:vu|rencontré|croisé|parlé à|revu)\s+([\w-]+)/i,
      /(?:avec|de)\s+([\w-]+)/i,
      /([\w-]+)\s+m'a\s+dit/i,
    ];

    for (const pattern of patterns) {
      const match = transcription.match(pattern);
      if (match) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
    return null;
  }, [transcription]);

  const [searchQuery, setSearchQuery] = useState('');

  const matchingContacts = detectedName ? findContactsByFirstName(detectedName) : [];

  const nameForNewContact = isEditingNewName && newContactName.trim()
    ? newContactName.trim()
    : detectedName;

  const filteredContacts = searchQuery
    ? contacts.filter(
        (contact) =>
          contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (contact.lastName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : contacts;

  const handleSelectContact = async (contact: Contact) => {
    setIsExtracting(true);
    try {
      const contactsForExtraction = contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
      }));

      // Load facts and hot topics for the selected contact
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

      // Override the contact ID with selected contact
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
      const contactsForExtraction = contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
      }));

      // Load groups for suggestions (only for new contacts)
      const groups = await groupService.getAll();
      const groupsForExtraction = groups.map((g) => ({
        id: g.id,
        name: g.name,
      }));

      const { extraction } = await extractInfo({
        transcription,
        existingContacts: contactsForExtraction,
        existingGroups: groupsForExtraction,
      });

      // Override the first name if user edited it
      if (nameForNewContact && nameForNewContact !== extraction.contactIdentified.firstName) {
        extraction.contactIdentified.firstName = nameForNewContact;
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
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text className="text-textSecondary mt-4">{t('selectContact.analyzing')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-6 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="flex-row items-center mb-2">
        <Sparkles size={24} color="#8B5CF6" />
        <Text className="text-2xl font-bold text-textPrimary ml-2">
          {t('selectContact.question')}
        </Text>
      </View>

      <Text className="text-textMuted mb-4 text-sm italic">
        "{transcription.slice(0, 100)}{transcription.length > 100 ? '...' : ''}"
      </Text>

      {/* Search */}
      <View className="bg-surface rounded-lg flex-row items-center px-4 mb-6">
        <Search size={20} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 px-3 text-textPrimary"
          placeholder={t('selectContact.searchPlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Suggested contacts (matching first name) */}
      {matchingContacts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            {t('selectContact.suggestedContacts', { name: detectedName })}
          </Text>

          {matchingContacts.map((contact) => (
            <Pressable
              key={contact.id}
              className="bg-primary/10 border border-primary/30 p-4 rounded-lg mb-3 flex-row items-center"
              onPress={() => handleSelectContact(contact)}
            >
              <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
                <User size={24} color="#8B5CF6" />
              </View>

              <View className="flex-1">
                <Text className="text-textPrimary font-semibold text-lg">
                  {contact.firstName} {contact.lastName || contact.nickname || ''}
                </Text>
                {contact.lastContactAt && (
                  <Text className="text-textMuted text-xs">
                    {t('selectContact.lastContact', { date: new Date(contact.lastContactAt).toLocaleDateString() })}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Create new contact */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-textPrimary mb-3">
          {t('selectContact.newContact')}
        </Text>

        {isEditingNewName ? (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <Text className="text-textSecondary text-sm mb-2">{t('selectContact.contactName')}</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary"
              placeholder={t('selectContact.firstNamePlaceholder')}
              placeholderTextColor="#71717a"
              value={newContactName}
              onChangeText={setNewContactName}
              autoFocus
            />
          </View>
        ) : null}

        <Pressable
          className="border-2 border-dashed border-primary/50 p-4 rounded-lg items-center bg-primary/5"
          onPress={handleCreateNew}
        >
          <View className="flex-row items-center">
            <Plus size={20} color="#8B5CF6" />
            <Text className="text-primary font-semibold ml-2">
              {nameForNewContact
                ? t('selectContact.createContact', { name: nameForNewContact })
                : t('selectContact.createNewContact')}
            </Text>
          </View>
        </Pressable>

        {!isEditingNewName && (
          <Pressable
            className="mt-2 py-2 items-center flex-row justify-center"
            onPress={() => {
              setIsEditingNewName(true);
              setNewContactName(detectedName || '');
            }}
          >
            <Edit3 size={16} color="#9CA3AF" />
            <Text className="text-textMuted ml-2 text-sm">
              {t('selectContact.editName')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* All contacts */}
      {filteredContacts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            {t('selectContact.allContacts')}
          </Text>

          {filteredContacts
            .filter((contact) => !matchingContacts.some((mc) => mc.id === contact.id))
            .map((contact) => (
              <Pressable
                key={contact.id}
                className="bg-surface p-4 rounded-lg mb-2 flex-row items-center"
                onPress={() => handleSelectContact(contact)}
              >
                <View className="w-10 h-10 bg-surfaceHover rounded-full items-center justify-center mr-3">
                  <User size={20} color="#9CA3AF" />
                </View>

                <View className="flex-1">
                  <Text className="text-textPrimary font-medium">
                    {contact.firstName} {contact.lastName || contact.nickname || ''}
                  </Text>
                </View>
              </Pressable>
            ))}
        </View>
      )}

      {/* Cancel button */}
      <Pressable
        className="py-3 items-center mb-6"
        onPress={handleCancel}
      >
        <Text className="text-textMuted">{t('common.cancel')}</Text>
      </Pressable>
    </ScrollView>
  );
}
