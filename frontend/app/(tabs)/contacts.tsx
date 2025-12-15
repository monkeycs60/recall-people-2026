import { View, Text, FlatList, Pressable, RefreshControl, TextInput } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactsStore } from '@/stores/contacts-store';
import { Contact } from '@/types';
import { User, Search } from 'lucide-react-native';

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contacts, loadContacts, isLoading } = useContactsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = searchQuery
    ? contacts.filter(
        (contact) =>
          contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (contact.lastName && contact.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (contact.nickname && contact.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : contacts;

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable
      className="bg-surface p-4 rounded-lg mb-3 flex-row items-center"
      onPress={() => router.push(`/contact/${item.id}`)}
    >
      <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center mr-4">
        <User size={24} color="#8B5CF6" />
      </View>

      <View className="flex-1">
        <Text className="text-textPrimary font-semibold text-lg">
          {item.firstName} {item.lastName || item.nickname || ''}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View className="flex-row gap-2 mt-1">
            {item.tags.slice(0, 2).map((tag) => (
              <View key={tag} className="bg-primary/20 px-2 py-0.5 rounded">
                <Text className="text-primary text-xs">{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {item.lastContactAt && (
          <Text className="text-textMuted text-xs mt-1">
            Dernier contact : {new Date(item.lastContactAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 24 }}>
        <Text className="text-3xl font-bold text-textPrimary mb-4">Contacts</Text>

        <View className="bg-surface rounded-lg flex-row items-center px-4 mb-4">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 py-3 px-3 text-textPrimary"
            placeholder="Rechercher un contact..."
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {filteredContacts.length === 0 && !isLoading ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-textSecondary text-center">
            {searchQuery
              ? 'Aucun résultat trouvé'
              : 'Aucun contact pour le moment.\nCréez votre première note vocale !'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
            />
          }
        />
      )}
    </View>
  );
}
