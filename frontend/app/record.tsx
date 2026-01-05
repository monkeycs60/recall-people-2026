import { View, Text, Pressable, Modal, BackHandler } from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { RecordButton } from '@/components/RecordButton';
import { Paywall } from '@/components/Paywall';
import { TranscriptionLoader } from '@/components/TranscriptionLoader';
import { useRecording } from '@/hooks/useRecording';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useAppStore } from '@/stores/app-store';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const HELPER_PROMPTS = [
  'Citez le nom de la personne...',
  'Parlez de votre rencontre...',
  'Mentionnez des details personnels...',
  'Partagez ce que vous avez appris...',
];

const getContactPrompts = (firstName: string) => [
  `Quoi de neuf avec ${firstName} ?`,
  `Partagez vos dernières nouvelles...`,
  `Comment va ${firstName} ?`,
  `Qu'avez-vous appris sur ${firstName} ?`,
];

export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const {
    toggleRecording,
    cancelRecording,
    isRecording,
    isProcessing,
    recordingDuration,
    maxRecordingDuration,
    showPaywall,
    paywallReason,
    closePaywall,
  } = useRecording();
  const { contacts } = useContactsQuery();
  const preselectedContactId = useAppStore((state) => state.preselectedContactId);
  const resetRecording = useAppStore((state) => state.resetRecording);
  const [promptIndex, setPromptIndex] = useState(0);
  const promptIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const preselectedContact = useMemo(() => {
    if (!preselectedContactId) return null;
    return contacts.find((contact) => contact.id === preselectedContactId) || null;
  }, [preselectedContactId, contacts]);

  const currentPrompts = useMemo(() => {
    if (preselectedContact) {
      return getContactPrompts(preselectedContact.firstName);
    }
    return HELPER_PROMPTS;
  }, [preselectedContact]);

  const startPromptRotation = useCallback(() => {
    if (promptIntervalRef.current) {
      clearInterval(promptIntervalRef.current);
    }
    promptIntervalRef.current = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % currentPrompts.length);
    }, 4000);
  }, [currentPrompts.length]);

  const stopPromptRotation = useCallback(() => {
    if (promptIntervalRef.current) {
      clearInterval(promptIntervalRef.current);
      promptIntervalRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isRecording && !isProcessing) {
        startPromptRotation();
      }

      const onBackPress = () => {
        if (isRecording || isProcessing) {
          return true;
        }
        cancelRecording();
        resetRecording();
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        stopPromptRotation();
        subscription.remove();
        if (!isProcessing) {
          cancelRecording();
          resetRecording();
        }
      };
    }, [isRecording, isProcessing, startPromptRotation, stopPromptRotation, cancelRecording, resetRecording])
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    if (!isRecording && !isProcessing) {
      cancelRecording();
      resetRecording();
      router.back();
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
        <Pressable
          onPress={handleClose}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            backgroundColor: Colors.surfaceHover,
          }}
          disabled={isRecording || isProcessing}
        >
          <X size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 32,
            color: Colors.textPrimary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {preselectedContact ? preselectedContact.firstName : 'Recall People'}
        </Text>

        {isRecording ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignItems: 'center' }}>
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
                marginBottom: 64,
              }}
            >
              {formatDuration(maxRecordingDuration - recordingDuration)} {t('record.remaining', { defaultValue: 'restant' })}
            </Text>
          </Animated.View>
        ) : isProcessing ? (
          <Animated.View entering={FadeIn} style={{ marginBottom: 64 }}>
            <TranscriptionLoader />
          </Animated.View>
        ) : (
          <Animated.Text
            key={promptIndex}
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
            style={{
              color: Colors.textMuted,
              textAlign: 'center',
              marginBottom: 64,
              fontSize: 16,
              fontStyle: 'italic',
              minHeight: 24,
            }}
          >
            {currentPrompts[promptIndex]}
          </Animated.Text>
        )}

        <RecordButton
          onPress={toggleRecording}
          isRecording={isRecording}
          isProcessing={isProcessing}
        />

        {isRecording && (
          <Animated.Text
            entering={FadeIn.delay(300)}
            style={{
              color: Colors.textMuted,
              textAlign: 'center',
              marginTop: 32,
              fontSize: 14,
            }}
          >
            Appuyez pour terminer
          </Animated.Text>
        )}
      </View>

      <View style={{ paddingHorizontal: 32, paddingBottom: 32 }}>
        <Text style={{ color: Colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 20 }}>
          {preselectedContact
            ? `Parlez de ${preselectedContact.firstName} : actualités, anecdotes, détails importants...`
            : t('home.helperText', {
                defaultValue: 'Conseil : mentionnez le nom, le contexte de rencontre, et les details importants sur la personne.',
              })}
        </Text>
      </View>

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={closePaywall} reason={paywallReason} />
      </Modal>
    </View>
  );
}
