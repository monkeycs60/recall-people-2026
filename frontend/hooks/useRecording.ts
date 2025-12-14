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
import { transcribeAudio } from '@/lib/api';

export const useRecording = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const router = useRouter();
  const { loadContacts, isInitialized } = useContactsStore();
  const {
    recordingState,
    setRecordingState,
    setCurrentAudioUri,
    setCurrentTranscription,
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('[useRecording] Start error:', error);
      setRecordingState('idle');
      throw error;
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return null;

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

      // Navigate to contact selection screen
      router.push({
        pathname: '/select-contact',
        params: {
          audioUri: uri,
          transcription: transcriptionResult.transcript,
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
    toggleRecording,
    cancelRecording,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
  };
};
