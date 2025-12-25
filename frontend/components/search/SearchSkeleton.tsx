import { View, Text, DimensionValue, StyleSheet } from 'react-native';
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
import { Colors } from '@/constants/theme';

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
          backgroundColor: Colors.border,
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
    <Animated.View style={[cardStyle, styles.skeletonCard]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonTextContainer}>
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
    <View style={styles.container}>
      <Animated.View style={[messageStyle, styles.messageContainer]}>
        <View style={styles.messageIconContainer}>
          <IconComponent size={20} color={Colors.primary} />
        </View>
        <Text style={styles.messageText}>{currentMessage.text}</Text>
      </Animated.View>

      <SkeletonCard delay={0} />
      <SkeletonCard delay={150} />
      <SkeletonCard delay={300} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  messageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    marginRight: 12,
  },
  skeletonTextContainer: {
    flex: 1,
  },
});
