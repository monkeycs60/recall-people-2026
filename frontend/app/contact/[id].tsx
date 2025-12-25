import { View, Text, ScrollView, Pressable, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContacts } from '@/hooks/useContacts';
import { useContactQuery } from '@/hooks/useContactQuery';
import { Fact, Group, FactType, SearchSourceType } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { memoryService } from '@/services/memory.service';
import { noteService } from '@/services/note.service';
import { groupService } from '@/services/group.service';
import { Edit3, Mic, X, Plus, Check } from 'lucide-react-native';
import { AISummary } from '@/components/contact/AISummary';
import { ProfileCard } from '@/components/contact/ProfileCard';
import { HotTopicsList } from '@/components/contact/HotTopicsList';
import { MemoriesList } from '@/components/contact/MemoriesList';
import { TranscriptionArchive } from '@/components/contact/TranscriptionArchive';

type EditingFact = {
  id: string;
  factKey: string;
  factValue: string;
};

const FACT_TYPE_CONFIG: Record<FactType, { label: string; singular: boolean }> = {
  work: { label: 'Métier', singular: true },
  company: { label: 'Entreprise', singular: true },
  education: { label: 'Formation', singular: true },
  location: { label: 'Ville', singular: true },
  origin: { label: 'Origine', singular: true },
  partner: { label: 'Conjoint', singular: true },
  children: { label: 'Enfants', singular: false },
  hobby: { label: 'Loisirs', singular: false },
  sport: { label: 'Sports', singular: false },
  language: { label: 'Langues', singular: false },
  pet: { label: 'Animaux', singular: false },
  birthday: { label: 'Anniversaire', singular: true },
  how_met: { label: 'Rencontre', singular: true },
  where_met: { label: 'Lieu rencontre', singular: true },
  shared_ref: { label: 'Références', singular: false },
  trait: { label: 'Traits', singular: false },
  gift_idea: { label: 'Idées cadeaux', singular: false },
  gift_given: { label: 'Cadeaux faits', singular: false },
  contact: { label: 'Contact', singular: false },
  relationship: { label: 'Relations', singular: false },
  other: { label: 'Autre', singular: false },
};

