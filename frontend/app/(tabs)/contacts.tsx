import { View, Text, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useContacts } from '@/hooks/useContacts';
import { Contact } from '@/types';

export default function ContactsScreen() {
  const router = useRouter();
  const { contacts, loadContacts } = useContacts();

  useState(() => {
    loadContacts();
  });

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable
      className="bg-surface p-4 rounded-lg mb-3"
      onPress={() => router.push(`/contact/${item.id}`)}
    >
      <Text className="text-textPrimary font-semibold text-lg">
        {item.firstName} {item.lastName}
      </Text>
      {item.tags && item.tags.length > 0 && (
        <View className="flex-row gap-2 mt-2">
          {item.tags.map((tag) => (
            <View key={tag} className="bg-primary/20 px-2 py-1 rounded">
              <Text className="text-primary text-xs">{tag}</Text>
            </View>
          ))}
        </View>
      )}
      {item.lastContactAt && (
        <Text className="text-textMuted text-sm mt-2">
          Dernier contact : {new Date(item.lastContactAt).toLocaleDateString()}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Text className="text-3xl font-bold text-textPrimary mb-6">Contacts</Text>

      {contacts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-textSecondary text-center">
            Aucun contact pour le moment.{'\n'}
            Créez votre première note vocale !
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}
