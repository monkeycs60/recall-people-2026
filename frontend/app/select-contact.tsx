import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactsStore } from '@/stores/contacts-store';
import { useAppStore } from '@/stores/app-store';
import { extractInfo } from '@/lib/api';
import { Contact } from '@/types';
import { User, Plus, Search, Sparkles } from 'lucide-react-native';

export default function SelectContactScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;

  const { contacts, findContactsByFirstName } = useContactsStore();
  const { setCurrentExtraction, setRecordingState } = useAppStore();

  const [isExtracting, setIsExtracting] = useState(false);

  // Extract first name from transcription for suggestions (computed once)
  const detectedName = useMemo(() => {
    const patterns = [
      /j'ai (?:vu|rencontré|croisé|parlé à|revu)\s+(\w+)/i,
      /(?:avec|de)\s+(\w+)/i,
      /(\w+)\s+m'a\s+dit/i,
    ];

    for (const pattern of patterns) {
      const match = transcription.match(pattern);
      if (match) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }
    return null;
  }, [transcription]);

  const [searchQuery, setSearchQuery] = useState(detectedName || '');

  const matchingContacts = detectedName ? findContactsByFirstName(detectedName) : [];

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
        tags: c.tags,
      }));

      const { extraction } = await extractInfo({
        transcription,
        existingContacts: contactsForExtraction,
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
        tags: c.tags,
      }));

      const { extraction } = await extractInfo({
        transcription,
        existingContacts: contactsForExtraction,
      });

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
        <Text className="text-textSecondary mt-4">Analyse en cours...</Text>
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
          À qui appartient cette note ?
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
          placeholder="Rechercher un contact..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Suggested contacts (matching first name) */}
      {matchingContacts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            Contacts suggérés ({detectedName})
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
                    Dernier contact: {new Date(contact.lastContactAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Create new contact */}
      <Pressable
        className="border-2 border-dashed border-primary/50 p-4 rounded-lg items-center bg-primary/5 mb-6"
        onPress={handleCreateNew}
      >
        <View className="flex-row items-center">
          <Plus size={20} color="#8B5CF6" />
          <Text className="text-primary font-semibold ml-2">
            Créer un nouveau contact {detectedName ? `"${detectedName}"` : ''}
          </Text>
        </View>
      </Pressable>

      {/* All contacts */}
      {filteredContacts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            Tous les contacts
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
        <Text className="text-textMuted">Annuler</Text>
      </Pressable>
    </ScrollView>
  );
}
