import { Pressable } from 'react-native';
import { Mic, Square } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming } from 'react-native-reanimated';

type RecordButtonProps = {
  onPress: () => void;
  isRecording: boolean;
  isProcessing: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RecordButton({ onPress, isRecording, isProcessing }: RecordButtonProps) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  if (isRecording) {
    pulse.value = withRepeat(
      withTiming(1.1, { duration: 800 }),
      -1,
      true
    );
  } else {
    pulse.value = 1;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value * pulse.value) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.95;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={isProcessing}
      style={animatedStyle}
      className={`w-32 h-32 rounded-full items-center justify-center ${
        isRecording ? 'bg-error' : isProcessing ? 'bg-textMuted' : 'bg-primary'
      }`}
    >
      {isRecording ? (
        <Square size={40} color="white" fill="white" />
      ) : (
        <Mic size={48} color="white" />
      )}
    </AnimatedPressable>
  );
}
