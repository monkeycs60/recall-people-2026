import { useState, useRef, useCallback } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { useContactsStore } from '@/stores/contacts-store';
import { transcribeAudio, extractInfo, detectContact } from '@/lib/api';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';

export const useRecording = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const router = useRouter();
  const { contacts, loadContacts, isInitialized } = useContactsStore();
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    recordingState,
    setRecordingState,
    setCurrentAudioUri,
    setCurrentTranscription,
    setCurrentExtraction,
    preselectedContactId,
    setPreselectedContactId,
  } = useAppStore();

  const toggleRecording = async () => {
    if (recordingState === 'recording') {
      await stopRecording();
    } else if (recordingState === 'idle') {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Load contacts if not initialized
      if (!isInitialized) {
        await loadContacts();
      }

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

      setRecordingState('recording');
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('[useRecording] Start error:', error);
      setRecordingState('idle');
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      throw error;
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return null;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      setRecordingState('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error('No audio URI');

      setCurrentAudioUri(uri);

      // Reload contacts to ensure we have the latest data
      await loadContacts();

      // Transcribe audio
      const transcriptionResult = await transcribeAudio(uri);
      setCurrentTranscription(transcriptionResult.transcript);

      // If a contact is preselected, skip selection and go directly to review
      if (preselectedContactId) {
        const preselectedContact = contacts.find((contact) => contact.id === preselectedContactId);

        if (preselectedContact) {
          const contactsForExtraction = contacts.map((contact) => ({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            tags: contact.tags,
          }));

          // Load facts and hot topics for the preselected contact
          const [facts, hotTopics] = await Promise.all([
            factService.getByContact(preselectedContactId),
            hotTopicService.getByContact(preselectedContactId),
          ]);

          const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

          const { extraction } = await extractInfo({
            transcription: transcriptionResult.transcript,
            existingSummary: preselectedContact.aiSummary || null,
            existingContacts: contactsForExtraction,
            currentContact: {
              id: preselectedContact.id,
              firstName: preselectedContact.firstName,
              lastName: preselectedContact.lastName,
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

          // Override the contact ID with preselected contact
          extraction.contactIdentified.id = preselectedContact.id;
          extraction.contactIdentified.needsDisambiguation = false;

          setCurrentExtraction(extraction);
          setPreselectedContactId(null);

          router.replace({
            pathname: '/review',
            params: {
              contactId: preselectedContact.id,
              audioUri: uri,
              transcription: transcriptionResult.transcript,
              extraction: JSON.stringify(extraction),
            },
          });

          return { uri, transcription: transcriptionResult.transcript };
        }

        // If preselected contact not found, clear and continue to normal flow
        setPreselectedContactId(null);
      }

      // Detect contact using LLM
      const contactsForDetection = contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        nickname: contact.nickname,
        aiSummary: contact.aiSummary,
        hotTopics: [] as Array<{ title: string; context?: string }>,
      }));

      const { detection } = await detectContact({
        transcription: transcriptionResult.transcript,
        contacts: contactsForDetection,
      });

      // Navigate to contact selection screen with detection result
      router.push({
        pathname: '/select-contact',
        params: {
          audioUri: uri,
          transcription: transcriptionResult.transcript,
          detection: JSON.stringify(detection),
        },
      });

      return { uri, transcription: transcriptionResult.transcript };
    } catch (error) {
      console.error('[useRecording] Stop error:', error);
      if (audioRecorder.isRecording) {
        try {
          await audioRecorder.stop();
        } catch {}
      }
      setRecordingState('idle');
      setPreselectedContactId(null);
      throw error;
    }
  };

  const cancelRecording = async () => {
    if (audioRecorder.isRecording) {
      await audioRecorder.stop();
    }
    setRecordingState('idle');
  };

  return {
    recordingState,
    recordingDuration,
    toggleRecording,
    cancelRecording,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
  };
};
