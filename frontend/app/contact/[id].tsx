import { View, Text, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '@/hooks/useContacts';
import { ContactWithDetails } from '@/types';

export default function ContactDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;

  const { getContactById, deleteContact } = useContacts();
  const [contact, setContact] = useState<ContactWithDetails | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  if (!hasLoaded) {
    getContactById(contactId).then(setContact);
    setHasLoaded(true);
  }

  const handleDelete = async () => {
    if (contact) {
      await deleteContact(contact.id);
      router.back();
    }
  };

  if (!contact) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="mb-6 mt-4">
        <Text className="text-3xl font-bold text-textPrimary mb-2">
          {contact.firstName} {contact.lastName || contact.nickname || ''}
        </Text>

        {contact.tags && contact.tags.length > 0 && (
          <View className="flex-row gap-2 mb-4">
            {contact.tags.map((tag) => (
              <View key={tag} className="bg-primary/20 px-3 py-1 rounded">
                <Text className="text-primary">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {contact.lastContactAt && (
          <Text className="text-textSecondary">
            Dernier contact : {new Date(contact.lastContactAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {contact.facts.length > 0 && (
        <View className="mb-6">
          <Text className="text-xl font-semibold text-textPrimary mb-3">
            Informations
          </Text>

          {contact.facts.map((fact) => (
            <View key={fact.id} className="bg-surface p-4 rounded-lg mb-2">
              <Text className="text-textSecondary text-sm">{fact.factKey}</Text>
              <Text className="text-textPrimary font-medium">{fact.factValue}</Text>
            </View>
          ))}
        </View>
      )}

      {contact.notes.length > 0 && (
        <View className="mb-6">
          <Text className="text-xl font-semibold text-textPrimary mb-3">
            Notes ({contact.notes.length})
          </Text>

          {contact.notes.map((note) => (
            <View key={note.id} className="bg-surface p-4 rounded-lg mb-3">
              {note.summary && (
                <Text className="text-textPrimary mb-2">{note.summary}</Text>
              )}
              <Text className="text-textMuted text-xs">
                {new Date(note.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        className="bg-error/20 border border-error py-3 rounded-lg items-center"
        onPress={handleDelete}
      >
        <Text className="text-error font-semibold">Supprimer le contact</Text>
      </Pressable>
    </ScrollView>
  );
}
