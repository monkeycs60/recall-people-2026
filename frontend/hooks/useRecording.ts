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
import { hotTopicService } from '@/services/hot-topic.service';
import { showErrorToast, ApiError } from '@/lib/error-handler';
import { getRecordingHotTopics, getRespondingToTopic } from '@/utils/recordingContext';
import { analytics, AnalyticsEvent } from '@/lib/analytics';
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

type FailedProcessing = {
  audioUri: string | null;
  transcription: string;
  preselectedContactId: string | null;
  preselectedHotTopicId: string | null;
};

export const useRecording = () => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const router = useRouter();
  const { contacts, loadContacts, isInitialized } = useContactsStore();
  const getMaxRecordingDuration = useSubscriptionStore((state) => state.getMaxRecordingDuration);
  const maxDuration = getMaxRecordingDuration();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'recording_duration'>('recording_duration');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [failedProcessing, setFailedProcessing] = useState<FailedProcessing | null>(null);
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
    preselectedHotTopicId,
    setPreselectedContactId,
    setPreselectedHotTopicId,
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

      analytics.capture(AnalyticsEvent.VOICE_RECORDING_STARTED, {
        preselected_contact: Boolean(preselectedContactId),
      });

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

  const processTranscription = async (
    audioUri: string | null,
    transcript: string
  ): Promise<void> => {
    const inputMethod = audioUri ? 'voice' : 'text';
    const navigationAudioUri = audioUri ?? '';

    await loadContacts();
    const freshContacts = useContactsStore.getState().contacts;

    const currentPreselectedContactId = useAppStore.getState().preselectedContactId;
    const currentPreselectedHotTopicId = useAppStore.getState().preselectedHotTopicId;

    if (currentPreselectedContactId) {
      const preselectedContact = freshContacts.find(
        (contact) => contact.id === currentPreselectedContactId
      );

      if (preselectedContact) {
        const contactsForExtraction = freshContacts.map((contact) => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
        }));

        setProcessingStep('extracting');
        const hotTopics = await hotTopicService.getByContact(currentPreselectedContactId);

        const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');
        const recordingHotTopics = getRecordingHotTopics(activeHotTopics, currentPreselectedHotTopicId);
        const respondingToTopic = getRespondingToTopic(activeHotTopics, currentPreselectedHotTopicId);

        const { extraction } = await extractInfo({
          transcription: transcript,
          existingContacts: contactsForExtraction,
          currentContact: {
            id: preselectedContact.id,
            firstName: preselectedContact.firstName,
            lastName: preselectedContact.lastName,
            facts: [],
            hotTopics: recordingHotTopics.map((topic) => ({
              id: topic.id,
              title: topic.title,
              context: topic.context,
            })),
          },
          respondingToTopic,
        });

        extraction.contactIdentified.id = preselectedContact.id;
        extraction.contactIdentified.needsDisambiguation = false;

        setCurrentExtraction(extraction);
        setPreselectedContactId(null);
        setPreselectedHotTopicId(null);

        router.replace({
          pathname: '/review',
          params: {
            contactId: preselectedContact.id,
            audioUri: navigationAudioUri,
            transcription: transcript,
            extraction: JSON.stringify(extraction),
          },
        });

        analytics.capture(AnalyticsEvent.CAPTURE_PROCESSED, {
          input_method: inputMethod,
          preselected_contact: true,
        });
        return;
      }

      setPreselectedContactId(null);
      setPreselectedHotTopicId(null);
    }

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
      transcription: transcript,
      contacts: contactsForDetection,
    });

    router.push({
      pathname: '/select-contact',
      params: {
        audioUri: navigationAudioUri,
        transcription: transcript,
        detection: JSON.stringify(detection),
      },
    });

    analytics.capture(AnalyticsEvent.CAPTURE_PROCESSED, {
      input_method: inputMethod,
      preselected_contact: false,
    });
  };

  const handleProcessingFailure = (
    error: unknown,
    audioUri: string | null,
    transcript: string
  ) => {
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      status: (error as ApiError).status,
      backendMessage: (error as ApiError).backendMessage,
    };
    console.error('[useRecording] Processing error:', errorDetails);

    const didSaveNote = Boolean(transcript) || Boolean(audioUri);

    if (didSaveNote) {
      setFailedProcessing({
        audioUri,
        transcription: transcript,
        preselectedContactId: useAppStore.getState().preselectedContactId,
        preselectedHotTopicId: useAppStore.getState().preselectedHotTopicId,
      });
    }

    setRecordingState('idle');
    setProcessingStep(null);

    const backendMessage = (error as ApiError).backendMessage;
    const description = backendMessage
      ? backendMessage
      : didSaveNote
        ? i18n.t('recording.errors.noteSafeRetry')
        : i18n.t('recording.errors.processingFailedDescription', {
            defaultValue: 'Please check your connection and try again.',
          });

    showErrorToast(
      i18n.t('recording.errors.processingFailed', { defaultValue: 'Processing failed' }),
      description
    );
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

    let capturedAudioUri: string | null = null;
    let capturedTranscript = '';

    try {
      setCurrentTranscription(null);
      setCurrentAudioUri(null);
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

      capturedAudioUri = uri;
      setCurrentAudioUri(uri);

      const transcriptionResult = await transcribeAudio(uri);
      capturedTranscript = transcriptionResult.transcript;
      setCurrentTranscription(transcriptionResult.transcript);

      await processTranscription(uri, transcriptionResult.transcript);

      return { uri, transcription: transcriptionResult.transcript };
    } catch (error) {
      try {
        if (audioRecorder.isRecording) {
          await audioRecorder.stop();
        }
      } catch {
        // Ignore errors from released recorder
      }
      handleProcessingFailure(error, capturedAudioUri, capturedTranscript);
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
    if (text.trim().length < 10) {
      showErrorToast(
        i18n.t('recording.errors.textTooShort', { defaultValue: 'Text too short' }),
        i18n.t('recording.errors.textTooShortDescription', { defaultValue: 'Please write at least 10 characters.' })
      );
      return;
    }

    try {
      if (!isInitialized) {
        await loadContacts();
      }

      setRecordingState('processing');
      setProcessingStep(preselectedContactId ? 'extracting' : 'detecting');
      setCurrentTranscription(text);
      setCurrentAudioUri(null);

      await processTranscription(null, text);
    } catch (error) {
      handleProcessingFailure(error, null, text);
    }
  };

  const retryProcessing = async () => {
    const failed = failedProcessing;
    if (!failed) return;

    setFailedProcessing(null);
    setRecordingState('processing');

    setPreselectedContactId(failed.preselectedContactId);
    setPreselectedHotTopicId(failed.preselectedHotTopicId);

    let capturedTranscript = failed.transcription;

    try {
      if (!failed.transcription && failed.audioUri) {
        setProcessingStep('transcribing');
        const transcriptionResult = await transcribeAudio(failed.audioUri);
        capturedTranscript = transcriptionResult.transcript;
        setCurrentTranscription(transcriptionResult.transcript);
        await processTranscription(failed.audioUri, transcriptionResult.transcript);
      } else {
        await processTranscription(failed.audioUri, failed.transcription);
      }
    } catch (error) {
      handleProcessingFailure(error, failed.audioUri, capturedTranscript);
    }
  };

  const discardFailedProcessing = () => {
    setFailedProcessing(null);
    setCurrentTranscription(null);
    setCurrentAudioUri(null);
    setPreselectedContactId(null);
    setPreselectedHotTopicId(null);
  };

  return {
    recordingState,
    processingStep,
    recordingDuration,
    maxRecordingDuration: maxDuration,
    toggleRecording,
    cancelRecording,
    processText,
    failedProcessing,
    retryProcessing,
    discardFailedProcessing,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
    showPaywall,
    paywallReason,
    closePaywall: () => setShowPaywall(false),
  };
};
