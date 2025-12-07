import { View, Text, TextInput, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useContacts } from '@/hooks/useContacts';
import { Contact } from '@/types';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { contacts, loadContacts } = useContacts();

  useState(() => {
    loadContacts();
  });

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable
      className="bg-surface p-4 rounded-lg mb-3"
      onPress={() => router.push(`/contact/${item.id}`)}
    >
      <Text className="text-textPrimary font-semibold text-lg">
        {item.firstName} {item.lastName}
      </Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-3xl font-bold text-textPrimary mb-6">Recherche</Text>

      <TextInput
        className="bg-surface text-textPrimary px-4 py-3 rounded-lg mb-6"
        placeholder="Rechercher un contact..."
        placeholderTextColor="#71717a"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {searchQuery.length > 0 && (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text className="text-textSecondary text-center mt-8">
              Aucun résultat trouvé
            </Text>
          }
        />
      )}
    </View>
  );
}
