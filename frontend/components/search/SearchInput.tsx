import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { X, Sparkles, SendHorizonal } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

type SearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
};

export function SearchInput({
  value,
  onChangeText,
  onSubmit,
  onClear,
  isLoading,
}: SearchInputProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const borderColorProgress = useSharedValue(0);
  const focusProgress = useSharedValue(0);

  useEffect(() => {
    if (isLoading) {
      borderColorProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      borderColorProgress.value = withTiming(0, { duration: 300 });
    }
  }, [isLoading, borderColorProgress]);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, { duration: 150 });
  }, [isFocused, focusProgress]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const loadingBorderColor = interpolateColor(
      borderColorProgress.value,
      [0, 1],
      [Colors.borderLight, Colors.primary]
    );

    const focusBorderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      [Colors.borderLight, Colors.primary]
    );

    return {
      borderColor: isLoading ? loadingBorderColor : focusBorderColor,
      borderWidth: withTiming(isFocused || isLoading ? 2 : 1.5, { duration: 150 }),
    };
  });

  const canSubmit = value.trim().length > 0 && !isLoading;
  const iconColor = isFocused || isLoading ? Colors.primary : Colors.textMuted;

  return (
    <Animated.View style={[styles.container, animatedBorderStyle]}>
      <View style={styles.iconContainer}>
        <Sparkles size={22} color={iconColor} />
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('search.placeholder')}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="search"
        editable={!isLoading}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value.length > 0 && !isLoading && (
        <Pressable onPress={onClear} style={styles.clearButton}>
          <X size={18} color={Colors.textMuted} />
        </Pressable>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[
          styles.submitButton,
          { backgroundColor: canSubmit ? Colors.primary : Colors.surfaceAlt },
        ]}
      >
        <SendHorizonal size={20} color={canSubmit ? Colors.textInverse : Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    marginLeft: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginLeft: 4,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
