import { View, Text, DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { Brain, Sparkles, Search } from 'lucide-react-native';

const AnimatedView = Animated.createAnimatedComponent(View);

const LOADING_MESSAGES = [
  { text: 'Analyse de vos contacts...', icon: Search },
  { text: 'Recherche sémantique...', icon: Brain },
  { text: 'Connexion des informations...', icon: Sparkles },
];

function SkeletonLine({ width, delay }: { width: DimensionValue; delay: number }) {
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      )
    );
  }, [shimmerOpacity, delay]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <AnimatedView
      style={[shimmerStyle, { width }]}
      className="h-4 bg-surfaceHover rounded-full"
    />
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(10);

  useEffect(() => {
    cardOpacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    cardTranslateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, [cardOpacity, cardTranslateY, delay]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <AnimatedView style={cardStyle} className="bg-surface rounded-2xl p-4 mb-3">
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 rounded-xl bg-surfaceHover mr-3" />
        <View className="flex-1">
          <SkeletonLine width="60%" delay={delay + 100} />
          <View className="h-2" />
          <SkeletonLine width="40%" delay={delay + 200} />
        </View>
      </View>
      <SkeletonLine width="90%" delay={delay + 300} />
      <View className="h-2" />
      <SkeletonLine width="70%" delay={delay + 400} />
    </AnimatedView>
  );
}

export function SearchSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0);
  const messageOpacity = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      messageOpacity.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 200);
    }, 2000);

    return () => clearInterval(interval);
  }, [messageOpacity]);

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  const currentMessage = LOADING_MESSAGES[messageIndex];
  const IconComponent = currentMessage.icon;

  return (
    <View className="flex-1 px-1">
      <AnimatedView
        style={messageStyle}
        className="flex-row items-center justify-center py-6"
      >
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
          <IconComponent size={20} color="#8b5cf6" />
        </View>
        <Text className="text-textSecondary text-base font-medium">
          {currentMessage.text}
        </Text>
      </AnimatedView>

      <SkeletonCard delay={0} />
      <SkeletonCard delay={150} />
      <SkeletonCard delay={300} />
    </View>
  );
}
