import { View, Text, Pressable, ActivityIndicator, Modal, BackHandler } from 'react-native';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useAppStore } from '@/stores/app-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { transcribeAudio, extractInfo } from '@/lib/api';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { RecordButton } from '@/components/RecordButton';
import { Paywall } from '@/components/Paywall';
import { TranscriptionLoader } from '@/components/TranscriptionLoader';
import { Colors } from '@/constants/theme';
import { ProcessingStep } from '@/types';

export default function RecordForContactScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const contactId = params.contactId as string;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { contacts } = useContactsQuery();
  const { setCurrentExtraction, resetRecording } = useAppStore();

  const canCreateNote = useSubscriptionStore((state) => state.canCreateNote);
  const incrementNotesCount = useSubscriptionStore((state) => state.incrementNotesCount);
  const getMaxRecordingDuration = useSubscriptionStore((state) => state.getMaxRecordingDuration);
  const maxDuration = getMaxRecordingDuration();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'notes_limit' | 'recording_duration'>('notes_limit');

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const isRecordingRef = useRef(false);

  const contact = useMemo(() => {
    const foundContact = contacts.find((currentContact) => currentContact.id === contactId);
    if (foundContact) {
      return {
        firstName: foundContact.firstName,
        lastName: foundContact.lastName,
        nickname: foundContact.nickname,
      };
    }
    return null;
  }, [contacts, contactId]);

  const cancelAndCleanup = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (isRecordingRef.current && audioRecorder.isRecording) {
      try {
        await audioRecorder.stop();
      } catch (stopError) {
        console.error('[RecordForContact] Error stopping recorder:', stopError);
      }
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    resetRecording();
  }, [audioRecorder, resetRecording]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isRecording || isProcessing) {
          return true;
        }
        cancelAndCleanup();
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
        if (!isProcessing) {
          cancelAndCleanup();
        }
      };
    }, [isRecording, isProcessing, cancelAndCleanup])
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!canCreateNote()) {
      setPaywallReason('notes_limit');
      setShowPaywall(true);
      return;
    }

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

      isRecordingRef.current = true;
      setIsRecording(true);
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
      console.error('[RecordForContact] Start error:', error);
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsProcessing(true);
      setProcessingStep('transcribing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (!uri) throw new Error('No audio URI');

      // Transcribe audio
      const transcriptionResult = await transcribeAudio(uri);

      // Find the contact
      const targetContact = contacts.find((c) => c.id === contactId);
      if (!targetContact) {
        throw new Error('Contact not found');
      }

      setProcessingStep('extracting');

      const contactsForExtraction = contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
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

      incrementNotesCount();
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

  stopRecordingRef.current = stopRecording;

  const handleBack = () => {
    if (isRecording || isProcessing) {
      return;
    }
    cancelAndCleanup();
    router.back();
  };

  if (isProcessing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TranscriptionLoader step={processingStep} hasPreselectedContact />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <Pressable
          style={{ padding: 8, marginLeft: -8 }}
          onPress={handleBack}
          disabled={isRecording || isProcessing}
        >
          <ArrowLeft size={24} color={isRecording ? Colors.textMuted : Colors.textPrimary} />
        </Pressable>
      </View>

      {/* Content */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 28,
            color: Colors.textPrimary,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {contact ? `${contact.firstName} ${contact.lastName || contact.nickname || ''}`.trim() : 'Chargement...'}
        </Text>

        {isRecording ? (
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'PlayfairDisplay_500Medium',
                fontSize: 48,
                color: Colors.primary,
                textAlign: 'center',
              }}
            >
              {formatDuration(recordingDuration)}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: Colors.textMuted,
                textAlign: 'center',
                marginBottom: 48,
              }}
            >
              {formatDuration(maxDuration - recordingDuration)} {t('record.remaining', { defaultValue: 'restant' })}
            </Text>
          </View>
        ) : (
          <Text
            style={{
              color: Colors.textSecondary,
              marginBottom: 48,
              textAlign: 'center',
            }}
          >
            {t('record.tapToRecord', { defaultValue: 'Appuie pour enregistrer' })}
          </Text>
        )}

        <RecordButton
          onPress={toggleRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />

        {isRecording && (
          <Text
            style={{
              color: Colors.textMuted,
              textAlign: 'center',
              marginTop: 32,
              fontSize: 14,
            }}
          >
            {t('record.tapToStop', { defaultValue: 'Appuyez pour terminer' })}
          </Text>
        )}
      </View>

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} reason={paywallReason} />
      </Modal>
    </View>
  );
}