export default function ContactDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;
  const highlightType = params.highlightType as SearchSourceType | undefined;
  const highlightId = params.highlightId as string | undefined;

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const { deleteContact, updateContact } = useContacts();
  const { contact, isLoading, isWaitingForSummary, invalidate } = useContactQuery(contactId);

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

  // Adding new items state
  const [isAddingHotTopic, setIsAddingHotTopic] = useState(false);
  const [newHotTopicTitle, setNewHotTopicTitle] = useState('');
  const [newHotTopicContext, setNewHotTopicContext] = useState('');

  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemoryDescription, setNewMemoryDescription] = useState('');
  const [newMemoryEventDate, setNewMemoryEventDate] = useState<Date | null>(null);
  const [showMemoryDatePicker, setShowMemoryDatePicker] = useState(false);
  const [newMemoryIsShared, setNewMemoryIsShared] = useState(false);

  const [isAddingFact, setIsAddingFact] = useState(false);
  const [newFactType, setNewFactType] = useState<FactType | null>(null);
  const [newFactValue, setNewFactValue] = useState('');
  const [showFactTypeDropdown, setShowFactTypeDropdown] = useState(false);

  const loadGroups = useCallback(async () => {
    if (contact) {
      setEditedFirstName(contact.firstName);
      setEditedLastName(contact.lastName || '');

      const contactGroups = await groupService.getGroupsForContact(contactId);
      setGroups(contactGroups);
      setEditedGroupIds(contactGroups.map((group) => group.id));

      const all = await groupService.getAll();
      setAllGroups(all);
    }
  }, [contact, contactId]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  useEffect(() => {
    if (highlightType && highlightId && contact && !isLoading) {
      const timer = setTimeout(() => {
        const sectionKey = `${highlightType}-section`;
        const position = sectionPositions.current[sectionKey];
        if (position !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: position - 100, animated: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightType, highlightId, contact, isLoading]);

  const handleDelete = () => {
    Alert.alert(
      t('contact.deleteContact'),
      `${t('contact.deleteContactConfirm')} ${contact?.firstName} ?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
    invalidate();
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
    invalidate();
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
            invalidate();
          },
        },
      ]
    );
  };

  const handleResolveHotTopic = async (id: string, resolution?: string) => {
    await hotTopicService.resolve(id, resolution);
    invalidate();
  };

  const handleReopenHotTopic = async (id: string) => {
    await hotTopicService.reopen(id);
    invalidate();
  };

  const handleDeleteHotTopic = async (id: string) => {
    await hotTopicService.delete(id);
    invalidate();
  };

  const handleEditHotTopic = async (id: string, data: { title: string; context?: string }) => {
    await hotTopicService.update(id, data);
    invalidate();
  };

  const handleUpdateResolution = async (id: string, resolution: string) => {
    await hotTopicService.updateResolution(id, resolution);
    invalidate();
  };

  const handleDeleteNote = async (id: string) => {
    await noteService.delete(id);
    invalidate();
  };

  const handleEditMemory = async (id: string, data: { description: string; eventDate?: string }) => {
    await memoryService.update(id, data);
    invalidate();
  };

  const handleDeleteMemory = async (id: string) => {
    await memoryService.delete(id);
    invalidate();
  };

  const handleAddNote = () => {
    router.push(`/record/${contactId}`);
  };

  // Add new items handlers
  const handleAddHotTopic = async () => {
    if (!newHotTopicTitle.trim()) return;
    await hotTopicService.create({
      contactId,
      title: newHotTopicTitle.trim(),
      context: newHotTopicContext.trim() || undefined,
    });
    setNewHotTopicTitle('');
    setNewHotTopicContext('');
    setIsAddingHotTopic(false);
    invalidate();
  };

  const handleAddMemory = async () => {
    if (!newMemoryDescription.trim()) return;
    await memoryService.create({
      contactId,
      description: newMemoryDescription.trim(),
      eventDate: newMemoryEventDate ? newMemoryEventDate.toISOString().split('T')[0] : undefined,
      isShared: newMemoryIsShared,
    });
    setNewMemoryDescription('');
    setNewMemoryEventDate(null);
    setShowMemoryDatePicker(false);
    setNewMemoryIsShared(false);
    setIsAddingMemory(false);
    invalidate();
  };

  const handleAddFact = async () => {
    if (!newFactType || !newFactValue.trim()) return;

    const config = FACT_TYPE_CONFIG[newFactType];
    await factService.create({
      contactId,
      factType: newFactType,
      factKey: config.label,
      factValue: newFactValue.trim(),
    });

    setNewFactType(null);
    setNewFactValue('');
    setIsAddingFact(false);
    invalidate();
  };

  const getAvailableFactTypes = (): FactType[] => {
    if (!contact) return [];

    const existingSingularTypes = new Set(
      contact.facts
        .filter(fact => FACT_TYPE_CONFIG[fact.factType].singular)
        .map(fact => fact.factType)
    );

    return (Object.keys(FACT_TYPE_CONFIG) as FactType[]).filter(
      type => !existingSingularTypes.has(type)
    );
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
    let finalGroupIds = editedGroupIds;

    if (groupSearchQuery.trim()) {
      const groupExists = allGroups.some(
        (group) => group.name.toLowerCase() === groupSearchQuery.toLowerCase()
      );
      if (!groupExists) {
        const newGroup = await groupService.create(groupSearchQuery.trim());
        setAllGroups((prev) => [...prev, newGroup]);
        finalGroupIds = [...editedGroupIds, newGroup.id];
      }
    }

    await groupService.setContactGroups(contactId, finalGroupIds);
    await loadGroups();
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Chargement...</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Contact introuvable</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-background px-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
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
                <Text className="text-textSecondary">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleSaveName}
              >
                <Text className="text-white font-semibold">{t('common.save')}</Text>
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
              <Text className="text-textSecondary text-sm mb-2">{t('contact.editGroups')}</Text>

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
                placeholder={t('contact.addGroupPlaceholder')}
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
                  <Text className="text-textSecondary">{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  className="flex-1 py-2 rounded-lg bg-primary items-center"
                  onPress={handleSaveGroups}
                >
                  <Text className="text-white font-semibold">{t('common.save')}</Text>
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
                <Text className="text-primary ml-1">{t('contact.addGroup')}</Text>
              </Pressable>
            )
          )
        )}

        {contact.lastContactAt && !isEditingName && (
          <Text className="text-textSecondary mt-2">
            {t('contact.lastContact')} : {new Date(contact.lastContactAt).toLocaleDateString()}
          </Text>
        )}

        {/* Add note button */}
        {!isEditingName && (
          <Pressable
            className="flex-row items-center justify-center bg-primary py-3 px-4 rounded-lg mt-4"
            onPress={handleAddNote}
          >
            <Mic size={20} color="#FFFFFF" />
            <Text className="text-white font-semibold ml-2">{t('contact.addNote')}</Text>
          </Pressable>
        )}
      </View>

      {/* AI Summary */}
      <AISummary summary={contact.aiSummary} isLoading={isWaitingForSummary} />

      {/* Hot Topics Section - En premier pour l'actionnable */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-textPrimary">{t('contact.sections.news')}</Text>
          <Pressable
            className="flex-row items-center"
            onPress={() => setIsAddingHotTopic(true)}
          >
            <Plus size={20} color="#8B5CF6" />
          </Pressable>
        </View>

        {isAddingHotTopic && (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <Text className="text-textSecondary text-sm mb-2">Titre *</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={newHotTopicTitle}
              onChangeText={setNewHotTopicTitle}
              placeholder="Ex: Recherche appartement"
              placeholderTextColor="#71717a"
            />
            <Text className="text-textSecondary text-sm mb-2">Contexte (optionnel)</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={newHotTopicContext}
              onChangeText={setNewHotTopicContext}
              placeholder="Plus de détails..."
              placeholderTextColor="#71717a"
              multiline
              numberOfLines={3}
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsAddingHotTopic(false);
                  setNewHotTopicTitle('');
                  setNewHotTopicContext('');
                }}
              >
                <Text className="text-textSecondary">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleAddHotTopic}
              >
                <Text className="text-white font-semibold">{t('common.add')}</Text>
              </Pressable>
            </View>
          </View>
        )}

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
      <View
        className="mb-6"
        onLayout={(e) => {
          sectionPositions.current['fact-section'] = e.nativeEvent.layout.y;
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-textPrimary">{t('contact.sections.profile')}</Text>
          <Pressable
            className="flex-row items-center"
            onPress={() => setIsAddingFact(true)}
          >
            <Plus size={20} color="#8B5CF6" />
          </Pressable>
        </View>

        {isAddingFact && (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <Text className="text-textSecondary text-sm mb-2">Type d'information *</Text>
            <Pressable
              className="bg-background py-3 px-4 rounded-lg mb-3"
              onPress={() => setShowFactTypeDropdown(!showFactTypeDropdown)}
            >
              <Text className={newFactType ? "text-textPrimary" : "text-textMuted"}>
                {newFactType ? FACT_TYPE_CONFIG[newFactType].label : t('contact.fact.selectType')}
              </Text>
            </Pressable>

            {showFactTypeDropdown && (
              <View className="bg-background rounded-lg mb-3" style={{ maxHeight: 200 }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {getAvailableFactTypes().map((type) => (
                    <Pressable
                      key={type}
                      className="py-3 px-4 border-b border-surfaceHover"
                      onPress={() => {
                        setNewFactType(type);
                        setShowFactTypeDropdown(false);
                      }}
                    >
                      <Text className="text-textPrimary">{FACT_TYPE_CONFIG[type].label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {newFactType && (
              <>
                <Text className="text-textSecondary text-sm mb-2">Valeur *</Text>
                <TextInput
                  className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
                  value={newFactValue}
                  onChangeText={setNewFactValue}
                  placeholder={`Ex: ${newFactType === 'work' ? 'Développeur' : newFactType === 'hobby' ? 'Guitare' : 'Valeur...'}`}
                  placeholderTextColor="#71717a"
                />
              </>
            )}

            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsAddingFact(false);
                  setNewFactType(null);
                  setNewFactValue('');
                  setShowFactTypeDropdown(false);
                }}
              >
                <Text className="text-textSecondary">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleAddFact}
              >
                <Text className="text-white font-semibold">{t('common.add')}</Text>
              </Pressable>
            </View>
          </View>
        )}

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
                <Text className="text-textSecondary">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-2 rounded-lg bg-primary items-center"
                onPress={handleSaveFact}
              >
                <Text className="text-white font-semibold">{t('common.save')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ProfileCard
            facts={contact.facts}
            onEditFact={handleEditFact}
            onDeleteFact={handleDeleteFact}
            highlightId={highlightType === 'fact' ? highlightId : undefined}
          />
        )}
      </View>

      {/* Memories Section */}
      <View
        className="mb-6"
        onLayout={(e) => {
          sectionPositions.current['memory-section'] = e.nativeEvent.layout.y;
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-textPrimary">{t('contact.sections.memories')}</Text>
          <Pressable
            className="flex-row items-center"
            onPress={() => setIsAddingMemory(true)}
          >
            <Plus size={20} color="#8B5CF6" />
          </Pressable>
        </View>

        {isAddingMemory && (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <Text className="text-textSecondary text-sm mb-2">Description *</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={newMemoryDescription}
              onChangeText={setNewMemoryDescription}
              placeholder="Ex: Week-end ski à Chamonix"
              placeholderTextColor="#71717a"
              multiline
              numberOfLines={2}
            />
            <Text className="text-textSecondary text-sm mb-2">Date de l'événement (optionnel)</Text>
            <Pressable
              className="bg-background py-3 px-4 rounded-lg mb-3"
              onPress={() => setShowMemoryDatePicker(true)}
            >
              <Text className={newMemoryEventDate ? "text-textPrimary" : "text-textMuted"}>
                {newMemoryEventDate
                  ? newMemoryEventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                  : t('contact.memory.selectDate')}
              </Text>
            </Pressable>
            {showMemoryDatePicker && (
              <View className="mb-3">
                <DateTimePicker
                  value={newMemoryEventDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowMemoryDatePicker(false);
                    }
                    if (event.type === 'set' && selectedDate) {
                      setNewMemoryEventDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                  locale="fr"
                />
                {Platform.OS === 'ios' && (
                  <Pressable
                    className="py-2 items-center"
                    onPress={() => setShowMemoryDatePicker(false)}
                  >
                    <Text className="text-primary font-medium">Valider</Text>
                  </Pressable>
                )}
              </View>
            )}
            <Pressable
              className="flex-row items-center mb-3"
              onPress={() => setNewMemoryIsShared(!newMemoryIsShared)}
            >
              <View className={`w-5 h-5 rounded border-2 ${newMemoryIsShared ? 'bg-primary border-primary' : 'border-textMuted'} items-center justify-center mr-2`}>
                {newMemoryIsShared && <Check size={14} color="#FFFFFF" />}
              </View>
              <Text className="text-textPrimary">Moment partagé</Text>
            </Pressable>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsAddingMemory(false);
                  setNewMemoryDescription('');
                  setNewMemoryEventDate(null);
                  setShowMemoryDatePicker(false);
                  setNewMemoryIsShared(false);
                }}
              >
                <Text className="text-textSecondary">{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleAddMemory}
              >
                <Text className="text-white font-semibold">{t('common.add')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {contact.memories.length > 0 ? (
          <MemoriesList
            memories={contact.memories}
            onEdit={handleEditMemory}
            onDelete={handleDeleteMemory}
            highlightId={highlightType === 'memory' ? highlightId : undefined}
          />
        ) : (
          !isAddingMemory && (
            <View className="bg-surface/30 p-4 rounded-lg border border-dashed border-surfaceHover">
              <Text className="text-textMuted text-center">
                Aucun souvenir ajouté
              </Text>
            </View>
          )
        )}
      </View>

      {/* Transcriptions Archive */}
      <View
        className="mb-6"
        onLayout={(e) => {
          sectionPositions.current['note-section'] = e.nativeEvent.layout.y;
        }}
      >
        <TranscriptionArchive
          notes={contact.notes}
          onDelete={handleDeleteNote}
          highlightId={highlightType === 'note' ? highlightId : undefined}
        />
      </View>

      {/* Delete button */}
      <Pressable
        className="bg-error/20 border border-error py-3 rounded-lg items-center"
        onPress={handleDelete}
      >
        <Text className="text-error font-semibold">{t('contact.deleteContact')}</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
