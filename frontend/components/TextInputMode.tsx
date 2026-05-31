import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { ArrowUp, Calendar, Heart, MessageCircle, Sparkles, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, BorderRadius, Fonts } from '@/constants/theme';
import { getTextInputPlaceholderKeys } from '@/utils/recordingPromptCopy';

interface TextInputModeProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  contactFirstName?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const MIN_CHARACTERS = 10;

export function TextInputMode({
  onSubmit,
  isProcessing,
  contactFirstName,
}: TextInputModeProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const buttonScale = useSharedValue(1);
  const hasContactContext = Boolean(contactFirstName);
  const placeholderKeys = getTextInputPlaceholderKeys(hasContactContext ? 'contact' : 'general');

  const introLine = hasContactContext
    ? t(placeholderKeys.intro, { firstName: contactFirstName })
    : t(placeholderKeys.intro);

  const handleSubmit = () => {
    if (text.trim().length < MIN_CHARACTERS || isProcessing) return;
    Keyboard.dismiss();
    onSubmit(text.trim());
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(isFocused ? Colors.primary : Colors.primaryLight, { duration: 150 }),
    borderWidth: withTiming(isFocused ? 2 : 1.5, { duration: 150 }),
  }));

  const canSubmit = text.trim().length >= MIN_CHARACTERS && !isProcessing;
  const showPlaceholder = text.length === 0;
  const remainingChars = Math.max(0, MIN_CHARACTERS - text.trim().length);
  const hintLabel = remainingChars > 0
    ? t('textInput.minCharactersShort', { count: MIN_CHARACTERS })
    : t('textInput.pressToSend');

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <Text style={styles.eyebrowLabel}>{t('textInput.newNoteLabel')}</Text>

      <Animated.View style={[styles.inputContainer, containerAnimatedStyle]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder=""
          style={styles.textInput}
          multiline
          maxLength={2000}
          editable={!isProcessing}
          textAlignVertical="top"
          autoFocus
          spellCheck
          autoCorrect
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {showPlaceholder && (
          <View style={styles.placeholderOverlay} pointerEvents="none">
            <Text style={styles.placeholderIntro}>{introLine}</Text>

            <View style={styles.placeholderBullets}>
              <View style={styles.placeholderRow}>
                <View style={styles.placeholderIconTile}>
                  {hasContactContext ? (
                    <MessageCircle size={16} color={Colors.textMuted} strokeWidth={2.2} />
                  ) : (
                    <User size={16} color={Colors.textMuted} strokeWidth={2.2} />
                  )}
                </View>
                <Text style={styles.placeholderText}>
                  {t(placeholderKeys.primary)}
                </Text>
              </View>

              <View style={styles.placeholderRow}>
                <View style={styles.placeholderIconTile}>
                  {hasContactContext ? (
                    <Sparkles size={16} color={Colors.accent} strokeWidth={2.2} />
                  ) : (
                    <Heart size={16} color={Colors.error} fill={Colors.error} strokeWidth={2.2} />
                  )}
                </View>
                <Text style={styles.placeholderText}>
                  {t(placeholderKeys.secondary)}
                </Text>
              </View>

              <View style={styles.placeholderRow}>
                <View style={[styles.placeholderIconTile, styles.placeholderIconTileAmber]}>
                  <Calendar size={16} color={Colors.amber} strokeWidth={2.2} />
                </View>
                <Text style={styles.placeholderTextAccent}>
                  <Text style={styles.placeholderStar}>★ </Text>
                  {t(placeholderKeys.upcoming)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      <View style={styles.actionRow}>
        <Text style={styles.hintText}>{hintLabel}</Text>

        <AnimatedPressable
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!canSubmit}
          style={[
            styles.sendButton,
            canSubmit ? styles.sendButtonActive : styles.sendButtonDisabled,
            buttonAnimatedStyle,
          ]}
        >
          <Text
            style={[
              styles.sendButtonText,
              !canSubmit && styles.sendButtonTextDisabled,
            ]}
          >
            {t('textInput.sendLabel')}
          </Text>
          <ArrowUp
            size={16}
            color={canSubmit ? Colors.textInverse : Colors.textMuted}
            strokeWidth={2.6}
          />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  eyebrowLabel: {
    fontFamily: Fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.primary,
    marginBottom: 10,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 48,
    left: 18,
    right: 18,
  },
  placeholderIntro: {
    fontFamily: Fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  placeholderBullets: {
    gap: 10,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeholderIconTile: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIconTileAmber: {
    backgroundColor: Colors.amberLight,
    borderColor: 'transparent',
  },
  placeholderText: {
    flex: 1,
    fontFamily: Fonts.sans.regular,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.textMuted,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeholderTextAccent: {
    flex: 1,
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.calendarDark,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  placeholderStar: {
    color: Colors.calendarDark,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingBottom: 4,
  },
  hintText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
    flex: 1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  sendButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textInverse,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendButtonTextDisabled: {
    color: Colors.textMuted,
  },
});
