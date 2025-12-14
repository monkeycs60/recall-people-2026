import { View, Text, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExtractionResult } from '@/types';
import { useContacts } from '@/hooks/useContacts';
import { useNotes } from '@/hooks/useNotes';
import { factService } from '@/services/fact.service';
import { useAppStore } from '@/stores/app-store';

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
        audioUri,
        transcription,
        summary: extraction.note.summary,
      });

      for (const index of selectedFacts) {
        const fact = extraction.facts[index];
        await factService.create({
          contactId: finalContactId,
          factType: fact.factType,
          factKey: fact.factKey,
          factValue: fact.factValue,
          sourceNoteId: note.id,
        });
      }

      await updateContact(finalContactId, {
        lastContactAt: new Date().toISOString(),
      });

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
