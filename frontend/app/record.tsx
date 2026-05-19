import { View, Text, Pressable, Modal, BackHandler, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Mic, Type, UserRound, MessageCircle, CalendarDays } from 'lucide-react-native';
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

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isRecordingRef.current) {
          void cancelRecordingRef.current();
          resetRecordingRef.current();
          router.back();
          return true;
        }

        if (isProcessingRef.current) {
          return true;
        }

        cancelRecordingRef.current();
        resetRecordingRef.current();
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove();
        if (!isProcessingRef.current) {
          cancelRecordingRef.current();
          resetRecordingRef.current();
        }
      };
    }, [router])
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = async () => {
    if (isProcessing) return;

    await cancelRecording();
    resetRecording();
    router.back();
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
            style={[styles.closeButton, isProcessing && styles.closeButtonDisabled]}
            disabled={isProcessing}
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
                <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={styles.recordGuide}
                >
                  <Text style={styles.guideTitle}>
                    {preselectedContact
                      ? t('record.guideTitleWithContact', { firstName: preselectedContact.firstName })
                      : t('record.guideTitle')}
                  </Text>
                  <View style={styles.guideSteps}>
                    <View style={styles.guideCue}>
                      <View style={styles.guideCueIcon}>
                        <UserRound size={14} color={Colors.primary} strokeWidth={2.4} />
                      </View>
                      <Text style={styles.guideStepText}>
                        {preselectedContact
                          ? t('record.guideStepContactConversation', { firstName: preselectedContact.firstName })
                          : t('record.guideStepName')}
                      </Text>
                    </View>
                    <View style={styles.guideCue}>
                      <View style={styles.guideCueIcon}>
                        <MessageCircle size={14} color={Colors.primary} strokeWidth={2.4} />
                      </View>
                      <Text style={styles.guideStepText}>
                        {preselectedContact
                          ? t('record.guideStepContactRemember', { firstName: preselectedContact.firstName })
                          : t('record.guideStepContext')}
                      </Text>
                    </View>
                    <View style={styles.guideCue}>
                      <View style={styles.guideCueIcon}>
                        <CalendarDays size={14} color={Colors.primary} strokeWidth={2.4} />
                      </View>
                      <Text style={styles.guideStepText}>
                        {preselectedContact
                          ? t('record.guideStepContactFollowUp', { firstName: preselectedContact.firstName })
                          : t('record.guideStepFuture')}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              )}

              <RecordButton
                onPress={toggleRecording}
                isRecording={isRecording}
                isProcessing={isProcessing}
              />

              {!isRecording && (
                <Text style={styles.startHint}>
                  {t('record.tapToStart')}
                </Text>
              )}

              {!isRecording && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.exampleCallout}>
                  <Text style={styles.exampleLabel}>{t('record.exampleLabel')}</Text>
                  <Text style={styles.exampleText}>
                    {preselectedContact
                      ? t('record.guideExampleWithContact', { firstName: preselectedContact.firstName })
                      : t('record.guideExample')}
                  </Text>
                </Animated.View>
              )}

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
  closeButtonDisabled: {
    opacity: 0.5,
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
    letterSpacing: 0,
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
    width: '100%',
    paddingTop: 12,
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
  recordGuide: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    marginBottom: 30,
  },
  guideTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: 0,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  guideSteps: {
    width: '100%',
    marginTop: 18,
    gap: 9,
  },
  guideCue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  guideCueIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepText: {
    flex: 1,
    fontFamily: Fonts.sans.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  startHint: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    fontSize: 13,
    fontFamily: Fonts.sans.medium,
  },
  tapHint: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 32,
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    minHeight: 24,
  },
  exampleCallout: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
    marginTop: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  exampleLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 6,
  },
  exampleText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
});
