import { View, Pressable, StyleSheet } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  useEffect as useReanimatedEffect,
} from 'react-native-reanimated';
import { useEffect } from 'react';

type RecordButtonProps = {
  onPress: () => void;
  isRecording: boolean;
  isProcessing: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RecordButton({ onPress, isRecording, isProcessing }: RecordButtonProps) {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      ringOpacity.value = withTiming(1, { duration: 300 });
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      ringOpacity.value = withTiming(0, { duration: 300 });
      ringScale.value = withTiming(1, { duration: 300 });
    }
  }, [isRecording, ringOpacity, ringScale]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const buttonColor = isRecording
    ? Colors.error
    : isProcessing
    ? Colors.textMuted
    : Colors.primary;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          ringAnimatedStyle,
          { borderColor: Colors.primary },
        ]}
      />

      <AnimatedPressable
        testID="record-button"
        accessibilityLabel={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={isProcessing}
        style={[
          styles.button,
          buttonAnimatedStyle,
          { backgroundColor: buttonColor },
        ]}
      >
        {isRecording ? (
          <Square size={36} color={Colors.textInverse} fill={Colors.textInverse} />
        ) : (
          <Mic size={44} color={Colors.textInverse} strokeWidth={2} />
        )}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
