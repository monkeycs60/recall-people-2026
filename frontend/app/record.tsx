import { View, Text, Pressable, Modal, BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { RecordButton } from '@/components/RecordButton';
import { Paywall } from '@/components/Paywall';
import { TestProActivation } from '@/components/TestProActivation';
import { TranscriptionLoader } from '@/components/TranscriptionLoader';
import { InputModeToggle, InputMode } from '@/components/InputModeToggle';
import { TextInputMode } from '@/components/TextInputMode';
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
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const initialMode = (params.initialMode as InputMode) || 'audio';
  const {
    toggleRecording,
    cancelRecording,
    processText,
    isRecording,
    isProcessing,
    processingStep,
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
  const [inputMode, setInputMode] = useState<InputMode>(initialMode);
  const [showTestProFirst, setShowTestProFirst] = useState(true);
  const isRecordingRef = useRef(isRecording);
  const isProcessingRef = useRef(isProcessing);
  const cancelRecordingRef = useRef(cancelRecording);
  const resetRecordingRef = useRef(resetRecording);

  // Keep refs in sync with values
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isProcessingRef.current = isProcessing;
    cancelRecordingRef.current = cancelRecording;
    resetRecordingRef.current = resetRecording;
  }, [isRecording, isProcessing, cancelRecording, resetRecording]);

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

  useFocusEffect(
    useCallback(() => {
      const promptInterval = setInterval(() => {
        setPromptIndex((prev) => (prev + 1) % 4);
      }, 4000);

      const onBackPress = () => {
        if (isRecordingRef.current || isProcessingRef.current) {
          return true;
        }
        cancelRecordingRef.current();
        resetRecordingRef.current();
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        clearInterval(promptInterval);
        subscription.remove();
        if (!isProcessingRef.current) {
          cancelRecordingRef.current();
          resetRecordingRef.current();
        }
      };
    }, [])
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

  const handleTextSubmit = (text: string) => {
    processText(text);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header fixe */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ width: 40 }} />

          <InputModeToggle
            mode={inputMode}
            onModeChange={setInputMode}
            disabled={isRecording || isProcessing}
          />

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

        {/* Titre fixe */}
        <View style={{ paddingTop: 32, paddingHorizontal: 32, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'PlayfairDisplay_700Bold',
              fontSize: 32,
              color: Colors.textPrimary,
              textAlign: 'center',
            }}
          >
            {preselectedContact ? preselectedContact.firstName : 'Recall People'}
          </Text>
        </View>

        {/* Zone de contenu centrale */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          {isProcessing ? (
            <Animated.View entering={FadeIn}>
              <TranscriptionLoader step={processingStep} hasPreselectedContact={!!preselectedContactId} />
            </Animated.View>
          ) : inputMode === 'audio' ? (
            <View style={{ alignItems: 'center' }}>
              {isRecording ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={{ alignItems: 'center', marginBottom: 32 }}>
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
                    }}
                  >
                    {formatDuration(maxRecordingDuration - recordingDuration)} {t('record.remaining', { defaultValue: 'restant' })}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.Text
                  key={promptIndex}
                  entering={FadeIn.duration(500)}
                  exiting={FadeOut.duration(300)}
                  style={{
                    color: Colors.textMuted,
                    textAlign: 'center',
                    marginBottom: 32,
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
          ) : (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={{ width: '100%' }}
            >
              <TextInputMode
                onSubmit={handleTextSubmit}
                isProcessing={isProcessing}
                contactFirstName={preselectedContact?.firstName}
              />
            </Animated.View>
          )}
        </View>

        {/* Footer avec conseil */}
        <View style={{ paddingHorizontal: 32, paddingBottom: 32, minHeight: 60 }}>
          {!isProcessing && inputMode === 'audio' && (
            <Text style={{ color: Colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 20 }}>
              {preselectedContact
                ? `Parlez de ${preselectedContact.firstName} : actualités, anecdotes, détails importants...`
                : t('home.helperText', {
                    defaultValue: 'Conseil : mentionnez le nom, le contexte de rencontre, et les details importants sur la personne.',
                  })}
            </Text>
          )}
        </View>

        <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
          {showTestProFirst ? (
            <TestProActivation
              onClose={() => {
                setShowTestProFirst(true);
                closePaywall();
              }}
              onNotWhitelisted={() => setShowTestProFirst(false)}
            />
          ) : (
            <Paywall
              onClose={() => {
                setShowTestProFirst(true);
                closePaywall();
              }}
              reason={paywallReason}
            />
          )}
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
