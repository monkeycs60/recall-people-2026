import { View, Text, TextInput, FlatList, Pressable } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactsStore } from '@/stores/contacts-store';
import { Contact } from '@/types';
import { User, Search } from 'lucide-react-native';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const { contacts, loadContacts } = useContactsStore();

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.nickname && contact.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable
      className="bg-surface p-4 rounded-lg mb-3 flex-row items-center"
      onPress={() => router.push(`/contact/${item.id}`)}
    >
      <View className="w-10 h-10 bg-primary/20 rounded-full items-center justify-center mr-3">
        <User size={20} color="#8B5CF6" />
      </View>
      <Text className="text-textPrimary font-semibold text-lg">
        {item.firstName} {item.lastName || item.nickname || ''}
      </Text>
    </Pressable>
  );

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: insets.top + 10 }}
    >
      <Text className="text-3xl font-bold text-textPrimary mb-6">Recherche</Text>

      <View className="bg-surface rounded-lg flex-row items-center px-4 mb-6">
        <Search size={20} color="#9CA3AF" />
        <TextInput
          className="flex-1 py-3 px-3 text-textPrimary"
          placeholder="Rechercher un contact..."
          placeholderTextColor="#71717a"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

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

      {searchQuery.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-textMuted text-center">
            Tapez pour rechercher dans vos contacts
          </Text>
        </View>
      )}
    </View>
  );
}
