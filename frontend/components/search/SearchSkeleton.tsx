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
    <Animated.View
      style={[
        shimmerStyle,
        {
          width,
          height: 16,
          backgroundColor: '#27272a',
          borderRadius: 9999,
        },
      ]}
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
    <Animated.View
      style={[
        cardStyle,
        {
          backgroundColor: '#18181b',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: '#27272a',
            marginRight: 12,
          }}
        />
        <View style={{ flex: 1 }}>
          <SkeletonLine width="60%" delay={delay + 100} />
          <View style={{ height: 8 }} />
          <SkeletonLine width="40%" delay={delay + 200} />
        </View>
      </View>
      <SkeletonLine width="90%" delay={delay + 300} />
      <View style={{ height: 8 }} />
      <SkeletonLine width="70%" delay={delay + 400} />
    </Animated.View>
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
    <View style={{ flex: 1, paddingHorizontal: 4 }}>
      <Animated.View
        style={[
          messageStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 24,
          },
        ]}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <IconComponent size={20} color="#8b5cf6" />
        </View>
        <Text className="text-textSecondary text-base font-medium">
          {currentMessage.text}
        </Text>
      </Animated.View>

      <SkeletonCard delay={0} />
      <SkeletonCard delay={150} />
      <SkeletonCard delay={300} />
    </View>
  );
}
