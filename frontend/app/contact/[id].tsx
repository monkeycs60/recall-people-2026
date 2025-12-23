import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '@/hooks/useContacts';
import { ContactWithDetails, Fact } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { noteService } from '@/services/note.service';
import { Edit3, Mic } from 'lucide-react-native';
import { AISummary } from '@/components/contact/AISummary';
import { ProfileCard } from '@/components/contact/ProfileCard';
import { HotTopicsList } from '@/components/contact/HotTopicsList';
import { TranscriptionArchive } from '@/components/contact/TranscriptionArchive';

type EditingFact = {
  id: string;
  factKey: string;
  factValue: string;
};

export default function ContactDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;

  const { getContactById, deleteContact, updateContact } = useContacts();
  const [contact, setContact] = useState<ContactWithDetails | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [editingFact, setEditingFact] = useState<EditingFact | null>(null);

  const loadContact = useCallback(async () => {
    const loaded = await getContactById(contactId);
    setContact(loaded);
    if (loaded) {
      setEditedFirstName(loaded.firstName);
      setEditedLastName(loaded.lastName || '');
    }
  }, [contactId, getContactById]);

  useFocusEffect(
    useCallback(() => {
      loadContact();
    }, [loadContact])
  );

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le contact',
      `Êtes-vous sûr de vouloir supprimer ${contact?.firstName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (contact) {
              await deleteContact(contact.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!contact || !editedFirstName.trim()) return;
    await updateContact(contact.id, {
      firstName: editedFirstName.trim(),
      lastName: editedLastName.trim() || undefined,
    });
    await loadContact();
    setIsEditingName(false);
  };

  const handleEditFact = (fact: Fact) => {
    setEditingFact({
      id: fact.id,
      factKey: fact.factKey,
      factValue: fact.factValue,
    });
  };

  const handleSaveFact = async () => {
    if (!editingFact) return;
    await factService.update(editingFact.id, {
      factKey: editingFact.factKey,
      factValue: editingFact.factValue,
    });
    await loadContact();
    setEditingFact(null);
  };

  const handleDeleteFact = (fact: Fact) => {
    Alert.alert(
      'Supprimer cette information',
      `Supprimer "${fact.factKey}: ${fact.factValue}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await factService.delete(fact.id);
            await loadContact();
          },
        },
      ]
    );
  };

  const handleResolveHotTopic = async (id: string, resolution?: string) => {
    await hotTopicService.resolve(id, resolution);
    await loadContact();
  };

  const handleReopenHotTopic = async (id: string) => {
    await hotTopicService.reopen(id);
    await loadContact();
  };

  const handleDeleteHotTopic = async (id: string) => {
    await hotTopicService.delete(id);
    await loadContact();
  };

  const handleEditHotTopic = async (id: string, data: { title: string; context?: string }) => {
    await hotTopicService.update(id, data);
    await loadContact();
  };

  const handleUpdateResolution = async (id: string, resolution: string) => {
    await hotTopicService.updateResolution(id, resolution);
    await loadContact();
  };

  const handleDeleteNote = async (id: string) => {
    await noteService.delete(id);
    await loadContact();
  };

  const handleAddNote = () => {
    router.push(`/record/${contactId}`);
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
      {/* Header with name */}
      <View className="mb-6 mt-4">
        {isEditingName ? (
          <View className="bg-surface p-4 rounded-lg">
            <Text className="text-textSecondary text-sm mb-2">Prénom</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={editedFirstName}
              onChangeText={setEditedFirstName}
              placeholder="Prénom"
              placeholderTextColor="#71717a"
            />
            <Text className="text-textSecondary text-sm mb-2">Nom</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={editedLastName}
              onChangeText={setEditedLastName}
              placeholder="Nom (optionnel)"
              placeholderTextColor="#71717a"
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsEditingName(false);
                  setEditedFirstName(contact.firstName);
                  setEditedLastName(contact.lastName || '');
                }}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleSaveName}
              >
                <Text className="text-white font-semibold">Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            className="flex-row items-center"
            onPress={() => setIsEditingName(true)}
          >
            <Text className="text-3xl font-bold text-textPrimary mr-3">
              {contact.firstName} {contact.lastName || contact.nickname || ''}
            </Text>
            <Edit3 size={20} color="#9CA3AF" />
          </Pressable>
        )}

        {contact.tags && contact.tags.length > 0 && !isEditingName && (
          <View className="flex-row gap-2 mt-3">
            {contact.tags.map((tag) => (
              <View key={tag} className="bg-primary/20 px-3 py-1 rounded">
                <Text className="text-primary">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {contact.lastContactAt && !isEditingName && (
          <Text className="text-textSecondary mt-2">
            Dernier contact : {new Date(contact.lastContactAt).toLocaleDateString()}
          </Text>
        )}

        {/* Add note button */}
        {!isEditingName && (
          <Pressable
            className="flex-row items-center justify-center bg-primary py-3 px-4 rounded-lg mt-4"
            onPress={handleAddNote}
          >
            <Mic size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold ml-2">Ajouter une note</Text>
          </Pressable>
        )}
      </View>

      {/* AI Summary */}
      <AISummary summary={contact.aiSummary} />

      {/* Hot Topics Section - En premier pour l'actionnable */}
      <View className="mb-6">
        <Text className="text-xl font-semibold text-textPrimary mb-3">Actualité</Text>
        <HotTopicsList
          hotTopics={contact.hotTopics}
          onResolve={handleResolveHotTopic}
          onReopen={handleReopenHotTopic}
          onDelete={handleDeleteHotTopic}
          onEdit={handleEditHotTopic}
          onUpdateResolution={handleUpdateResolution}
        />
      </View>

      {/* Profile Section */}
      <View className="mb-6">
        <Text className="text-xl font-semibold text-textPrimary mb-3">Profil</Text>
        {editingFact ? (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <Text className="text-textSecondary text-sm mb-2">{editingFact.factKey}</Text>
            <TextInput
              className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-3"
              value={editingFact.factValue}
              onChangeText={(value) => setEditingFact({ ...editingFact, factValue: value })}
              placeholder="Valeur"
              placeholderTextColor="#71717a"
            />
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                onPress={() => setEditingFact(null)}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-2 rounded-lg bg-primary items-center"
                onPress={handleSaveFact}
              >
                <Text className="text-white font-semibold">OK</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ProfileCard
            facts={contact.facts}
            onEditFact={handleEditFact}
            onDeleteFact={handleDeleteFact}
          />
        )}
      </View>

      {/* Transcriptions Archive */}
      <View className="mb-6">
        <TranscriptionArchive notes={contact.notes} onDelete={handleDeleteNote} />
      </View>

      {/* Delete button */}
      <Pressable
        className="bg-error/20 border border-error py-3 rounded-lg items-center"
        onPress={handleDelete}
      >
        <Text className="text-error font-semibold">Supprimer le contact</Text>
      </Pressable>
    </ScrollView>
  );
}
