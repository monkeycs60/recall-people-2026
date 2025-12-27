import { View, Text, ScrollView, Pressable, TextInput, Alert, Platform, KeyboardAvoidingView, StyleSheet } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useContactQuery,
  useResolveHotTopic,
  useReopenHotTopic,
  useDeleteHotTopic,
  useUpdateHotTopic,
  useUpdateHotTopicResolution,
  useCreateMemory,
  useUpdateMemory,
  useDeleteMemory,
  useDeleteNote,
} from '@/hooks/useContactQuery';
import { useUpdateContact, useDeleteContact } from '@/hooks/useContactsQuery';
import { useGroupsQuery, useGroupsForContact, useSetContactGroups, useCreateGroup } from '@/hooks/useGroupsQuery';
import { Fact, FactType, SearchSourceType } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { Edit3, Mic, X, Plus, Check, Trash2 } from 'lucide-react-native';
import { AISummary } from '@/components/contact/AISummary';
import { IceBreakers } from '@/components/contact/IceBreakers';
import { ProfileCard } from '@/components/contact/ProfileCard';
import { HotTopicsList } from '@/components/contact/HotTopicsList';
import { MemoriesList } from '@/components/contact/MemoriesList';
import { TranscriptionArchive } from '@/components/contact/TranscriptionArchive';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppStore } from '@/stores/app-store';

type EditingFact = {
  id: string;
  factKey: string;
  factValue: string;
};

const FACT_TYPE_CONFIG: Record<FactType, { singular: boolean }> = {
  work: { singular: true },
  company: { singular: true },
  education: { singular: true },
  location: { singular: true },
  origin: { singular: true },
  partner: { singular: true },
  children: { singular: false },
  hobby: { singular: false },
  sport: { singular: false },
  language: { singular: false },
  pet: { singular: false },
  birthday: { singular: true },
  how_met: { singular: true },
  where_met: { singular: true },
  shared_ref: { singular: false },
  trait: { singular: false },
  gift_idea: { singular: false },
  gift_given: { singular: false },
  contact: { singular: false },
  relationship: { singular: false },
  other: { singular: false },
};

const getFactTypeLabel = (t: (key: string) => string, factType: FactType): string => {
  return t(`contact.factTypes.${factType}`);
};

