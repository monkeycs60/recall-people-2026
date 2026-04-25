import { View, Text, Pressable, Modal, BackHandler, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, Type } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/theme';
import { RecordButton } from '@/components/RecordButton';
import { Paywall } from '@/components/Paywall';
import { TestProActivation } from '@/components/TestProActivation';
import { TranscriptionLoader } from '@/components/TranscriptionLoader';
import type { InputMode } from '@/components/InputModeToggle';
import { TextInputMode } from '@/components/TextInputMode';
import { useRecording } from '@/hooks/useRecording';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useAppStore } from '@/stores/app-store';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

const getHelperPrompts = (translationFn: (key: string) => string) => [
  translationFn('record.helperPrompts.citeName'),
  translationFn('record.helperPrompts.talkAbout'),
  translationFn('record.helperPrompts.mentionDetails'),
  translationFn('record.helperPrompts.shareKnowledge'),
];

const getContactPrompts = (translationFn: (key: string, options?: Record<string, string>) => string, firstName: string) => [
  translationFn('record.contactPrompts.whatsNew', { firstName }),
  translationFn('record.contactPrompts.shareNews'),
  translationFn('record.contactPrompts.howIs', { firstName }),
  translationFn('record.contactPrompts.whatLearned', { firstName }),
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

  isRecordingRef.current = isRecording;
  isProcessingRef.current = isProcessing;
  cancelRecordingRef.current = cancelRecording;
  resetRecordingRef.current = resetRecording;

  const preselectedContact = useMemo(() => {
    if (!preselectedContactId) return null;
    return contacts.find((contact) => contact.id === preselectedContactId) || null;
  }, [preselectedContactId, contacts]);

  const currentPrompts = useMemo(() => {
    if (preselectedContact) {
      return getContactPrompts(t, preselectedContact.firstName);
    }
    return getHelperPrompts(t);
  }, [preselectedContact, t]);

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
      <LinearGradient
        colors={[Colors.primaryLight, Colors.background]}
        locations={[0, 0.6]}
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.modeToggleRow}>
            <Pressable
              style={[styles.modeButton, inputMode === 'audio' && styles.modeButtonActive]}
              onPress={() => !isRecording && !isProcessing && setInputMode('audio')}
            >
              <Mic size={16} color={inputMode === 'audio' ? Colors.textInverse : Colors.textMuted} strokeWidth={2} />
            </Pressable>
            <Pressable
              style={[styles.modeButton, inputMode === 'text' && styles.modeButtonActive]}
              onPress={() => !isRecording && !isProcessing && setInputMode('text')}
            >
              <Type size={16} color={inputMode === 'text' ? Colors.textInverse : Colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
          <Pressable
            onPress={handleClose}
            style={styles.closeButton}
            disabled={isRecording || isProcessing}
          >
            <X size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Eyebrow + Title */}
        <View style={styles.titleSection}>
          {isRecording && (
            <Animated.Text entering={FadeIn} style={styles.eyebrow}>
              {t('record.listening', { defaultValue: 'LISTENING...' })}
            </Animated.Text>
          )}
          <Text style={styles.screenTitle}>
            {preselectedContact
              ? preselectedContact.firstName
              : isRecording
                ? t('record.tellMe', { defaultValue: 'Tell me about them' })
                : 'Recall People'}
          </Text>
        </View>

        {/* Central content */}
        <View style={styles.centerContent}>
          {isProcessing ? (
            <Animated.View entering={FadeIn}>
              <TranscriptionLoader step={processingStep} hasPreselectedContact={!!preselectedContactId} />
            </Animated.View>
          ) : inputMode === 'audio' ? (
            <View style={styles.audioContent}>
              {isRecording ? (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.timerContainer}>
                  <Text style={styles.timerText}>
                    {formatDuration(recordingDuration)}
                  </Text>
                  <Text style={styles.remainingText}>
                    {formatDuration(maxRecordingDuration - recordingDuration)} {t('record.remaining', { defaultValue: 'remaining' })}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.Text
                  key={promptIndex}
                  entering={FadeIn.duration(500)}
                  exiting={FadeOut.duration(300)}
                  style={styles.promptText}
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
                  style={styles.tapHint}
                >
                  {t('record.pressToFinish')}
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

        {/* Tip footer */}
        <View style={styles.footer}>
          {!isProcessing && inputMode === 'audio' && (
            <Text style={styles.tipText}>
              {preselectedContact
                ? t('record.helperTextWithContact', { firstName: preselectedContact.firstName })
                : t('record.helperText')}
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
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 32,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  audioContent: {
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 72,
    color: Colors.primary,
    letterSpacing: -3,
    lineHeight: 72,
  },
  remainingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.mono,
    marginTop: 4,
  },
  promptText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 16,
    fontStyle: 'italic',
    minHeight: 24,
  },
  tapHint: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    minHeight: 60,
  },
  tipText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 11.5,
    lineHeight: 17,
  },
});
