import { View, DimensionValue, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Colors } from '@/constants/theme';

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
          height: 14,
          backgroundColor: Colors.border,
          borderRadius: 9999,
        },
      ]}
    />
  );
}

function SkeletonEventCard({ delay }: { delay: number }) {
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(10);

  useEffect(() => {
    cardOpacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    cardTranslateY.value = withDelay(delay, withTiming(0, { duration: 300 }));
  }, [cardOpacity, cardTranslateY, delay]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  return (
    <Animated.View style={[cardStyle, styles.eventCard]}>
      <View style={styles.iconPlaceholder} />
      <View style={styles.eventContent}>
        <SkeletonLine width="70%" delay={delay + 100} />
        <SkeletonLine width="45%" delay={delay + 200} />
      </View>
    </Animated.View>
  );
}

function SkeletonDayGroup({ delay, eventCount }: { delay: number; eventCount: number }) {
  return (
    <View style={styles.dayContainer}>
      <View style={styles.dayHeaderPlaceholder}>
        <SkeletonLine width={100} delay={delay} />
      </View>
      {Array.from({ length: eventCount }).map((_, index) => (
        <SkeletonEventCard key={index} delay={delay + (index + 1) * 80} />
      ))}
    </View>
  );
}

export function EventListSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonDayGroup delay={0} eventCount={2} />
      <SkeletonDayGroup delay={250} eventCount={1} />
      <SkeletonDayGroup delay={400} eventCount={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayHeaderPlaceholder: {
    marginBottom: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  iconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
  },
  eventContent: {
    marginLeft: 12,
    flex: 1,
    gap: 6,
  },
});
