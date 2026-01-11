import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mic, PenLine } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
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
const AnimatedText = Animated.createAnimatedComponent(Text);

const TRANSITION_DURATION = 250;
const TRANSITION_CONFIG = {
  duration: TRANSITION_DURATION,
  easing: Easing.out(Easing.quad),
};

export function AddNoteButton({ firstName, mode, onModeChange, onPress }: AddNoteButtonProps) {
  const buttonScale = useSharedValue(1);
  const modeProgress = useSharedValue(mode === 'audio' ? 0 : 1);

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 100 });
  };

  const handleModeChange = (newMode: InputMode) => {
    modeProgress.value = withTiming(newMode === 'audio' ? 0 : 1, TRANSITION_CONFIG);
    onModeChange(newMode);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: modeProgress.value * 80 }],
  }));

  const audioIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - modeProgress.value,
    position: 'absolute' as const,
  }));

  const textIconStyle = useAnimatedStyle(() => ({
    opacity: modeProgress.value,
    position: 'absolute' as const,
  }));

  const audioTextStyle = useAnimatedStyle(() => ({
    opacity: 1 - modeProgress.value,
    position: 'absolute' as const,
  }));

  const textTextStyle = useAnimatedStyle(() => ({
    opacity: modeProgress.value,
  }));

  const audioLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      modeProgress.value,
      [0, 1],
      [Colors.textInverse, Colors.textMuted]
    ),
  }));

  const textLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      modeProgress.value,
      [0, 1],
      [Colors.textMuted, Colors.textInverse]
    ),
  }));

  const audioSwitchIconActiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - modeProgress.value,
  }));

  const audioSwitchIconInactiveStyle = useAnimatedStyle(() => ({
    opacity: modeProgress.value,
  }));

  const textSwitchIconActiveStyle = useAnimatedStyle(() => ({
    opacity: modeProgress.value,
  }));

  const textSwitchIconInactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - modeProgress.value,
  }));

  return (
    <View style={styles.container}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.mainButton, buttonAnimatedStyle]}
      >
        <View style={styles.iconContainer}>
          <Animated.View style={audioIconStyle}>
            <Mic size={20} color={Colors.textInverse} />
          </Animated.View>
          <Animated.View style={textIconStyle}>
            <PenLine size={20} color={Colors.textInverse} />
          </Animated.View>
        </View>
        <View style={styles.textContainer}>
          <AnimatedText style={[styles.buttonText, audioTextStyle]}>
            {`Quoi de neuf avec ${firstName} ?`}
          </AnimatedText>
          <AnimatedText style={[styles.buttonText, textTextStyle]}>
            {`Écrire sur ${firstName}`}
          </AnimatedText>
        </View>
      </AnimatedPressable>

      <View style={styles.modeSelector}>
        <Animated.View style={[styles.modeIndicator, indicatorStyle]} />

        <Pressable
          onPress={() => handleModeChange('audio')}
          style={styles.modeOption}
          hitSlop={8}
        >
          <View style={styles.switchIconContainer}>
            <Animated.View style={[styles.switchIconAbsolute, audioSwitchIconActiveStyle]}>
              <Mic size={16} color={Colors.textInverse} />
            </Animated.View>
            <Animated.View style={[styles.switchIconAbsolute, audioSwitchIconInactiveStyle]}>
              <Mic size={16} color={Colors.textMuted} />
            </Animated.View>
          </View>
          <AnimatedText style={[styles.modeLabel, audioLabelStyle]}>
            Parler
          </AnimatedText>
        </Pressable>

        <Pressable
          onPress={() => handleModeChange('text')}
          style={styles.modeOption}
          hitSlop={8}
        >
          <View style={styles.switchIconContainer}>
            <Animated.View style={[styles.switchIconAbsolute, textSwitchIconActiveStyle]}>
              <PenLine size={16} color={Colors.textInverse} />
            </Animated.View>
            <Animated.View style={[styles.switchIconAbsolute, textSwitchIconInactiveStyle]}>
              <PenLine size={16} color={Colors.textMuted} />
            </Animated.View>
          </View>
          <AnimatedText style={[styles.modeLabel, textLabelStyle]}>
            Écrire
          </AnimatedText>
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
    paddingHorizontal: 32,
    borderRadius: BorderRadius.md,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    minWidth: 220,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 80,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    width: 80,
    height: 28,
    justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchIconContainer: {
    width: 16,
    height: 16,
    position: 'relative',
  },
  switchIconAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
