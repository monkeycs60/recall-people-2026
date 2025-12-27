import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ExtractionResult, HotTopic, ResolvedTopic, ExtractedMemory } from '@/types';
import { useCreateContact, useUpdateContact } from '@/hooks/useContactsQuery';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useNotes } from '@/hooks/useNotes';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { memoryService } from '@/services/memory.service';
import { contactService } from '@/services/contact.service';
import { groupService } from '@/services/group.service';
import { generateSummary, generateIceBreakers } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { queryKeys } from '@/lib/query-keys';
import { Archive, Edit3, Plus, X } from 'lucide-react-native';

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const { groups: allGroups } = useGroupsQuery();
  const { createNote } = useNotes();
  const { setRecordingState } = useAppStore();

  const extraction: ExtractionResult = JSON.parse(params.extraction as string);
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;
  const contactId = params.contactId as string;

  // Debug: vérifier les résolutions de l'IA
  console.log('=== EXTRACTION resolvedTopics ===', JSON.stringify(extraction.resolvedTopics, null, 2));

  const [selectedFacts, setSelectedFacts] = useState<number[]>(
    extraction.facts.map((_, index) => index)
  );
  const [editableFacts, setEditableFacts] = useState(
    extraction.facts.map((fact) => ({ ...fact }))
  );
  const [editingFactIndex, setEditingFactIndex] = useState<number | null>(null);

  const [selectedHotTopics, setSelectedHotTopics] = useState<number[]>(
    extraction.hotTopics?.map((_, index) => index) || []
  );
  const [editableHotTopics, setEditableHotTopics] = useState(
    extraction.hotTopics?.map((topic) => ({ ...topic })) || []
  );
  const [editingHotTopicIndex, setEditingHotTopicIndex] = useState<number | null>(null);

  const [selectedMemories, setSelectedMemories] = useState<number[]>(
    extraction.memories?.map((_, index) => index) || []
  );
  const [editableMemories, setEditableMemories] = useState<ExtractedMemory[]>(
    extraction.memories?.map((memory) => ({ ...memory })) || []
  );
  const [editingMemoryIndex, setEditingMemoryIndex] = useState<number | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [existingHotTopics, setExistingHotTopics] = useState<HotTopic[]>([]);

  // Store resolved topics with editable resolutions
  const [resolvedTopicsState, setResolvedTopicsState] = useState<ResolvedTopic[]>(
    extraction.resolvedTopics || []
  );
  const [editingResolutionId, setEditingResolutionId] = useState<string | null>(null);

  // Groups state (only for new contacts)
  const [selectedGroups, setSelectedGroups] = useState<Array<{
    name: string;
    isNew: boolean;
    existingId?: string;
  }>>(extraction.suggestedGroups || []);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupSearch, setNewGroupSearch] = useState('');

  // Load existing hot topics to display titles for resolved ones
  useEffect(() => {
    const loadHotTopics = async () => {
      if (contactId !== 'new') {
        const topics = await hotTopicService.getByContact(contactId);
        setExistingHotTopics(topics.filter((topic) => topic.status === 'active'));
      }
    };
    loadHotTopics();
  }, [contactId]);

  // Get resolved topics with their full data (combining existing topic info with resolutions)
  const resolvedTopicsWithData = existingHotTopics
    .filter((topic) => resolvedTopicsState.some((resolved) => resolved.id === topic.id))
    .map((topic) => ({
      ...topic,
      proposedResolution: resolvedTopicsState.find((resolved) => resolved.id === topic.id)?.resolution || '',
    }));

  const toggleResolvedTopic = (topicId: string) => {
    setResolvedTopicsState((prev) => {
      const exists = prev.some((resolved) => resolved.id === topicId);
      if (exists) {
        return prev.filter((resolved) => resolved.id !== topicId);
      } else {
        // Re-add with original resolution from extraction
        const originalResolution = extraction.resolvedTopics?.find((resolved) => resolved.id === topicId)?.resolution || '';
        return [...prev, { id: topicId, resolution: originalResolution }];
      }
    });
  };

  const updateResolution = (topicId: string, resolution: string) => {
    setResolvedTopicsState((prev) =>
      prev.map((resolved) =>
        resolved.id === topicId ? { ...resolved, resolution } : resolved
      )
    );
  };

  const toggleFact = (index: number) => {
    setSelectedFacts((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleHotTopic = (index: number) => {
    setSelectedHotTopics((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateFact = (index: number, field: 'factKey' | 'factValue', value: string) => {
    setEditableFacts((prev) =>
      prev.map((fact, factIndex) =>
        factIndex === index ? { ...fact, [field]: value } : fact
      )
    );
  };

  const updateHotTopic = (index: number, field: 'title' | 'context', value: string) => {
    setEditableHotTopics((prev) =>
      prev.map((topic, topicIndex) =>
        topicIndex === index ? { ...topic, [field]: value } : topic
      )
    );
  };

  const toggleMemory = (index: number) => {
    setSelectedMemories((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateMemory = (index: number, field: 'description' | 'eventDate', value: string) => {
    setEditableMemories((prev) =>
      prev.map((memory, memoryIndex) =>
        memoryIndex === index ? { ...memory, [field]: value } : memory
      )
    );
  };

  // Group handlers
  const toggleGroup = (group: { name: string; isNew: boolean; existingId?: string }) => {
    setSelectedGroups((prev) => {
      const exists = prev.some((g) => g.name.toLowerCase() === group.name.toLowerCase());
      if (exists) {
        return prev.filter((g) => g.name.toLowerCase() !== group.name.toLowerCase());
      }
      return [...prev, group];
    });
  };

  const addNewGroup = (name: string) => {
    const existing = allGroups.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const group = existing
      ? { name: existing.name, isNew: false, existingId: existing.id }
      : { name: name.trim(), isNew: true };

    if (!selectedGroups.some((g) => g.name.toLowerCase() === group.name.toLowerCase())) {
      setSelectedGroups((prev) => [...prev, group]);
    }
    setNewGroupSearch('');
    setIsAddingGroup(false);
  };

  const availableGroups = allGroups.filter((g) =>
    !selectedGroups.some((sg) => sg.existingId === g.id || sg.name.toLowerCase() === g.name.toLowerCase())
  );

  const filteredGroupsForSearch = newGroupSearch.trim()
    ? availableGroups.filter((g) =>
        g.name.toLowerCase().includes(newGroupSearch.toLowerCase())
      )
    : availableGroups.slice(0, 5);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let finalContactId = contactId;

      if (contactId === 'new') {
        const newContact = await createContactMutation.mutateAsync({
          firstName: extraction.contactIdentified.firstName,
          lastName: extraction.contactIdentified.lastName,
          nickname: extraction.contactIdentified.suggestedNickname,
        });
        finalContactId = newContact.id;

        // Save groups for new contact
        if (selectedGroups.length > 0) {
          const groupIds: string[] = [];
          for (const group of selectedGroups) {
            if (group.existingId) {
              groupIds.push(group.existingId);
            } else {
              const newGroup = await groupService.create(group.name);
              groupIds.push(newGroup.id);
            }
          }
          await groupService.setContactGroups(finalContactId, groupIds);
        }
      }

      const note = await createNote({
        contactId: finalContactId,
        title: extraction.noteTitle,
        audioUri,
        transcription,
        summary: extraction.note.summary,
      });

      // Types cumulatifs : on ajoute sans écraser, sauf si même valeur existe déjà
      const cumulativeTypes = [
        'hobby', 'sport', 'children', 'language', 'pet',
        'shared_ref', 'trait', 'gift_idea', 'gift_given'
      ];

      for (const index of selectedFacts) {
        const fact = editableFacts[index];
        const isCumulative = cumulativeTypes.includes(fact.factType);

        if (isCumulative) {
          // Pour les types cumulatifs : vérifier si la même VALEUR existe déjà
          const existingWithSameValue = await factService.findByTypeAndValue(
            finalContactId,
            fact.factType,
            fact.factValue
          );

          if (existingWithSameValue) {
            // Même valeur existe déjà → ne rien faire
            continue;
          }

          // Valeur différente → créer un nouveau fact (pas d'update)
          await factService.create({
            contactId: finalContactId,
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
            sourceNoteId: note.id,
          });
        } else {
          // Pour les types singuliers : chercher par type et key, puis update ou create
          const existingFact = await factService.findByTypeAndKey(
            finalContactId,
            fact.factType,
            fact.factKey
          );

          if (existingFact) {
            // Même valeur → ne rien faire
            if (existingFact.factValue.toLowerCase() === fact.factValue.toLowerCase()) {
              continue;
            }
            // Valeur différente → update avec historique
            await factService.updateWithHistory(existingFact.id, fact.factValue);
          } else {
            // Nouveau fact
            await factService.create({
              contactId: finalContactId,
              factType: fact.factType,
              factKey: fact.factKey,
              factValue: fact.factValue,
              sourceNoteId: note.id,
            });
          }
        }
      }

      // Save new hot topics (only selected ones)
      if (editableHotTopics.length > 0) {
        for (const index of selectedHotTopics) {
          const topic = editableHotTopics[index];
          await hotTopicService.create({
            contactId: finalContactId,
            title: topic.title,
            context: topic.context,
            sourceNoteId: note.id,
          });
        }
      }

      // Resolve selected hot topics with their resolutions
      if (resolvedTopicsState.length > 0) {
        for (const resolved of resolvedTopicsState) {
          await hotTopicService.resolve(resolved.id, resolved.resolution || undefined);
        }
      }

      // Save new memories (only selected ones)
      if (editableMemories.length > 0) {
        for (const index of selectedMemories) {
          const memory = editableMemories[index];
          await memoryService.create({
            contactId: finalContactId,
            description: memory.description,
            eventDate: memory.eventDate || undefined,
            isShared: memory.isShared,
            sourceNoteId: note.id,
          });
        }
      }

      await updateContactMutation.mutateAsync({
        id: finalContactId,
        data: { lastContactAt: new Date().toISOString() },
      });

      // Clear summary and ice breakers to trigger polling on contact page
      await contactService.update(finalContactId, { aiSummary: '', iceBreakers: [] });

      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.facts.byContact(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories.byContact(finalContactId) });

      // Generate AI summary and ice breakers in background (non-blocking)
      const contactDetails = await contactService.getById(finalContactId);
      if (contactDetails) {
        const requestData = {
          contact: {
            firstName: contactDetails.firstName,
            lastName: contactDetails.lastName,
          },
          facts: contactDetails.facts.map((fact) => ({
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
          })),
          hotTopics: contactDetails.hotTopics
            .filter((topic) => topic.status === 'active')
            .map((topic) => ({
              title: topic.title,
              context: topic.context || '',
              status: topic.status,
            })),
        };

        // Generate summary (non-blocking)
        generateSummary(requestData)
          .then(async (summary) => {
            await contactService.update(finalContactId, { aiSummary: summary });
          })
          .catch(() => {});

        // Generate ice breakers (non-blocking)
        generateIceBreakers(requestData)
          .then(async (iceBreakers) => {
            await contactService.update(finalContactId, { iceBreakers });
          })
          .catch(() => {});
      }

      setRecordingState('idle');
      router.replace(`/contact/${finalContactId}`);
    } catch (error) {
      console.error('Failed to save:', error);
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background px-6 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <Text className="text-2xl font-bold text-textPrimary mb-2">
        {extraction.contactIdentified.firstName} {extraction.contactIdentified.lastName || extraction.contactIdentified.suggestedNickname || ''}
      </Text>

      <Text className="text-textSecondary mb-6">
        {contactId === 'new' ? t('review.newContact') : t('review.update')}
      </Text>

      {editableFacts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            {t('review.extractedInfo')}
          </Text>

          {editableFacts.map((fact, index) => {
            const isEditing = editingFactIndex === index;

            if (isEditing) {
              return (
                <View key={index} className="bg-surface p-4 rounded-lg mb-3">
                  <Text className="text-textSecondary text-sm mb-2">{fact.factKey}</Text>
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-3"
                    value={fact.factValue}
                    onChangeText={(value) => updateFact(index, 'factValue', value)}
                    placeholder={t('review.valuePlaceholder')}
                    placeholderTextColor="#71717a"
                  />
                  <Pressable
                    className="py-2 px-4 bg-primary/20 rounded items-center self-start"
                    onPress={() => setEditingFactIndex(null)}
                  >
                    <Text className="text-primary font-medium">OK</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View
                key={index}
                className="bg-surface p-4 rounded-lg mb-3 flex-row items-start"
              >
                <Pressable onPress={() => toggleFact(index)}>
                  <View
                    className={`w-5 h-5 rounded mr-3 items-center justify-center mt-0.5 ${
                      selectedFacts.includes(index) ? 'bg-primary' : 'bg-surfaceHover'
                    }`}
                  >
                    {selectedFacts.includes(index) && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                </Pressable>

                <Pressable className="flex-1" onPress={() => setEditingFactIndex(index)}>
                  <View className="flex-row items-center">
                    <Text className="text-textSecondary text-sm flex-1">{fact.factKey}</Text>
                    <Edit3 size={14} color="#9CA3AF" />
                  </View>
                  <Text className="text-textPrimary font-medium">{fact.factValue}</Text>
                  {fact.action === 'update' && fact.previousValue && (
                    <Text className="text-warning text-xs mt-1">
                      {t('review.previousValue', { value: fact.previousValue })}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Groups Section - Only for new contacts */}
      {contactId === 'new' && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            {t('review.groups')}
          </Text>

          {/* Selected groups as chips */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {selectedGroups.map((group) => (
              <Pressable
                key={group.name}
                className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full"
                onPress={() => toggleGroup(group)}
              >
                <Text className="text-primary mr-1">{group.name}</Text>
                {group.isNew && (
                  <Text className="text-primary/60 text-xs mr-1">{t('review.new')}</Text>
                )}
                <X size={14} color="#8B5CF6" />
              </Pressable>
            ))}
          </View>

          {/* Add group input */}
          {isAddingGroup ? (
            <View className="bg-surface p-3 rounded-lg">
              <TextInput
                className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-2"
                value={newGroupSearch}
                onChangeText={setNewGroupSearch}
                placeholder={t('review.groupNamePlaceholder')}
                placeholderTextColor="#71717a"
                autoFocus
              />

              {/* Search results */}
              {filteredGroupsForSearch.length > 0 && (
                <View className="mb-2">
                  {filteredGroupsForSearch.map((group) => (
                    <Pressable
                      key={group.id}
                      className="py-2 px-3 bg-surfaceHover rounded mb-1"
                      onPress={() => addNewGroup(group.name)}
                    >
                      <Text className="text-textPrimary">{group.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Create new option */}
              {newGroupSearch.trim() && !filteredGroupsForSearch.some(
                (g) => g.name.toLowerCase() === newGroupSearch.toLowerCase()
              ) && !allGroups.some(
                (g) => g.name.toLowerCase() === newGroupSearch.toLowerCase()
              ) && (
                <Pressable
                  className="py-2 px-3 bg-primary/10 rounded mb-2"
                  onPress={() => addNewGroup(newGroupSearch)}
                >
                  <Text className="text-primary">
                    {t('review.createGroup', { name: newGroupSearch.trim() })}
                  </Text>
                </Pressable>
              )}

              <Pressable
                className="py-2 items-center"
                onPress={() => {
                  setIsAddingGroup(false);
                  setNewGroupSearch('');
                }}
              >
                <Text className="text-textSecondary">{t('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              className="flex-row items-center py-2"
              onPress={() => setIsAddingGroup(true)}
            >
              <Plus size={18} color="#8B5CF6" />
              <Text className="text-primary ml-2">{t('review.addGroup')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Resolved Hot Topics Section */}
      {(resolvedTopicsWithData.length > 0 || extraction.resolvedTopics?.length > 0) && (
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <Archive size={20} color="#10B981" />
            <Text className="text-lg font-semibold text-textPrimary ml-2">
              {t('review.topicsToArchive')}
            </Text>
          </View>
          <Text className="text-textMuted text-sm mb-3">
            {t('review.topicsToArchiveDescription')}
          </Text>

          {existingHotTopics
            .filter((topic) => extraction.resolvedTopics?.some((resolved) => resolved.id === topic.id))
            .map((topic) => {
              const isSelected = resolvedTopicsState.some((resolved) => resolved.id === topic.id);
              const currentResolution = resolvedTopicsState.find((resolved) => resolved.id === topic.id)?.resolution || '';
              const isEditing = editingResolutionId === topic.id;

              return (
                <View
                  key={topic.id}
                  className="bg-success/10 border border-success/30 p-4 rounded-lg mb-3"
                >
                  <Pressable
                    className="flex-row items-start"
                    onPress={() => toggleResolvedTopic(topic.id)}
                  >
                    <View
                      className={`w-5 h-5 rounded mr-3 items-center justify-center mt-0.5 ${
                        isSelected ? 'bg-success' : 'bg-surfaceHover'
                      }`}
                    >
                      {isSelected && (
                        <Text className="text-white text-xs">✓</Text>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-textPrimary font-medium">{topic.title}</Text>
                      {topic.context && (
                        <Text className="text-textSecondary text-sm mt-1">{topic.context}</Text>
                      )}
                    </View>
                  </Pressable>

                  {isSelected && (
                    <View className="mt-3 ml-8">
                      <Text className="text-success text-xs font-medium mb-1">{t('review.resolutionLabel')}</Text>
                      {isEditing ? (
                        <View>
                          <TextInput
                            className="bg-background py-2 px-3 rounded-lg text-textPrimary text-sm"
                            value={currentResolution}
                            onChangeText={(value) => updateResolution(topic.id, value)}
                            placeholder={t('review.resolutionPlaceholder')}
                            placeholderTextColor="#71717a"
                            multiline
                            autoFocus
                          />
                          <Pressable
                            className="mt-2 py-1.5 px-3 bg-success/20 rounded items-center self-start"
                            onPress={() => setEditingResolutionId(null)}
                          >
                            <Text className="text-success text-sm">{t('common.confirm')}</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          className="flex-row items-center"
                          onPress={() => setEditingResolutionId(topic.id)}
                        >
                          <Text className="text-success text-sm flex-1">
                            {currentResolution || t('review.addResolution')}
                          </Text>
                          <Edit3 size={14} color="#10B981" />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      )}

      {editableHotTopics.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">{t('review.news')}</Text>

          {editableHotTopics.map((topic, index) => {
            const isEditing = editingHotTopicIndex === index;

            if (isEditing) {
              return (
                <View key={index} className="bg-surface p-4 rounded-lg mb-2">
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textPrimary font-medium mb-2"
                    value={topic.title}
                    onChangeText={(value) => updateHotTopic(index, 'title', value)}
                    placeholder={t('review.titlePlaceholder')}
                    placeholderTextColor="#71717a"
                  />
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
                    value={topic.context || ''}
                    onChangeText={(value) => updateHotTopic(index, 'context', value)}
                    placeholder={t('review.contextPlaceholder')}
                    placeholderTextColor="#71717a"
                    multiline
                  />
                  <Pressable
                    className="py-2 px-4 bg-primary/20 rounded items-center self-start"
                    onPress={() => setEditingHotTopicIndex(null)}
                  >
                    <Text className="text-primary font-medium">{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View
                key={index}
                className="bg-surface rounded-lg mb-2 flex-row items-start p-4"
              >
                <Pressable onPress={() => toggleHotTopic(index)}>
                  <View
                    className={`w-5 h-5 rounded mr-3 items-center justify-center mt-0.5 ${
                      selectedHotTopics.includes(index) ? 'bg-primary' : 'bg-surfaceHover'
                    }`}
                  >
                    {selectedHotTopics.includes(index) && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                </Pressable>

                <View
                  className="w-2.5 h-2.5 rounded-full mt-1.5 mr-3 bg-orange-500"
                />

                <Pressable className="flex-1" onPress={() => setEditingHotTopicIndex(index)}>
                  <View className="flex-row items-center">
                    <Text className="text-textPrimary font-medium flex-1">{topic.title}</Text>
                    <Edit3 size={14} color="#9CA3AF" />
                  </View>
                  {topic.context && (
                    <Text className="text-textSecondary text-sm mt-1">{topic.context}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {editableMemories.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">{t('review.memories')}</Text>

          {editableMemories.map((memory, index) => {
            const isEditing = editingMemoryIndex === index;

            if (isEditing) {
              return (
                <View key={index} className="bg-surface p-4 rounded-lg mb-2">
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-2"
                    value={memory.description}
                    onChangeText={(value) => updateMemory(index, 'description', value)}
                    placeholder={t('review.descriptionPlaceholder')}
                    placeholderTextColor="#71717a"
                    multiline
                  />
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
                    value={memory.eventDate || ''}
                    onChangeText={(value) => updateMemory(index, 'eventDate', value)}
                    placeholder={t('review.datePlaceholder')}
                    placeholderTextColor="#71717a"
                  />
                  <Pressable
                    className="py-2 px-4 bg-primary/20 rounded items-center self-start"
                    onPress={() => setEditingMemoryIndex(null)}
                  >
                    <Text className="text-primary font-medium">{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View
                key={index}
                className="bg-surface rounded-lg mb-2 flex-row items-start p-4"
              >
                <Pressable onPress={() => toggleMemory(index)}>
                  <View
                    className={`w-5 h-5 rounded mr-3 items-center justify-center mt-0.5 ${
                      selectedMemories.includes(index) ? 'bg-primary' : 'bg-surfaceHover'
                    }`}
                  >
                    {selectedMemories.includes(index) && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                </Pressable>

                <View
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 mr-3 ${
                    memory.isShared ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                />

                <Pressable className="flex-1" onPress={() => setEditingMemoryIndex(index)}>
                  <View className="flex-row items-center">
                    <Text className="text-textPrimary font-medium flex-1">{memory.description}</Text>
                    <Edit3 size={14} color="#9CA3AF" />
                  </View>
                  <View className="flex-row items-center mt-1">
                    {memory.eventDate && (
                      <Text className="text-textSecondary text-sm mr-2">{memory.eventDate}</Text>
                    )}
                    <Text className="text-textMuted text-xs">
                      {memory.isShared ? t('review.together') : t('review.solo')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        className={`py-4 rounded-lg items-center ${isSaving ? 'bg-primary/50' : 'bg-primary'}`}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text className="text-white font-semibold text-lg">
          {isSaving ? t('review.saving') : t('review.save')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
