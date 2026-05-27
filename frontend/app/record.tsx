import { View, Text, Pressable, Modal, BackHandler, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from 'react-native';
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
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

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

  const isAudioModeActive = inputMode === 'audio';
  const isTextModeActive = inputMode === 'text';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[Colors.primaryLight, Colors.background]}
        locations={[0, 0.55]}
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={styles.topBar}>
          <View style={styles.modeTogglePill}>
            <Pressable
              style={[styles.modePillItem, isAudioModeActive && styles.modePillItemActive]}
              onPress={() => !isRecording && !isProcessing && setInputMode('audio')}
            >
              <Mic size={12} color={isAudioModeActive ? Colors.textInverse : Colors.textMuted} strokeWidth={2.4} />
              <Text style={[styles.modePillLabel, isAudioModeActive && styles.modePillLabelActive]}>
                {t('record.modeVoice')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.modePillItem, isTextModeActive && styles.modePillItemActive]}
              onPress={() => !isRecording && !isProcessing && setInputMode('text')}
            >
              <Type size={12} color={isTextModeActive ? Colors.textInverse : Colors.textMuted} strokeWidth={2.4} />
              <Text style={[styles.modePillLabel, isTextModeActive && styles.modePillLabelActive]}>
                {t('record.modeType')}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={handleClose}
            style={[styles.closeButton, isProcessing && styles.closeButtonDisabled]}
            disabled={isProcessing}
          >
            <X size={14} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {isProcessing ? (
          <View style={styles.centerContent}>
            <Animated.View entering={FadeIn}>
              <TranscriptionLoader step={processingStep} hasPreselectedContact={!!preselectedContactId} />
            </Animated.View>
          </View>
        ) : isTextModeActive ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.textModeWrapper}>
            <TextInputMode
              onSubmit={handleTextSubmit}
              isProcessing={isProcessing}
              contactFirstName={preselectedContact?.firstName}
            />
          </Animated.View>
        ) : (
          <ScrollView
            style={styles.audioScroll}
            contentContainerStyle={styles.audioContent}
            showsVerticalScrollIndicator={false}
          >
            {isRecording ? (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.timerContainer}>
                <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
                <Text style={styles.remainingText}>
                  {formatDuration(maxRecordingDuration - recordingDuration)} {t('record.remaining', { defaultValue: 'remaining' })}
                </Text>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(280)} style={styles.heroBlock}>
                <Text style={styles.heroEyebrow}>
                  {preselectedContact ? t('record.eyebrowWithContact') : t('record.eyebrowHello')}
                </Text>
                <Text style={styles.heroTitle}>
                  {preselectedContact
                    ? t('record.titleWithContact', { firstName: preselectedContact.firstName })
                    : t('record.titleGotSomeoneInMind')}
                </Text>
                <View style={styles.heroBodyRow}>
                  <Text style={styles.heroBodyText}>
                    {preselectedContact
                      ? t('record.bodyWithContactPrefix', { firstName: preselectedContact.firstName })
                      : t('record.bodyPrefix')}
                  </Text>
                  <View style={styles.heroBodyHighlight}>
                    <Text style={styles.heroBodyHighlightText}>
                      {t('record.bodyHighlightComingUp')}
                    </Text>
                  </View>
                  <Text style={styles.heroBodyText}>{t('record.bodySuffix')}</Text>
                </View>
              </Animated.View>
            )}

            {!isRecording && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.exampleCard}>
                <Text style={styles.exampleLabel}>{t('record.exampleLikeThis')}</Text>
                <Text style={styles.exampleText}>
                  <Text style={styles.exampleQuoteText}>
                    {preselectedContact
                      ? t('record.exampleQuoteWithContact', { firstName: preselectedContact.firstName })
                      : t('record.exampleQuote')}
                  </Text>
                </Text>
              </Animated.View>
            )}

            <View style={styles.recordZone}>
              <RecordButton
                onPress={toggleRecording}
                isRecording={isRecording}
                isProcessing={isProcessing}
              />
              <Text style={styles.recordHint}>
                {isRecording ? t('record.pressToFinish') : t('record.tapToRecord2min')}
              </Text>
            </View>
          </ScrollView>
        )}

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
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modeTogglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  modePillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modePillItemActive: {
    backgroundColor: Colors.primary,
  },
  modePillLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 12,
    color: Colors.textMuted,
  },
  modePillLabelActive: {
    color: Colors.textInverse,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonDisabled: { opacity: 0.5 },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  textModeWrapper: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  audioScroll: { flex: 1 },
  audioContent: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 40,
    flexGrow: 1,
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
  heroBlock: {
    marginBottom: 24,
  },
  heroEyebrow: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: Colors.primary,
  },
  heroTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.9,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  heroBodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 14,
    gap: 4,
  },
  heroBodyText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 17,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  heroBodyHighlight: {
    backgroundColor: Colors.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  heroBodyHighlightText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 17,
    lineHeight: 24,
    color: '#7A4F00',
  },
  exampleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#1D1A2E',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  exampleLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginBottom: 8,
  },
  exampleText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  exampleQuoteText: {
    fontStyle: 'italic',
  },
  recordZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 32,
    paddingBottom: 16,
    gap: 18,
  },
  recordHint: {
    fontFamily: Fonts.sans.bold,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
