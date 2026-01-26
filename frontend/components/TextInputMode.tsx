import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing, Fonts } from '@/constants/theme';

interface TextInputModeProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  placeholder?: string;
  contactFirstName?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TextInputMode({
  onSubmit,
  isProcessing,
  placeholder,
  contactFirstName,
}: TextInputModeProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const buttonScale = useSharedValue(1);
  const focusProgress = useSharedValue(1);

  const defaultPlaceholder = contactFirstName
    ? t('textInput.placeholderWithContact', { firstName: contactFirstName })
    : t('textInput.placeholder');

  const handleSubmit = () => {
    if (text.trim().length < 10 || isProcessing) return;

    Keyboard.dismiss();
    onSubmit(text.trim());
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(isFocused ? Colors.primary : Colors.borderLight, { duration: 150 }),
    borderWidth: withTiming(isFocused ? 2 : 1.5, { duration: 150 }),
  }));

  const canSubmit = text.trim().length >= 10 && !isProcessing;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <Animated.View style={[styles.inputContainer, containerAnimatedStyle]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={placeholder || defaultPlaceholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.textInput}
          multiline
          maxLength={2000}
          editable={!isProcessing}
          textAlignVertical="top"
          autoFocus
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        <View style={styles.footer}>
          <Animated.Text style={styles.charCount}>
            {text.length} / 2000
          </Animated.Text>

          <AnimatedPressable
            onPress={handleSubmit}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!canSubmit}
            style={[
              styles.submitButton,
              canSubmit && styles.submitButtonActive,
              buttonAnimatedStyle,
            ]}
          >
            <Send
              size={20}
              color={canSubmit ? Colors.textInverse : Colors.textMuted}
            />
          </AnimatedPressable>
        </View>
      </Animated.View>

      <Animated.Text style={styles.hint}>
        {text.length < 10
          ? t('textInput.minCharacters', { count: 10 - text.length })
          : t('textInput.pressToSend')}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  textInput: {
    height: 220,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surfaceHover,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonActive: {
    backgroundColor: Colors.primary,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});
