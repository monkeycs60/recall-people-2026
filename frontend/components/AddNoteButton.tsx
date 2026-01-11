import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mic, PenLine } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
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

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
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
        <Pressable
          onPress={() => onModeChange('audio')}
          style={[
            styles.modeOption,
            mode === 'audio' && styles.modeOptionActive,
          ]}
          hitSlop={8}
        >
          <Mic size={16} color={mode === 'audio' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.modeLabel, mode === 'audio' && styles.modeLabelActive]}>
            Parler
          </Text>
        </Pressable>

        <View style={styles.modeDivider} />

        <Pressable
          onPress={() => onModeChange('text')}
          style={[
            styles.modeOption,
            mode === 'text' && styles.modeOptionActive,
          ]}
          hitSlop={8}
        >
          <PenLine size={16} color={mode === 'text' ? Colors.primary : Colors.textMuted} />
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
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
  },
  modeOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  modeLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modeLabelActive: {
    color: Colors.primary,
  },
  modeDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
});
