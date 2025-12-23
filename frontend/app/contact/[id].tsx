import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '@/hooks/useContacts';
import { ContactWithDetails, Fact, Group } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { noteService } from '@/services/note.service';
import { groupService } from '@/services/group.service';
import { Edit3, Mic, X, Plus } from 'lucide-react-native';
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

  // Groups state
  const [groups, setGroups] = useState<Group[]>([]);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [editedGroupIds, setEditedGroupIds] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  const loadContact = useCallback(async () => {
    const loaded = await getContactById(contactId);
    setContact(loaded);
    if (loaded) {
      setEditedFirstName(loaded.firstName);
      setEditedLastName(loaded.lastName || '');

      // Load groups
      const contactGroups = await groupService.getGroupsForContact(contactId);
      setGroups(contactGroups);
      setEditedGroupIds(contactGroups.map((g) => g.id));

      // Load all groups for editing
      const all = await groupService.getAll();
      setAllGroups(all);
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
              router.replace('/(tabs)/contacts');
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

  // Group handlers
  const handleStartEditingGroups = () => {
    setEditedGroupIds(groups.map((g) => g.id));
    setIsEditingGroups(true);
  };

  const handleCancelEditingGroups = () => {
    setEditedGroupIds(groups.map((g) => g.id));
    setIsEditingGroups(false);
    setGroupSearchQuery('');
  };

  const handleSaveGroups = async () => {
    await groupService.setContactGroups(contactId, editedGroupIds);
    await loadContact();
    setIsEditingGroups(false);
    setGroupSearchQuery('');
  };

  const toggleGroupInEdit = (groupId: string) => {
    setEditedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleCreateAndAddGroup = async (name: string) => {
    const newGroup = await groupService.create(name);
    setAllGroups((prev) => [...prev, newGroup]);
    setEditedGroupIds((prev) => [...prev, newGroup.id]);
    setGroupSearchQuery('');
  };

  const availableGroups = allGroups.filter((g) => !editedGroupIds.includes(g.id));

  const filteredGroupsForSearch = groupSearchQuery.trim()
    ? availableGroups.filter((g) =>
        g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
      )
    : availableGroups.slice(0, 5);

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

        {/* Groups display/edit */}
        {!isEditingName && (
          isEditingGroups ? (
            <View className="bg-surface p-4 rounded-lg mt-3">
              <Text className="text-textSecondary text-sm mb-2">Modifier les groupes</Text>

              {/* Current groups as removable chips */}
              <View className="flex-row flex-wrap gap-2 mb-3">
                {editedGroupIds.map((groupId) => {
                  const group = allGroups.find((g) => g.id === groupId);
                  if (!group) return null;
                  return (
                    <Pressable
                      key={groupId}
                      className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full"
                      onPress={() => toggleGroupInEdit(groupId)}
                    >
                      <Text className="text-primary mr-1">{group.name}</Text>
                      <X size={14} color="#8B5CF6" />
                    </Pressable>
                  );
                })}
              </View>

              {/* Search/add input */}
              <TextInput
                className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-2"
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                placeholder="Ajouter un groupe..."
                placeholderTextColor="#71717a"
              />

              {/* Search results */}
              {filteredGroupsForSearch.length > 0 && (
                <View className="mb-2">
                  {filteredGroupsForSearch.slice(0, 5).map((group) => (
                    <Pressable
                      key={group.id}
                      className="py-2 px-3 bg-surfaceHover rounded mb-1"
                      onPress={() => toggleGroupInEdit(group.id)}
                    >
                      <Text className="text-textPrimary">{group.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Create new option */}
              {groupSearchQuery.trim() && !allGroups.some(
                (g) => g.name.toLowerCase() === groupSearchQuery.toLowerCase()
              ) && (
                <Pressable
                  className="py-2 px-3 bg-primary/10 rounded mb-2"
                  onPress={() => handleCreateAndAddGroup(groupSearchQuery.trim())}
                >
                  <Text className="text-primary">
                    Créer "{groupSearchQuery.trim()}"
                  </Text>
                </Pressable>
              )}

              {/* Action buttons */}
              <View className="flex-row gap-3 mt-2">
                <Pressable
                  className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                  onPress={handleCancelEditingGroups}
                >
                  <Text className="text-textSecondary">Annuler</Text>
                </Pressable>
                <Pressable
                  className="flex-1 py-2 rounded-lg bg-primary items-center"
                  onPress={handleSaveGroups}
                >
                  <Text className="text-white font-semibold">Enregistrer</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            groups.length > 0 ? (
              <Pressable
                className="flex-row flex-wrap gap-2 mt-3"
                onPress={handleStartEditingGroups}
              >
                {groups.map((group) => (
                  <View
                    key={group.id}
                    className="bg-primary/20 px-3 py-1 rounded-full"
                  >
                    <Text className="text-primary">{group.name}</Text>
                  </View>
                ))}
                <View className="bg-surfaceHover px-2 py-1 rounded-full">
                  <Edit3 size={14} color="#9CA3AF" />
                </View>
              </Pressable>
            ) : (
              <Pressable
                className="flex-row items-center mt-3"
                onPress={handleStartEditingGroups}
              >
                <Plus size={16} color="#8B5CF6" />
                <Text className="text-primary ml-1">Ajouter un groupe</Text>
              </Pressable>
            )
          )
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
