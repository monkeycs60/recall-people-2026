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
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const buttonScale = useSharedValue(1);

  const defaultPlaceholder = contactFirstName
    ? `Écrivez ce que vous savez sur ${contactFirstName}...`
    : 'Décrivez la personne rencontrée, le contexte, les détails importants...';

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

  const canSubmit = text.trim().length >= 10 && !isProcessing;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
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
      </View>

      <Animated.Text style={styles.hint}>
        {text.length < 10
          ? `Minimum 10 caractères (${10 - text.length} restants)`
          : 'Appuyez sur envoyer pour analyser'}
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  textInput: {
    height: 220,
    padding: Spacing.md,
    paddingTop: Spacing.md,
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
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceHover,
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
