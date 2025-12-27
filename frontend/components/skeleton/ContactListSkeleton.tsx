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

function SkeletonContactCard({ delay }: { delay: number }) {
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
    <Animated.View style={[cardStyle, styles.contactCard]}>
      <View style={styles.avatarPlaceholder} />
      <View style={styles.contactInfo}>
        <SkeletonLine width="55%" delay={delay + 100} />
        <View style={styles.factsRow}>
          <View style={styles.factPillPlaceholder}>
            <SkeletonLine width={60} delay={delay + 200} />
          </View>
          <View style={styles.factPillPlaceholder}>
            <SkeletonLine width={50} delay={delay + 250} />
          </View>
        </View>
      </View>
      <View style={styles.chevronPlaceholder} />
    </Animated.View>
  );
}

export function ContactListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonContactCard key={index} delay={index * 80} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
    gap: 8,
  },
  factsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  factPillPlaceholder: {
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chevronPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    opacity: 0.3,
  },
});
