import { View, Text, FlatList, Pressable, RefreshControl, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsStore } from '@/stores/contacts-store';
import { useGroupsStore } from '@/stores/groups-store';
import { groupService } from '@/services/group.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { factService } from '@/services/fact.service';
import { Contact, HotTopic, Fact } from '@/types';
import { Search, ChevronRight, Flame, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

type ContactPreview = {
  contact: Contact;
  topFacts: Fact[];
  activeHotTopic: HotTopic | null;
};

export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { contacts, loadContacts, isLoading } = useContactsStore();
  const { groups, loadGroups, selectedGroupId, setSelectedGroup } = useGroupsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactIdsByGroup, setContactIdsByGroup] = useState<string[]>([]);
  const [contactPreviews, setContactPreviews] = useState<Map<string, { facts: Fact[]; hotTopic: HotTopic | null }>>(new Map());

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      loadGroups();
    }, [])
  );

  useEffect(() => {
    const loadPreviews = async () => {
      const previews = new Map<string, { facts: Fact[]; hotTopic: HotTopic | null }>();
      for (const contact of contacts) {
        const [facts, hotTopics] = await Promise.all([
          factService.getByContact(contact.id),
          hotTopicService.getByContact(contact.id),
        ]);
        const topFacts = facts.slice(0, 2);
        const activeHotTopic = hotTopics.find((ht) => ht.status === 'active') || null;
        previews.set(contact.id, { facts: topFacts, hotTopic: activeHotTopic });
      }
      setContactPreviews(previews);
    };
    if (contacts.length > 0) {
      loadPreviews();
    }
  }, [contacts]);

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
    if (selectedGroupId && !contactIdsByGroup.includes(contact.id)) {
      return false;
    }
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

  const getInitials = (contact: Contact) => {
    const first = contact.firstName.charAt(0).toUpperCase();
    const last = contact.lastName ? contact.lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  const renderContact = ({ item, index }: { item: Contact; index: number }) => {
    const preview = contactPreviews.get(item.id);
    const topFacts = preview?.facts || [];
    const activeHotTopic = preview?.hotTopic;

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <Pressable
          style={styles.contactCard}
          onPress={() => router.push(`/contact/${item.id}`)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(item)}</Text>
          </View>

          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>
              {item.firstName} {item.lastName || ''}
            </Text>

            {topFacts.length > 0 && (
              <View style={styles.factsRow}>
                {topFacts.map((fact, factIndex) => (
                  <View key={fact.id} style={styles.factPill}>
                    <Text style={styles.factText} numberOfLines={1}>
                      {fact.factValue}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {activeHotTopic && (
              <View style={styles.hotTopicBadge}>
                <Flame size={12} color={Colors.warning} />
                <Text style={styles.hotTopicText} numberOfLines={1}>
                  {activeHotTopic.title}
                </Text>
              </View>
            )}
          </View>

          <ChevronRight size={20} color={Colors.textMuted} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>{t('contacts.title')}</Text>
          <Pressable
            style={styles.aiSearchButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Sparkles size={16} color={Colors.primary} />
            <Text style={styles.aiSearchButtonText}>AI</Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('contacts.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {groups.length > 0 && (
        <View className="px-6 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              style={[styles.filterChip, !selectedGroupId && styles.filterChipActive]}
              onPress={() => setSelectedGroup(null)}
            >
              <Text style={[styles.filterChipText, !selectedGroupId && styles.filterChipTextActive]}>
                Tous
              </Text>
            </Pressable>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                style={[styles.filterChip, selectedGroupId === group.id && styles.filterChipActive]}
                onPress={() => setSelectedGroup(group.id)}
              >
                <Text style={[styles.filterChipText, selectedGroupId === group.id && styles.filterChipTextActive]}>
                  {group.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {filteredContacts.length === 0 && !isLoading ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-textSecondary text-center text-base">
            {searchQuery ? t('search.noResults') : t('contacts.noContacts')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  screenTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.textPrimary,
  },
  aiSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  aiSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  factPill: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  factText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  hotTopicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  hotTopicText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500',
  },
});
