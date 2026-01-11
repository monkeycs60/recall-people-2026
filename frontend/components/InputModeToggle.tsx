import { View, Pressable, StyleSheet } from 'react-native';
import { Mic, PenLine } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '@/constants/theme';

export type InputMode = 'audio' | 'text';

interface InputModeToggleProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled?: boolean;
}

export function InputModeToggle({ mode, onModeChange, disabled = false }: InputModeToggleProps) {
  const translateX = useSharedValue(mode === 'audio' ? 0 : 1);

  const handleModeChange = (newMode: InputMode) => {
    if (disabled) return;
    translateX.value = withSpring(newMode === 'audio' ? 0 : 1, {
      damping: 20,
      stiffness: 300,
    });
    onModeChange(newMode);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 44 }],
  }));

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      <Pressable
        onPress={() => handleModeChange('audio')}
        style={styles.button}
        disabled={disabled}
        hitSlop={8}
      >
        <Mic size={18} color={mode === 'audio' ? Colors.textInverse : Colors.textMuted} />
      </Pressable>

      <Pressable
        onPress={() => handleModeChange('text')}
        style={styles.button}
        disabled={disabled}
        hitSlop={8}
      >
        <PenLine size={18} color={mode === 'text' ? Colors.textInverse : Colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceHover,
    borderRadius: BorderRadius.full,
    padding: 4,
    position: 'relative',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
});
