import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExtractionResult, HotTopic, ResolvedTopic } from '@/types';
import { useContacts } from '@/hooks/useContacts';
import { useNotes } from '@/hooks/useNotes';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { contactService } from '@/services/contact.service';
import { generateSummary } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { Archive, Edit3 } from 'lucide-react-native';

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { createContact, updateContact } = useContacts();
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

  const [isSaving, setIsSaving] = useState(false);
  const [existingHotTopics, setExistingHotTopics] = useState<HotTopic[]>([]);

  // Store resolved topics with editable resolutions
  const [resolvedTopicsState, setResolvedTopicsState] = useState<ResolvedTopic[]>(
    extraction.resolvedTopics || []
  );
  const [editingResolutionId, setEditingResolutionId] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let finalContactId = contactId;

      if (contactId === 'new') {
        const newContact = await createContact({
          firstName: extraction.contactIdentified.firstName,
          lastName: extraction.contactIdentified.lastName,
          nickname: extraction.contactIdentified.suggestedNickname,
        });
        finalContactId = newContact.id;
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

      await updateContact(finalContactId, {
        lastContactAt: new Date().toISOString(),
      });

      // Generate AI summary in background (non-blocking)
      const contactDetails = await contactService.getById(finalContactId);
      if (contactDetails) {
        generateSummary({
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
        })
          .then(async (summary) => {
            await contactService.update(finalContactId, { aiSummary: summary });
          })
          .catch((error) => {
            console.warn('Summary generation failed:', error);
          });
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
        {contactId === 'new' ? 'Nouveau contact' : 'Mise à jour'}
      </Text>

      {editableFacts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            Informations extraites
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
                    placeholder="Valeur"
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
                      Ancien: {fact.previousValue}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Resolved Hot Topics Section */}
      {(resolvedTopicsWithData.length > 0 || extraction.resolvedTopics?.length > 0) && (
        <View className="mb-6">
          <View className="flex-row items-center mb-3">
            <Archive size={20} color="#10B981" />
            <Text className="text-lg font-semibold text-textPrimary ml-2">
              Sujets à archiver
            </Text>
          </View>
          <Text className="text-textMuted text-sm mb-3">
            Ces sujets semblent résolus. Décochez ceux qui sont encore actifs.
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
                      <Text className="text-success text-xs font-medium mb-1">Résolution :</Text>
                      {isEditing ? (
                        <View>
                          <TextInput
                            className="bg-background py-2 px-3 rounded-lg text-textPrimary text-sm"
                            value={currentResolution}
                            onChangeText={(value) => updateResolution(topic.id, value)}
                            placeholder="Comment ça s'est terminé..."
                            placeholderTextColor="#71717a"
                            multiline
                            autoFocus
                          />
                          <Pressable
                            className="mt-2 py-1.5 px-3 bg-success/20 rounded items-center self-start"
                            onPress={() => setEditingResolutionId(null)}
                          >
                            <Text className="text-success text-sm">OK</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          className="flex-row items-center"
                          onPress={() => setEditingResolutionId(topic.id)}
                        >
                          <Text className="text-success text-sm flex-1">
                            {currentResolution || 'Ajouter une résolution...'}
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
          <Text className="text-lg font-semibold text-textPrimary mb-3">Actualité</Text>

          {editableHotTopics.map((topic, index) => {
            const isEditing = editingHotTopicIndex === index;

            if (isEditing) {
              return (
                <View key={index} className="bg-surface p-4 rounded-lg mb-2">
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textPrimary font-medium mb-2"
                    value={topic.title}
                    onChangeText={(value) => updateHotTopic(index, 'title', value)}
                    placeholder="Titre"
                    placeholderTextColor="#71717a"
                  />
                  <TextInput
                    className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
                    value={topic.context || ''}
                    onChangeText={(value) => updateHotTopic(index, 'context', value)}
                    placeholder="Contexte (optionnel)"
                    placeholderTextColor="#71717a"
                    multiline
                  />
                  <Pressable
                    className="py-2 px-4 bg-primary/20 rounded items-center self-start"
                    onPress={() => setEditingHotTopicIndex(null)}
                  >
                    <Text className="text-primary font-medium">OK</Text>
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

      <Pressable
        className={`py-4 rounded-lg items-center ${isSaving ? 'bg-primary/50' : 'bg-primary'}`}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text className="text-white font-semibold text-lg">
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
