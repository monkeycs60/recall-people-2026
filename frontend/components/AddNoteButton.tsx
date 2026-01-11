import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mic, PenLine } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '@/constants/theme';
import { InputMode } from './InputModeToggle';

interface AddNoteButtonProps {
  firstName: string;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AddNoteButton({ firstName, mode, onModeChange, onPress }: AddNoteButtonProps) {
  const buttonScale = useSharedValue(1);
  const indicatorPosition = useSharedValue(mode === 'audio' ? 0 : 1);

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 100 });
  };

  const handleModeChange = (newMode: InputMode) => {
    indicatorPosition.value = withTiming(newMode === 'audio' ? 0 : 1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
    });
    onModeChange(newMode);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value * 80 }],
  }));

  const buttonText = mode === 'audio'
    ? `Quoi de neuf avec ${firstName} ?`
    : `Écrire sur ${firstName}`;

  return (
    <View style={styles.container}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.mainButton, buttonAnimatedStyle]}
      >
        {mode === 'audio' ? (
          <Mic size={20} color={Colors.textInverse} />
        ) : (
          <PenLine size={20} color={Colors.textInverse} />
        )}
        <Text style={styles.buttonText}>{buttonText}</Text>
      </AnimatedPressable>

      <View style={styles.modeSelector}>
        <Animated.View style={[styles.modeIndicator, indicatorStyle]} />

        <Pressable
          onPress={() => handleModeChange('audio')}
          style={styles.modeOption}
          hitSlop={8}
        >
          <Mic size={16} color={mode === 'audio' ? Colors.textInverse : Colors.textMuted} />
          <Text style={[styles.modeLabel, mode === 'audio' && styles.modeLabelActive]}>
            Parler
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleModeChange('text')}
          style={styles.modeOption}
          hitSlop={8}
        >
          <PenLine size={16} color={mode === 'text' ? Colors.textInverse : Colors.textMuted} />
          <Text style={[styles.modeLabel, mode === 'text' && styles.modeLabelActive]}>
            Écrire
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  modeIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 76,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    width: 80,
    justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modeLabelActive: {
    color: Colors.textInverse,
  },
});
