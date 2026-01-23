import { useState, forwardRef } from 'react';
import { TextInput, TextInputProps, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type StyledTextInputProps = TextInputProps & {
  hasError?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
};

export const StyledTextInput = forwardRef<TextInput, StyledTextInputProps>(
  ({ hasError, containerStyle, inputStyle, editable = true, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const isDisabled = editable === false;

    const animatedContainerStyle = useAnimatedStyle(() => {
      const targetBorderColor = hasError
        ? Colors.error
        : isFocused
          ? Colors.primary
          : Colors.borderLight;

      const targetBorderWidth = hasError || isFocused ? 2 : 1.5;

      return {
        borderColor: withTiming(targetBorderColor, { duration: 150 }),
        borderWidth: withTiming(targetBorderWidth, { duration: 150 }),
      };
    }, [hasError, isFocused]);

    return (
      <Animated.View
        style={[
          styles.container,
          isDisabled && styles.containerDisabled,
          animatedContainerStyle,
          containerStyle,
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, inputStyle, style]}
          placeholderTextColor={Colors.textMuted}
          editable={editable}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          {...props}
        />
      </Animated.View>
    );
  }
);

StyledTextInput.displayName = 'StyledTextInput';

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  containerDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
});
