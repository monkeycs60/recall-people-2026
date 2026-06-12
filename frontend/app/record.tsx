import { View, Text, Pressable, Modal, BackHandler, KeyboardAvoidingView, Platform, StyleSheet, ScrollView } from 'react-native';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  ChevronLeft,
  Heart,
  MessageCircle,
  Mic,
  Sparkles,
  Type,
  UserRound,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts } from '@/constants/theme';
import { RecordButton } from '@/components/RecordButton';
import { Paywall } from '@/components/Paywall';
import { TestProActivation } from '@/components/TestProActivation';
import { TranscriptionLoader } from '@/components/TranscriptionLoader';
import type { InputMode } from '@/components/InputModeToggle';
import { TextInputMode } from '@/components/TextInputMode';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { useRecording } from '@/hooks/useRecording';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useAppStore } from '@/stores/app-store';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { getRecordingLimitMinutes } from '@/utils/recordingPromptCopy';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type PromiseCard = {
  id: string;
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  iconBackground: string;
  iconColor: string;
};

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

  const preselectedContactName = useMemo(() => {
    return preselectedContact ? getContactDisplayName(preselectedContact) : '';
  }, [preselectedContact]);

  const promiseCards = useMemo<PromiseCard[]>(() => {
    if (preselectedContact) {
      return [
        {
          id: 'moment',
          Icon: MessageCircle,
          title: t('record.promise.contact.momentTitle'),
          subtitle: t('record.promise.contact.momentSubtitle'),
          iconBackground: Colors.primaryLight,
          iconColor: Colors.textPrimary,
        },
        {
          id: 'detail',
          Icon: Sparkles,
          title: t('record.promise.contact.detailTitle'),
          subtitle: t('record.promise.contact.detailSubtitle'),
          iconBackground: Colors.accentLight,
          iconColor: Colors.accent,
        },
        {
          id: 'coming-up',
          Icon: CalendarDays,
          title: t('record.promise.contact.comingUpTitle'),
          subtitle: t('record.promise.contact.comingUpSubtitle'),
          iconBackground: Colors.amberLight,
          iconColor: Colors.amber,
        },
      ];
    }

    return [
      {
        id: 'profile',
        Icon: UserRound,
        title: t('record.promise.general.profileTitle'),
        subtitle: t('record.promise.general.profileSubtitle'),
        iconBackground: '#FFD7C2',
        iconColor: '#A4471D',
      },
      {
        id: 'details',
        Icon: Heart,
        title: t('record.promise.general.detailsTitle'),
        subtitle: t('record.promise.general.detailsSubtitle'),
        iconBackground: Colors.accentLight,
        iconColor: Colors.error,
      },
      {
        id: 'coming-up',
        Icon: CalendarDays,
        title: t('record.promise.general.comingUpTitle'),
        subtitle: t('record.promise.general.comingUpSubtitle'),
        iconBackground: Colors.amberLight,
        iconColor: Colors.amber,
      },
    ];
  }, [preselectedContact, t]);

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
  const showContactPromise = !!preselectedContact;
  const recordingLimitMinutes = getRecordingLimitMinutes(maxRecordingDuration);

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
        <View style={[styles.topBar, showContactPromise && styles.topBarContact]}>
          {showContactPromise && (
            <Pressable
              onPress={handleClose}
              style={[styles.backButton, isProcessing && styles.closeButtonDisabled]}
              disabled={isProcessing}
            >
              <ChevronLeft size={18} color={Colors.textPrimary} strokeWidth={2.4} />
            </Pressable>
          )}

          <View style={[styles.modeTogglePill, showContactPromise && styles.modeTogglePillCentered]}>
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
            style={[
              styles.closeButton,
              showContactPromise && styles.closeButtonContact,
              isProcessing && styles.closeButtonDisabled,
            ]}
            disabled={isProcessing}
          >
            <X size={14} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {isProcessing ? (
          <View style={styles.centerContent}>
            <Animated.View entering={FadeIn}>
              <TranscriptionLoader step={processingStep} isTextMode={isTextModeActive} />
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
            contentContainerStyle={[
              styles.audioContent,
              showContactPromise && styles.audioContentContact,
            ]}
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
              <Animated.View entering={FadeIn.duration(280)} style={styles.promiseIntro}>
                {preselectedContact ? (
                  <>
                    <View style={styles.addingToChip}>
                      <ContactAvatar
                        firstName={preselectedContact.firstName}
                        lastName={preselectedContact.lastName}
                        avatarUrl={preselectedContact.avatarUrl}
                        size="tiny"
                      />
                      <View style={styles.addingToTextBlock}>
                        <Text style={styles.addingToLabel}>{t('record.contactChipLabel')}</Text>
                        <Text style={styles.addingToName} numberOfLines={1}>
                          {preselectedContactName}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.promiseTitle}>
                      {t('record.contactTitleMain')}
                      {'\n'}
                      <Text style={styles.promiseTitleMuted}>
                        {t('record.contactTitleMuted', { firstName: preselectedContact.firstName })}
                      </Text>
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.promiseTitle}>
                      {t('record.generalTitleMain')}
                      {'\n'}
                      <Text style={styles.promiseTitleMuted}>{t('record.generalTitleMuted')}</Text>
                    </Text>
                  </>
                )}
              </Animated.View>
            )}

            {!isRecording && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.promiseList}>
                {promiseCards.map((card, index) => {
                  const Icon = card.Icon;
                  return (
                    <View key={card.id}>
                      {index > 0 && <View style={styles.promiseListSeparator} />}
                      <View style={styles.promiseListRow}>
                        <View
                          style={[
                            styles.promiseListIcon,
                            { backgroundColor: card.iconBackground },
                          ]}
                        >
                          <Icon size={16} color={card.iconColor} strokeWidth={2.3} />
                        </View>
                        <View style={styles.promiseListText}>
                          <Text style={styles.promiseListTitle}>{card.title}</Text>
                          <Text style={styles.promiseListSubtitle}>{card.subtitle}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Animated.View>
            )}

            <View style={styles.recordZone}>
              <RecordButton
                onPress={toggleRecording}
                isRecording={isRecording}
                isProcessing={isProcessing}
              />
              {isRecording ? (
                <Text style={styles.recordHint}>{t('record.pressToFinish')}</Text>
              ) : (
                <Pressable onPress={toggleRecording} style={styles.recordCta}>
                  <Text style={styles.recordCtaText}>
                    {t('record.tapToRecordMinutes', { minutes: recordingLimitMinutes })}
                  </Text>
                </Pressable>
              )}
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
    minHeight: 58,
  },
  topBarContact: {
    justifyContent: 'center',
    position: 'relative',
  },
  modeTogglePill: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  modeTogglePillCentered: {
    alignSelf: 'center',
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
    lineHeight: 16,
    letterSpacing: 0,
    color: Colors.textMuted,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  modePillLabelActive: {
    color: Colors.textInverse,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonContact: {
    position: 'absolute',
    right: 20,
    top: 14,
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
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  audioContentContact: {
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
    letterSpacing: 0,
    lineHeight: 72,
  },
  remainingText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.mono,
    marginTop: 4,
  },
  promiseIntro: {
    marginBottom: 20,
  },
  promiseTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 29,
    lineHeight: 33,
    letterSpacing: 0,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  promiseTitleMuted: {
    color: Colors.textMuted,
  },
  addingToChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  addingToTextBlock: {
    maxWidth: 160,
    paddingRight: 6,
  },
  addingToLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  addingToName: {
    fontFamily: Fonts.sans.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    color: Colors.textPrimary,
  },
  promiseList: {
    paddingHorizontal: 4,
  },
  promiseListSeparator: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginLeft: 46,
  },
  promiseListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 13,
  },
  promiseListIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  promiseListText: {
    flex: 1,
    minWidth: 0,
  },
  promiseListTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15.5,
    lineHeight: 20,
    letterSpacing: 0,
    color: Colors.textPrimary,
  },
  promiseListSubtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 12.5,
    lineHeight: 17,
    letterSpacing: 0,
    color: Colors.textMuted,
    marginTop: 2,
  },
  recordZone: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  recordHint: {
    fontFamily: Fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  recordCta: {
    marginTop: 18,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  recordCtaText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
});
