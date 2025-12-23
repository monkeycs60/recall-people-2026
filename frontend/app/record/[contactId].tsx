import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';
import { useContactsStore } from '@/stores/contacts-store';
import { useAppStore } from '@/stores/app-store';
import { transcribeAudio, extractInfo } from '@/lib/api';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { RecordButton } from '@/components/RecordButton';

export default function RecordForContactScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contactId = params.contactId as string;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { contacts, loadContacts, isInitialized } = useContactsStore();
  const { setCurrentExtraction } = useAppStore();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contact, setContact] = useState<{ firstName: string; lastName?: string; nickname?: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!isInitialized) {
        await loadContacts();
      }
    };
    init();
  }, [isInitialized, loadContacts]);

  useEffect(() => {
    const foundContact = contacts.find((c) => c.id === contactId);
    if (foundContact) {
      setContact({
        firstName: foundContact.firstName,
        lastName: foundContact.lastName,
        nickname: foundContact.nickname,
      });
    }
  }, [contacts, contactId]);

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permission micro refusée');
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();

      setIsRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('[RecordForContact] Start error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error('No audio URI');

      // Reload contacts
      await loadContacts();

      // Transcribe audio
      const transcriptionResult = await transcribeAudio(uri);

      // Find the contact
      const targetContact = contacts.find((c) => c.id === contactId);
      if (!targetContact) {
        throw new Error('Contact not found');
      }

      const contactsForExtraction = contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        tags: c.tags,
      }));

      // Load facts and hot topics for the contact
      const [facts, hotTopics] = await Promise.all([
        factService.getByContact(contactId),
        hotTopicService.getByContact(contactId),
      ]);

      const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

      const { extraction } = await extractInfo({
        transcription: transcriptionResult.transcript,
        existingContacts: contactsForExtraction,
        currentContact: {
          id: targetContact.id,
          firstName: targetContact.firstName,
          lastName: targetContact.lastName,
          facts: facts.map((fact) => ({
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
          })),
          hotTopics: activeHotTopics.map((topic) => ({
            id: topic.id,
            title: topic.title,
            context: topic.context,
          })),
        },
      });

      // Override the contact ID
      extraction.contactIdentified.id = targetContact.id;
      extraction.contactIdentified.needsDisambiguation = false;

      setCurrentExtraction(extraction);

      router.replace({
        pathname: '/review',
        params: {
          contactId: targetContact.id,
          audioUri: uri,
          transcription: transcriptionResult.transcript,
          extraction: JSON.stringify(extraction),
        },
      });
    } catch (error) {
      console.error('[RecordForContact] Stop error:', error);
      if (audioRecorder.isRecording) {
        try {
          await audioRecorder.stop();
        } catch {}
      }
      setIsProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  if (isProcessing) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text className="text-textSecondary mt-4">Analyse en cours...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-14 pb-4">
        <Pressable
          className="p-2 -ml-2"
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-textPrimary mb-2 text-center">
          {contact ? `${contact.firstName} ${contact.lastName || contact.nickname || ''}`.trim() : 'Chargement...'}
        </Text>

        <Text className="text-textSecondary mb-12 text-center">
          {isRecording
            ? 'Appuie pour arrêter'
            : 'Appuie pour enregistrer'}
        </Text>

        <RecordButton
          onPress={toggleRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />
      </View>
    </View>
  );
}
