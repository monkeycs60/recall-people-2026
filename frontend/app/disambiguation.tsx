import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Contact, ExtractionResult } from '@/types';

export default function DisambiguationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const extraction: ExtractionResult = JSON.parse(params.extraction as string);
  const possibleContacts: Contact[] = JSON.parse(params.possibleContacts as string);
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;

  const handleSelectContact = (contactId: string) => {
    router.replace({
      pathname: '/review',
      params: {
        contactId,
        audioUri,
        transcription,
        extraction: JSON.stringify(extraction),
      },
    });
  };

  const handleCreateNew = () => {
    router.replace({
      pathname: '/review',
      params: {
        contactId: 'new',
        audioUri,
        transcription,
        extraction: JSON.stringify(extraction),
      },
    });
  };

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-6">
      <Text className="text-2xl font-bold text-textPrimary mb-2">
        Qui est "{extraction.contactIdentified.firstName}" ?
      </Text>

      <Text className="text-textSecondary mb-6">
        Plusieurs contacts correspondent à ce nom
      </Text>

      <View className="mb-6">
        {possibleContacts.map((contact) => (
          <Pressable
            key={contact.id}
            className="bg-surface p-4 rounded-lg mb-3"
            onPress={() => handleSelectContact(contact.id)}
          >
            <Text className="text-textPrimary font-semibold text-lg">
              {contact.firstName} {contact.lastName}
            </Text>
            {contact.tags && contact.tags.length > 0 && (
              <View className="flex-row gap-2 mt-2">
                {contact.tags.map((tag) => (
                  <View key={tag} className="bg-primary/20 px-2 py-1 rounded">
                    <Text className="text-primary text-xs">{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        ))}

        <Pressable
          className="border-2 border-dashed border-textMuted p-4 rounded-lg items-center mt-4"
          onPress={handleCreateNew}
        >
          <Text className="text-textSecondary">
            + Nouvelle personne "{extraction.contactIdentified.firstName}"
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
