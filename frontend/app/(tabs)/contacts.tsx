import { View, Text, FlatList, Pressable, RefreshControl, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGroupsStore } from '@/stores/groups-store';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useGroupsQuery, useContactIdsForGroup } from '@/hooks/useGroupsQuery';
import { useContactPreviewsQuery } from '@/hooks/useContactPreviewsQuery';
import { Contact } from '@/types';
import { Search, ChevronRight, Flame, Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';

export default function ContactsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { contacts, isLoading, isRefetching, refetch, isPlaceholderData } = useContactsQuery();
  const { groups } = useGroupsQuery();
  const { selectedGroupId, setSelectedGroup } = useGroupsStore();
  const { previews: contactPreviews } = useContactPreviewsQuery(contacts);
  const { data: contactIdsByGroup = [] } = useContactIdsForGroup(selectedGroupId);

  const [searchQuery, setSearchQuery] = useState('');

  // Track si on a déjà montré l'animation initiale
  const hasAnimatedRef = useRef(false);
  const shouldAnimate = !hasAnimatedRef.current && !isPlaceholderData;
  if (contacts.length > 0 && !isPlaceholderData) {
    hasAnimatedRef.current = true;
  }

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
    await refetch();
  };

  const renderContact = ({ item, index }: { item: Contact; index: number }) => {
    const preview = contactPreviews.get(item.id);
    const topFacts = preview?.facts || [];
    const activeHotTopic = preview?.hotTopic;

    const content = (
      <Pressable
        style={styles.contactCard}
        onPress={() => router.push(`/contact/${item.id}`)}
      >
          <View style={styles.avatarContainer}>
            <ContactAvatar
              firstName={item.firstName}
              lastName={item.lastName}
              size="medium"
            />
          </View>

          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>
              {getContactDisplayName(item)}
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
    );

    // Seulement animer au premier chargement, pas quand on revient avec des données en cache
    if (shouldAnimate) {
      return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
          {content}
        </Animated.View>
      );
    }

    return content;
  };

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <View style={styles.headerRow}>
          <Text style={styles.screenTitle}>{t('contacts.title')}</Text>
          <Pressable
            style={styles.aiSearchButton}
            onPress={() => router.push('/(tabs)/search')}
          >
            <Sparkles size={16} color={Colors.secondary} />
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
        <View style={styles.groupsContainer}>
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
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? t('search.noResults') : t('contacts.noContacts')}
          </Text>
          {!searchQuery && (
            <Text style={styles.emptyStateDescription}>
              {t('contacts.noContactsDescription')}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  groupsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
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
    backgroundColor: Colors.secondaryLight,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  aiSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
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
  avatarContainer: {
    marginRight: 14,
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
