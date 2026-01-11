import { useState, useRef } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { useContactsStore } from '@/stores/contacts-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { transcribeAudio, extractInfo, detectContact } from '@/lib/api';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { showErrorToast, ApiError } from '@/lib/error-handler';
import i18n from '@/lib/i18n';

const isE2ETest = process.env.EXPO_PUBLIC_E2E_TEST === 'true';
const e2eFixtureName = process.env.EXPO_PUBLIC_E2E_FIXTURE || 'brenda';

// Map fixture names to their require paths
const E2E_FIXTURES: Record<string, number> = {
  brenda: require('@/assets/fixtures/brenda.mp3'),
  'brenda-suite': require('@/assets/fixtures/brenda-suite.mp3'),
  bucheron: require('@/assets/fixtures/bucheron.mp3'),
  'bucheron-suite': require('@/assets/fixtures/bucheron-suite.mp3'),
  juliana: require('@/assets/fixtures/juliana.mp3'),
};

const getE2EFixtureUri = async (): Promise<string> => {
  const fixtureModule = E2E_FIXTURES[e2eFixtureName] || E2E_FIXTURES.brenda;
  const asset = Asset.fromModule(fixtureModule);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error(`[E2E] Failed to load fixture: ${e2eFixtureName}`);
  }

  console.log('[E2E] Using fixture audio:', e2eFixtureName, asset.localUri);
  return asset.localUri;
};

