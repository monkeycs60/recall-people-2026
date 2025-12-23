import { View, Text, FlatList, Pressable, RefreshControl, TextInput, ScrollView } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContactsStore } from '@/stores/contacts-store';
import { useGroupsStore } from '@/stores/groups-store';
import { groupService } from '@/services/group.service';
import { Contact } from '@/types';
import { User, Search } from 'lucide-react-native';

export default function ContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contacts, loadContacts, isLoading } = useContactsStore();
  const { groups, loadGroups, selectedGroupId, setSelectedGroup } = useGroupsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactIdsByGroup, setContactIdsByGroup] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      loadGroups();
    }, [])
  );

  // Load contact IDs when group filter changes
  useEffect(() => {
    const loadFilteredContacts = async () => {
      if (selectedGroupId) {
        const ids = await groupService.getContactIdsForGroup(selectedGroupId);
        setContactIdsByGroup(ids);
      } else {
        setContactIdsByGroup([]);
      }
    };
    loadFilteredContacts();
  }, [selectedGroupId]);

  const filteredContacts = contacts.filter((contact) => {
    // Group filter
    if (selectedGroupId && !contactIdsByGroup.includes(contact.id)) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        contact.firstName.toLowerCase().includes(query) ||
        (contact.lastName && contact.lastName.toLowerCase().includes(query)) ||
        (contact.nickname && contact.nickname.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    await loadGroups();
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

      {/* Group filter chips */}
      {groups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          <Pressable
            className={`px-4 py-2 rounded-full mr-2 ${
              !selectedGroupId ? 'bg-primary' : 'bg-surface'
            }`}
            onPress={() => setSelectedGroup(null)}
          >
            <Text className={!selectedGroupId ? 'text-white font-medium' : 'text-textSecondary'}>
              Tous
            </Text>
          </Pressable>
          {groups.map((group) => (
            <Pressable
              key={group.id}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedGroupId === group.id ? 'bg-primary' : 'bg-surface'
              }`}
              onPress={() => setSelectedGroup(group.id)}
            >
              <Text
                className={
                  selectedGroupId === group.id ? 'text-white font-medium' : 'text-textSecondary'
                }
              >
                {group.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

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
