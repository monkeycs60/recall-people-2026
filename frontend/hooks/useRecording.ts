import { useRef } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { transcribeAudio, extractInfo } from '@/lib/api';
import { useContacts } from './useContacts';

export const useRecording = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const router = useRouter();
  const { contacts, loadContacts } = useContacts();
  const {
    recordingState,
    setRecordingState,
    setCurrentAudioUri,
    setCurrentTranscription,
    setCurrentExtraction,
  } = useAppStore();

  const startRecording = async () => {
    try {
      console.log('[useRecording] 1. Starting recording process...');

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      console.log('[useRecording] 2. Permission result:', permission);
      if (!permission.granted) {
        throw new Error('Permission micro refusée');
      }

      console.log('[useRecording] 3. Setting audio mode...');
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      console.log('[useRecording] 4. Audio mode set successfully');

      console.log('[useRecording] 5. Preparing to record...');
      await audioRecorder.prepareToRecordAsync();
      console.log('[useRecording] 6. Preparation complete');

      console.log('[useRecording] 7. Starting record...');
      await audioRecorder.record();
      console.log('[useRecording] 8. Recording started successfully');

      setRecordingState('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('[useRecording] 9. State set to recording');
    } catch (error) {
      console.error('[useRecording] ERROR at start:', error);
      setRecordingState('idle');
      throw error;
    }
  };

  const stopRecording = async () => {
    console.log('[useRecording] 10. Stop recording called');
    console.log('[useRecording] 11. isRecording:', audioRecorder.isRecording);

    if (!audioRecorder.isRecording) {
      console.log('[useRecording] 12. Not recording, returning null');
      return null;
    }

    try {
      console.log('[useRecording] 13. Setting state to processing');
      setRecordingState('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log('[useRecording] 14. Calling audioRecorder.stop()...');
      await audioRecorder.stop();
      console.log('[useRecording] 15. Stop completed');

      const uri = audioRecorder.uri;
      console.log('[useRecording] 16. Got URI:', uri);

      if (!uri) throw new Error('No audio URI');

      console.log('[useRecording] 17. Setting current audio URI');
      setCurrentAudioUri(uri);

      console.log('[useRecording] 18. Loading contacts...');
      await loadContacts();
      console.log('[useRecording] 19. Contacts loaded, count:', contacts.length);

      console.log('[useRecording] 20. Starting transcription...');
      const transcriptionResult = await transcribeAudio(uri);
      console.log('[useRecording] 21. Transcription result:', transcriptionResult);
      setCurrentTranscription(transcriptionResult.transcript);

      console.log('[useRecording] 22. Preparing contacts for extraction');
      const contactsForExtraction = contacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tags: contact.tags,
      }));
      console.log('[useRecording] 23. Contacts for extraction:', contactsForExtraction.length);

      console.log('[useRecording] 24. Starting extraction...');
      const { extraction } = await extractInfo({
        transcription: transcriptionResult.transcript,
        existingContacts: contactsForExtraction,
      });
      console.log('[useRecording] 25. Extraction result:', extraction);

      setCurrentExtraction(extraction);
      setRecordingState('reviewing');
      console.log('[useRecording] 26. State set to reviewing');

      console.log('[useRecording] 27. Navigating based on extraction result');
      if (extraction.contactIdentified.needsDisambiguation) {
        console.log('[useRecording] 28. Needs disambiguation');
        const possibleContacts = contacts.filter((contact) =>
          extraction.contactIdentified.suggestedMatches?.includes(contact.id)
        );
        console.log('[useRecording] 29. Possible contacts:', possibleContacts.length);

        router.push({
          pathname: '/disambiguation',
          params: {
            audioUri: uri,
            transcription: transcriptionResult.transcript,
            extraction: JSON.stringify(extraction),
            possibleContacts: JSON.stringify(possibleContacts),
          },
        });
      } else {
        console.log('[useRecording] 30. Going to review screen');
        router.push({
          pathname: '/review',
          params: {
            contactId: extraction.contactIdentified.id || 'new',
            audioUri: uri,
            transcription: transcriptionResult.transcript,
            extraction: JSON.stringify(extraction),
          },
        });
      }

      console.log('[useRecording] 31. Process complete, returning result');
      return {
        uri,
        transcription: transcriptionResult.transcript,
        extraction,
      };
    } catch (error) {
      console.error('[useRecording] ERROR during processing:', error);
      console.log('[useRecording] 32. Cleaning up after error');

      if (audioRecorder.isRecording) {
        try {
          console.log('[useRecording] 33. Stopping recorder after error');
          await audioRecorder.stop();
        } catch (e) {
          console.warn('[useRecording] 34. Failed to cleanup:', e);
        }
      }
      setRecordingState('idle');
      console.log('[useRecording] 35. State reset to idle');
      throw error;
    }
  };

  const cancelRecording = async () => {
    console.log('[useRecording] 36. Cancel recording called');
    if (audioRecorder.isRecording) {
      console.log('[useRecording] 37. Stopping recording');
      await audioRecorder.stop();
    }
    setRecordingState('idle');
    console.log('[useRecording] 38. Recording cancelled, state reset');
  };

  return {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
  };
};