export const useRecording = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const router = useRouter();
  const { contacts, loadContacts, isInitialized } = useContactsStore();
  const getMaxRecordingDuration = useSubscriptionStore((state) => state.getMaxRecordingDuration);
  const canCreateNote = useSubscriptionStore((state) => state.canCreateNote);
  const incrementNotesCount = useSubscriptionStore((state) => state.incrementNotesCount);
  const maxDuration = getMaxRecordingDuration();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'notes_limit' | 'recording_duration'>('notes_limit');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRecordingRef = useRef<(() => Promise<{ uri: string; transcription: string } | null | undefined>) | null>(null);
  const {
    recordingState,
    processingStep,
    setRecordingState,
    setProcessingStep,
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
    } else if (recordingState === 'processing') {
      // Already processing, ignore tap
      return;
    }
  };

  const startRecording = async () => {
    if (!canCreateNote()) {
      setPaywallReason('notes_limit');
      setShowPaywall(true);
      return;
    }

    try {
      // Load contacts if not initialized
      if (!isInitialized) {
        await loadContacts();
      }

      // E2E mode: skip actual recording setup, just simulate
      if (isE2ETest) {
        console.log('[E2E] Simulating recording start');
        setRecordingState('recording');
        setRecordingDuration(0);
        durationIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => {
            const newDuration = prev + 1;
            if (newDuration >= maxDuration && stopRecordingRef.current) {
              stopRecordingRef.current();
            }
            return newDuration;
          });
        }, 1000);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }

      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showErrorToast(
          i18n.t('recording.errors.permissionDenied'),
          i18n.t('recording.errors.permissionDeniedDescription')
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      // Check if recorder is already recording (from a previous session that wasn't cleaned up)
      try {
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
        }
      } catch {
        // Ignore - recorder may have been released
      }

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();

      setRecordingState('recording');
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration && stopRecordingRef.current) {
            stopRecordingRef.current();
          }
          return newDuration;
        });
      }, 1000);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('[useRecording] Start error:', error);
      setRecordingState('idle');
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      showErrorToast(
        i18n.t('recording.errors.recordingFailed'),
        i18n.t('recording.errors.recordingFailedDescription')
      );
    }
  };

  const stopRecording = async () => {
    // In E2E mode, we don't require actual recording
    if (!isE2ETest) {
      try {
        if (!audioRecorder.isRecording) return null;
      } catch {
        // audioRecorder may have been released - reset state and return
        console.log('[useRecording] Recorder was released, resetting state');
        setRecordingState('idle');
        setRecordingDuration(0);
        return null;
      }
    }

    const currentDuration = recordingDuration;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Check minimum duration (at least 1 second)
    if (!isE2ETest && currentDuration < 1) {
      try {
        await audioRecorder.stop();
      } catch {
        // Ignore stop errors
      }
      setRecordingDuration(0);
      setRecordingState('idle');
      showErrorToast(
        i18n.t('recording.errors.tooShort', { defaultValue: 'Recording too short' }),
        i18n.t('recording.errors.tooShortDescription', { defaultValue: 'Please record for at least 1 second.' })
      );
      return null;
    }

    try {
      setRecordingState('processing');
      setProcessingStep('transcribing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      let uri: string;

      if (isE2ETest) {
        // Use fixture instead of real recording
        uri = await getE2EFixtureUri();
      } else {
        await audioRecorder.stop();
        uri = audioRecorder.uri!;
      }

      if (!uri) throw new Error('No audio URI');

      setCurrentAudioUri(uri);

      // Reload contacts to ensure we have the latest data
      await loadContacts();

      // Get fresh contacts from store after reload (avoid stale closure)
      const freshContacts = useContactsStore.getState().contacts;

      // Transcribe audio
      const transcriptionResult = await transcribeAudio(uri);
      setCurrentTranscription(transcriptionResult.transcript);

      // If a contact is preselected, skip selection and go directly to review
      if (preselectedContactId) {
        const preselectedContact = freshContacts.find((contact) => contact.id === preselectedContactId);

        if (preselectedContact) {
          const contactsForExtraction = freshContacts.map((contact) => ({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
          }));

          // Load facts and hot topics for the preselected contact
          setProcessingStep('extracting');
          const [facts, hotTopics] = await Promise.all([
            factService.getByContact(preselectedContactId),
            hotTopicService.getByContact(preselectedContactId),
          ]);

          const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

          const { extraction } = await extractInfo({
            transcription: transcriptionResult.transcript,
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

          incrementNotesCount();

          return { uri, transcription: transcriptionResult.transcript };
        }

        // If preselected contact not found, clear and continue to normal flow
        setPreselectedContactId(null);
      }

      // Detect contact using LLM
      setProcessingStep('detecting');
      const contactsForDetection = freshContacts.map((contact) => ({
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

      incrementNotesCount();

      return { uri, transcription: transcriptionResult.transcript };
    } catch (error) {
      // Log detailed error info for debugging
      const errorDetails = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        status: (error as ApiError).status,
        backendMessage: (error as ApiError).backendMessage,
      };
      console.error('[useRecording] Stop error:', errorDetails);

      try {
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
        }
      } catch {
        // Ignore errors from released recorder
      }
      setRecordingState('idle');
      setProcessingStep(null);
      setPreselectedContactId(null);

      // Show error toast with backend message if available
      const backendMessage = (error as ApiError).backendMessage;
      showErrorToast(
        i18n.t('recording.errors.processingFailed', { defaultValue: 'Processing failed' }),
        backendMessage || i18n.t('recording.errors.processingFailedDescription', { defaultValue: 'Please check your connection and try again.' })
      );
    }
  };

  const cancelRecording = async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (!isE2ETest) {
      try {
        // Check isRecording inside try-catch because audioRecorder may have been released
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
        }
      } catch (stopError) {
        // Ignore errors from released audio recorder
        console.log('[useRecording] Cancel cleanup (recorder may be released):', stopError);
      }
    }
    setRecordingDuration(0);
    setRecordingState('idle');
    setProcessingStep(null);
  };

  stopRecordingRef.current = stopRecording;

  const processText = async (text: string) => {
    if (!canCreateNote()) {
      setPaywallReason('notes_limit');
      setShowPaywall(true);
      return;
    }

    if (text.trim().length < 10) {
      showErrorToast(
        i18n.t('recording.errors.textTooShort', { defaultValue: 'Text too short' }),
        i18n.t('recording.errors.textTooShortDescription', { defaultValue: 'Please write at least 10 characters.' })
      );
      return;
    }

    try {
      // Load contacts if not initialized
      if (!isInitialized) {
        await loadContacts();
      }

      setRecordingState('processing');
      setCurrentTranscription(text);
      setCurrentAudioUri(null);

      // Reload contacts to ensure we have the latest data
      await loadContacts();
      const freshContacts = useContactsStore.getState().contacts;

      // If a contact is preselected, skip selection and go directly to review
      if (preselectedContactId) {
        const preselectedContact = freshContacts.find((contact) => contact.id === preselectedContactId);

        if (preselectedContact) {
          const contactsForExtraction = freshContacts.map((contact) => ({
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
          }));

          setProcessingStep('extracting');
          const [facts, hotTopics] = await Promise.all([
            factService.getByContact(preselectedContactId),
            hotTopicService.getByContact(preselectedContactId),
          ]);

          const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

          const { extraction } = await extractInfo({
            transcription: text,
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

          extraction.contactIdentified.id = preselectedContact.id;
          extraction.contactIdentified.needsDisambiguation = false;

          setCurrentExtraction(extraction);
          setPreselectedContactId(null);

          router.replace({
            pathname: '/review',
            params: {
              contactId: preselectedContact.id,
              audioUri: '',
              transcription: text,
              extraction: JSON.stringify(extraction),
            },
          });

          incrementNotesCount();
          return;
        }

        setPreselectedContactId(null);
      }

      // Detect contact using LLM
      setProcessingStep('detecting');
      const contactsForDetection = freshContacts.map((contact) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        nickname: contact.nickname,
        aiSummary: contact.aiSummary,
        hotTopics: [] as Array<{ title: string; context?: string }>,
      }));

      const { detection } = await detectContact({
        transcription: text,
        contacts: contactsForDetection,
      });

      router.push({
        pathname: '/select-contact',
        params: {
          audioUri: '',
          transcription: text,
          detection: JSON.stringify(detection),
        },
      });

      incrementNotesCount();
    } catch (error) {
      const errorDetails = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        status: (error as ApiError).status,
        backendMessage: (error as ApiError).backendMessage,
      };
      console.error('[useRecording] Text processing error:', errorDetails);

      setRecordingState('idle');
      setProcessingStep(null);
      setPreselectedContactId(null);

      const backendMessage = (error as ApiError).backendMessage;
      showErrorToast(
        i18n.t('recording.errors.processingFailed', { defaultValue: 'Processing failed' }),
        backendMessage || i18n.t('recording.errors.processingFailedDescription', { defaultValue: 'Please check your connection and try again.' })
      );
    }
  };

  return {
    recordingState,
    processingStep,
    recordingDuration,
    maxRecordingDuration: maxDuration,
    toggleRecording,
    cancelRecording,
    processText,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
    showPaywall,
    paywallReason,
    closePaywall: () => setShowPaywall(false),
  };
};
