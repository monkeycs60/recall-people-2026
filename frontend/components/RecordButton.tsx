import { Pressable, View } from 'react-native';
import { Mic } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type RecordButtonProps = {
  onPressIn: () => void;
  onPressOut: () => void;
  isRecording: boolean;
  isProcessing: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RecordButton({ onPressIn, onPressOut, isRecording, isProcessing }: RecordButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.9;
    onPressIn();
  };

  const handlePressOut = () => {
    scale.value = 1;
    onPressOut();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isProcessing}
      style={animatedStyle}
      className={`w-32 h-32 rounded-full items-center justify-center ${
        isRecording ? 'bg-error' : isProcessing ? 'bg-textMuted' : 'bg-primary'
      }`}
    >
      <Mic size={48} color="white" />
    </AnimatedPressable>
  );
}
