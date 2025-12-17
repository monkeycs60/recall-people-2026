import { View, Text, ScrollView, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExtractionResult, HotTopic } from '@/types';
import { useContacts } from '@/hooks/useContacts';
import { useNotes } from '@/hooks/useNotes';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { contactService } from '@/services/contact.service';
import { generateSummary } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { Archive } from 'lucide-react-native';

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

  const [selectedFacts, setSelectedFacts] = useState<number[]>(
    extraction.facts.map((_, index) => index)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [existingHotTopics, setExistingHotTopics] = useState<HotTopic[]>([]);
  const [selectedResolvedIds, setSelectedResolvedIds] = useState<string[]>(
    extraction.resolvedTopicIds || []
  );

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

  // Get resolved topics with their full data
  const resolvedTopics = existingHotTopics.filter((topic) =>
    extraction.resolvedTopicIds?.includes(topic.id)
  );

  const toggleResolvedTopic = (topicId: string) => {
    setSelectedResolvedIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const toggleFact = (index: number) => {
    setSelectedFacts((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
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
        const fact = extraction.facts[index];
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

      // Save new hot topics
      if (extraction.hotTopics && extraction.hotTopics.length > 0) {
        for (const topic of extraction.hotTopics) {
          await hotTopicService.create({
            contactId: finalContactId,
            title: topic.title,
            context: topic.context,
            sourceNoteId: note.id,
          });
        }
      }

      // Resolve selected hot topics
      if (selectedResolvedIds.length > 0) {
        for (const topicId of selectedResolvedIds) {
          await hotTopicService.resolve(topicId);
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

      {extraction.facts.length > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            Informations extraites
          </Text>

          {extraction.facts.map((fact, index) => (
            <Pressable
              key={index}
              className="bg-surface p-4 rounded-lg mb-3 flex-row items-start"
              onPress={() => toggleFact(index)}
            >
              <View
                className={`w-5 h-5 rounded mr-3 items-center justify-center mt-0.5 ${
                  selectedFacts.includes(index) ? 'bg-primary' : 'bg-surfaceHover'
                }`}
              >
                {selectedFacts.includes(index) && (
                  <Text className="text-white text-xs">✓</Text>
                )}
              </View>

              <View className="flex-1">
                <Text className="text-textSecondary text-sm">{fact.factKey}</Text>
                <Text className="text-textPrimary font-medium">{fact.factValue}</Text>
                {fact.action === 'update' && fact.previousValue && (
                  <Text className="text-warning text-xs mt-1">
                    Ancien: {fact.previousValue}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Resolved Hot Topics Section */}
      {resolvedTopics.length > 0 && (
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

          {resolvedTopics.map((topic) => (
            <Pressable
              key={topic.id}
              className="bg-success/10 border border-success/30 p-4 rounded-lg mb-3 flex-row items-start"
              onPress={() => toggleResolvedTopic(topic.id)}
            >
              <View
                className={`w-5 h-5 rounded mr-3 items-center justify-center mt-0.5 ${
                  selectedResolvedIds.includes(topic.id) ? 'bg-success' : 'bg-surfaceHover'
                }`}
              >
                {selectedResolvedIds.includes(topic.id) && (
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
          ))}
        </View>
      )}

      <View className="mb-6">
        <Text className="text-lg font-semibold text-textPrimary mb-3">Résumé</Text>
        <View className="bg-surface p-4 rounded-lg">
          <Text className="text-textPrimary">{extraction.note.summary}</Text>
        </View>
      </View>

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
