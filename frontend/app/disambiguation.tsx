import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Contact, ExtractionResult } from '@/types';
import { Plus, User } from 'lucide-react-native';

export default function DisambiguationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

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

  const firstName = extraction.contactIdentified.firstName;
  const suggestedNickname = extraction.contactIdentified.suggestedNickname;

  return (
    <ScrollView
      className="flex-1 bg-background px-6 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <Text className="text-2xl font-bold text-textPrimary mb-2">
        Qui est "{firstName}" ?
      </Text>

      <Text className="text-textSecondary mb-6">
        Tu as déjà {possibleContacts.length > 1 ? 'des contacts' : 'un contact'} nommé "{firstName}"
      </Text>

      <View className="mb-4">
        <Text className="text-lg font-semibold text-textPrimary mb-3">
          Contacts existants
        </Text>

        {possibleContacts.map((contact) => (
          <Pressable
            key={contact.id}
            className="bg-surface p-4 rounded-lg mb-3 flex-row items-center"
            onPress={() => handleSelectContact(contact.id)}
          >
            <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
              <User size={24} color="#8B5CF6" />
            </View>

            <View className="flex-1">
              <Text className="text-textPrimary font-semibold text-lg">
                {contact.firstName} {contact.lastName || contact.nickname || ''}
              </Text>
              {contact.lastContactAt && (
                <Text className="text-textMuted text-xs mt-1">
                  Dernier contact: {new Date(contact.lastContactAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      <View className="mb-6">
        <Text className="text-lg font-semibold text-textPrimary mb-3">
          Nouveau contact
        </Text>

        <Pressable
          className="border-2 border-dashed border-primary/50 p-4 rounded-lg items-center bg-primary/5"
          onPress={handleCreateNew}
        >
          <View className="flex-row items-center mb-2">
            <Plus size={20} color="#8B5CF6" />
            <Text className="text-primary font-semibold ml-2">
              Créer "{suggestedNickname || firstName}"
            </Text>
          </View>

          {suggestedNickname && (
            <Text className="text-textMuted text-sm text-center">
              Surnom suggéré basé sur : {suggestedNickname}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