export default function ContactDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;
  const highlightType = params.highlightType as SearchSourceType | undefined;
  const highlightId = params.highlightId as string | undefined;
  const { setPreselectedContactId } = useAppStore();

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const { contact, isLoading, isWaitingForSummary, isWaitingForIceBreakers, invalidate } = useContactQuery(contactId);

  // TanStack Query mutations
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();
  const resolveHotTopicMutation = useResolveHotTopic();
  const reopenHotTopicMutation = useReopenHotTopic();
  const deleteHotTopicMutation = useDeleteHotTopic();
  const updateHotTopicMutation = useUpdateHotTopic();
  const updateHotTopicResolutionMutation = useUpdateHotTopicResolution();
  const createMemoryMutation = useCreateMemory();
  const updateMemoryMutation = useUpdateMemory();
  const deleteMemoryMutation = useDeleteMemory();
  const deleteNoteMutation = useDeleteNote();
  const setContactGroupsMutation = useSetContactGroups();
  const createGroupMutation = useCreateGroup();

  // Groups queries
  const { groups: allGroups } = useGroupsQuery();
  const { data: contactGroups = [] } = useGroupsForContact(contactId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [editingFact, setEditingFact] = useState<EditingFact | null>(null);

  // Groups state
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [editedGroupIds, setEditedGroupIds] = useState<string[]>([]);
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

  // Sync contact data with local state
  useEffect(() => {
    if (contact) {
      setEditedFirstName(contact.firstName);
      setEditedLastName(contact.lastName || '');
    }
  }, [contact]);

  // Sync contact groups with local state
  useEffect(() => {
    setEditedGroupIds(contactGroups.map((group) => group.id));
  }, [contactGroups]);

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
              await deleteContactMutation.mutateAsync(contact.id);
              router.replace('/(tabs)/contacts');
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!contact || !editedFirstName.trim()) return;
    await updateContactMutation.mutateAsync({
      id: contact.id,
      data: {
        firstName: editedFirstName.trim(),
        lastName: editedLastName.trim() || undefined,
      },
    });
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
      t('contact.fact.deleteTitle'),
      t('contact.fact.deleteConfirm', { key: fact.factKey, value: fact.factValue }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
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
    await resolveHotTopicMutation.mutateAsync({ id, resolution });
  };

  const handleReopenHotTopic = async (id: string) => {
    await reopenHotTopicMutation.mutateAsync(id);
  };

  const handleDeleteHotTopic = async (id: string) => {
    await deleteHotTopicMutation.mutateAsync(id);
  };

  const handleEditHotTopic = async (id: string, data: { title: string; context?: string }) => {
    await updateHotTopicMutation.mutateAsync({ id, data });
  };

  const handleUpdateResolution = async (id: string, resolution: string) => {
    await updateHotTopicResolutionMutation.mutateAsync({ id, resolution });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNoteMutation.mutateAsync(id);
  };

  const handleEditMemory = async (id: string, data: { description: string; eventDate?: string }) => {
    await updateMemoryMutation.mutateAsync({ id, data });
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemoryMutation.mutateAsync(id);
  };

  const handleAddNote = () => {
    setPreselectedContactId(contactId);
    router.push('/record');
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
    await createMemoryMutation.mutateAsync({
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
  };

  const handleAddFact = async () => {
    if (!newFactType || !newFactValue.trim()) return;

    await factService.create({
      contactId,
      factType: newFactType,
      factKey: getFactTypeLabel(t, newFactType),
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
    setEditedGroupIds(contactGroups.map((group) => group.id));
    setIsEditingGroups(true);
  };

  const handleCancelEditingGroups = () => {
    setEditedGroupIds(contactGroups.map((group) => group.id));
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
        const newGroup = await createGroupMutation.mutateAsync(groupSearchQuery.trim());
        finalGroupIds = [...editedGroupIds, newGroup.id];
      }
    }

    await setContactGroupsMutation.mutateAsync({ contactId, groupIds: finalGroupIds });
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
    const newGroup = await createGroupMutation.mutateAsync(name);
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Header with Avatar */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <ContactAvatar
              firstName={contact.firstName}
              lastName={contact.lastName}
              size="large"
            />
          </View>

          {isEditingName ? (
            <View style={styles.editNameCard}>
              <Text style={styles.inputLabel}>{t('contact.name.firstName')}</Text>
              <TextInput
                style={styles.input}
                value={editedFirstName}
                onChangeText={setEditedFirstName}
                placeholder={t('contact.name.firstNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('contact.name.lastName')}</Text>
              <TextInput
                style={styles.input}
                value={editedLastName}
                onChangeText={setEditedLastName}
                placeholder={t('contact.name.lastNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditingName(false);
                    setEditedFirstName(contact.firstName);
                    setEditedLastName(contact.lastName || '');
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSaveName}>
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={() => setIsEditingName(true)}>
              <Text style={styles.contactName}>
                {contact.firstName} {contact.lastName || contact.nickname || ''}
              </Text>
              <Edit3 size={18} color={Colors.textMuted} />
            </Pressable>
          )}

          {/* Groups display/edit */}
          {!isEditingName && (
            isEditingGroups ? (
              <View style={styles.editGroupsCard}>
                <Text style={styles.inputLabel}>{t('contact.editGroups')}</Text>

                {/* Current groups as removable chips */}
                <View style={styles.groupChipsContainer}>
                  {editedGroupIds.map((groupId) => {
                    const group = allGroups.find((g) => g.id === groupId);
                    if (!group) return null;
                    return (
                      <Pressable
                        key={groupId}
                        style={styles.groupChipRemovable}
                        onPress={() => toggleGroupInEdit(groupId)}
                      >
                        <Text style={styles.groupChipText}>{group.name}</Text>
                        <X size={14} color={Colors.primary} />
                      </Pressable>
                    );
                  })}
                </View>

                {/* Search/add input */}
                <TextInput
                  style={styles.input}
                  value={groupSearchQuery}
                  onChangeText={setGroupSearchQuery}
                  placeholder={t('contact.addGroupPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                />

                {/* Search results */}
                {filteredGroupsForSearch.length > 0 && (
                  <View style={styles.groupSearchResults}>
                    {filteredGroupsForSearch.slice(0, 5).map((group) => (
                      <Pressable
                        key={group.id}
                        style={styles.groupSearchItem}
                        onPress={() => toggleGroupInEdit(group.id)}
                      >
                        <Text style={styles.groupSearchItemText}>{group.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Create new option */}
                {groupSearchQuery.trim() && !allGroups.some(
                  (g) => g.name.toLowerCase() === groupSearchQuery.toLowerCase()
                ) && (
                  <Pressable
                    style={styles.createGroupButton}
                    onPress={() => handleCreateAndAddGroup(groupSearchQuery.trim())}
                  >
                    <Text style={styles.createGroupText}>
                      {t('contact.createGroup', { name: groupSearchQuery.trim() })}
                    </Text>
                  </Pressable>
                )}

                {/* Action buttons */}
                <View style={styles.buttonRow}>
                  <Pressable style={styles.cancelButton} onPress={handleCancelEditingGroups}>
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={handleSaveGroups}>
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              contactGroups.length > 0 ? (
                <Pressable style={styles.groupChipsContainer} onPress={handleStartEditingGroups}>
                  {contactGroups.map((group) => (
                    <View key={group.id} style={styles.groupChip}>
                      <Text style={styles.groupChipText}>{group.name}</Text>
                    </View>
                  ))}
                  <View style={styles.editGroupsIcon}>
                    <Edit3 size={14} color={Colors.textMuted} />
                  </View>
                </Pressable>
              ) : (
                <Pressable style={styles.addGroupButton} onPress={handleStartEditingGroups}>
                  <Plus size={16} color={Colors.primary} />
                  <Text style={styles.addGroupText}>{t('contact.addGroup')}</Text>
                </Pressable>
              )
            )
          )}

          {contact.lastContactAt && !isEditingName && (
            <Text style={styles.lastContactText}>
              {t('contact.lastContact')} : {new Date(contact.lastContactAt).toLocaleDateString()}
            </Text>
          )}

          {/* Add note button */}
          {!isEditingName && (
            <Pressable style={styles.addNoteButton} onPress={handleAddNote}>
              <Mic size={20} color={Colors.textInverse} />
              <Text style={styles.addNoteButtonText}>{t('contact.addNote')}</Text>
            </Pressable>
          )}
        </Animated.View>

        {/* AI Summary */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
          <AISummary summary={contact.aiSummary} isLoading={isWaitingForSummary} firstName={contact.firstName} />
        </Animated.View>

        {/* Ice Breakers */}
        <Animated.View entering={FadeInDown.delay(125).duration(300)} style={styles.section}>
          <IceBreakers iceBreakers={contact.iceBreakers} isLoading={isWaitingForIceBreakers} firstName={contact.firstName} />
        </Animated.View>

        {/* Hot Topics Section */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('contact.sections.news')}</Text>
            <Pressable onPress={() => setIsAddingHotTopic(true)}>
              <Plus size={20} color={Colors.primary} />
            </Pressable>
          </View>

          {isAddingHotTopic && (
            <View style={styles.addCard}>
              <Text style={styles.inputLabel}>{t('contact.addHotTopic.titleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={newHotTopicTitle}
                onChangeText={setNewHotTopicTitle}
                placeholder={t('contact.addHotTopic.titlePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('contact.addHotTopic.contextLabel')}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={newHotTopicContext}
                onChangeText={setNewHotTopicContext}
                placeholder={t('contact.addHotTopic.contextPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAddingHotTopic(false);
                    setNewHotTopicTitle('');
                    setNewHotTopicContext('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleAddHotTopic}>
                  <Text style={styles.saveButtonText}>{t('common.add')}</Text>
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
        </Animated.View>

        {/* Profile Section */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current['fact-section'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('contact.sections.profile')}</Text>
            <Pressable onPress={() => setIsAddingFact(true)}>
              <Plus size={20} color={Colors.primary} />
            </Pressable>
          </View>

          {isAddingFact && (
            <View style={styles.addCard}>
              <Text style={styles.inputLabel}>{t('contact.fact.infoTypeLabel')}</Text>
              <Pressable
                style={styles.dropdown}
                onPress={() => setShowFactTypeDropdown(!showFactTypeDropdown)}
              >
                <Text style={newFactType ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {newFactType ? getFactTypeLabel(t, newFactType) : t('contact.fact.selectType')}
                </Text>
              </Pressable>

              {showFactTypeDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={{ maxHeight: 200 }}>
                    {getAvailableFactTypes().map((type) => (
                      <Pressable
                        key={type}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setNewFactType(type);
                          setShowFactTypeDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{getFactTypeLabel(t, type)}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {newFactType && (
                <>
                  <Text style={styles.inputLabel}>{t('contact.fact.valueLabel')}</Text>
                  <TextInput
                    style={styles.input}
                    value={newFactValue}
                    onChangeText={setNewFactValue}
                    placeholder={`Ex: ${newFactType === 'work' ? 'Développeur' : newFactType === 'hobby' ? 'Guitare' : 'Valeur...'}`}
                    placeholderTextColor={Colors.textMuted}
                  />
                </>
              )}

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAddingFact(false);
                    setNewFactType(null);
                    setNewFactValue('');
                    setShowFactTypeDropdown(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleAddFact}>
                  <Text style={styles.saveButtonText}>{t('common.add')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {editingFact ? (
            <View style={styles.addCard}>
              <Text style={styles.inputLabel}>{editingFact.factKey}</Text>
              <TextInput
                style={styles.input}
                value={editingFact.factValue}
                onChangeText={(value) => setEditingFact({ ...editingFact, factValue: value })}
                placeholder="Valeur"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.buttonRow}>
                <Pressable style={styles.cancelButton} onPress={() => setEditingFact(null)}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSaveFact}>
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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
        </Animated.View>

        {/* Memories Section */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(300)}
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current['memory-section'] = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('contact.sections.memories')}</Text>
            <Pressable onPress={() => setIsAddingMemory(true)}>
              <Plus size={20} color={Colors.primary} />
            </Pressable>
          </View>

          {isAddingMemory && (
            <View style={styles.addCard}>
              <Text style={styles.inputLabel}>{t('contact.memory.descriptionLabel')}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={newMemoryDescription}
                onChangeText={setNewMemoryDescription}
                placeholder={t('contact.memory.descriptionPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.inputLabel}>{t('contact.memory.eventDateLabel')}</Text>
              <Pressable
                style={styles.dropdown}
                onPress={() => setShowMemoryDatePicker(true)}
              >
                <Text style={newMemoryEventDate ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {newMemoryEventDate
                    ? newMemoryEventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : t('contact.memory.selectDate')}
                </Text>
              </Pressable>
              {showMemoryDatePicker && (
                <View style={styles.datePickerContainer}>
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
                      style={styles.validateDateButton}
                      onPress={() => setShowMemoryDatePicker(false)}
                    >
                      <Text style={styles.validateDateText}>{t('contact.memory.validate')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setNewMemoryIsShared(!newMemoryIsShared)}
              >
                <View style={[styles.checkbox, newMemoryIsShared && styles.checkboxChecked]}>
                  {newMemoryIsShared && <Check size={14} color={Colors.textInverse} />}
                </View>
                <Text style={styles.checkboxLabel}>{t('contact.memory.sharedMoment')}</Text>
              </Pressable>
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAddingMemory(false);
                    setNewMemoryDescription('');
                    setNewMemoryEventDate(null);
                    setShowMemoryDatePicker(false);
                    setNewMemoryIsShared(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleAddMemory}>
                  <Text style={styles.saveButtonText}>{t('common.add')}</Text>
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  {t('contact.memory.emptyState')}
                </Text>
              </View>
            )
          )}
        </Animated.View>

        {/* Transcriptions Archive */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(300)}
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current['note-section'] = e.nativeEvent.layout.y;
          }}
        >
          <TranscriptionArchive
            notes={contact.notes}
            onDelete={handleDeleteNote}
            highlightId={highlightType === 'note' ? highlightId : undefined}
          />
        </Animated.View>

        {/* Delete button */}
        <Animated.View entering={FadeInDown.delay(350).duration(300)} style={styles.section}>
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Trash2 size={18} color={Colors.error} />
            <Text style={styles.deleteButtonText}>{t('contact.deleteContact')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  editNameCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginTop: 8,
  },
  editGroupsCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  groupChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  groupChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  groupChipRemovable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  groupChipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  editGroupsIcon: {
    backgroundColor: Colors.surface,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  addGroupText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  groupSearchResults: {
    marginBottom: 8,
  },
  groupSearchItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 4,
  },
  groupSearchItemText: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  createGroupButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  createGroupText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  lastContactText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addNoteButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
  addCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  dropdown: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  dropdownText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  dropdownList: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  datePickerContainer: {
    marginBottom: 12,
  },
  validateDateButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  validateDateText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyStateText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
