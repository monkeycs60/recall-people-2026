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

function SkeletonLine({ width, height = 14, delay }: { width: DimensionValue; height?: number; delay: number }) {
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
          height,
          backgroundColor: Colors.border,
          borderRadius: 9999,
        },
      ]}
    />
  );
}

function SkeletonSection({ delay, children }: { delay: number; children: React.ReactNode }) {
  const sectionOpacity = useSharedValue(0);
  const sectionTranslateY = useSharedValue(15);

  useEffect(() => {
    sectionOpacity.value = withDelay(delay, withTiming(1, { duration: 350 }));
    sectionTranslateY.value = withDelay(delay, withTiming(0, { duration: 350 }));
  }, [sectionOpacity, sectionTranslateY, delay]);

  const sectionStyle = useAnimatedStyle(() => ({
    opacity: sectionOpacity.value,
    transform: [{ translateY: sectionTranslateY.value }],
  }));

  return <Animated.View style={sectionStyle}>{children}</Animated.View>;
}

export function ContactDetailSkeleton() {
  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.avatarPlaceholder} />
        <View style={styles.nameContainer}>
          <SkeletonLine width="50%" height={28} delay={100} />
        </View>
        <View style={styles.groupChipsRow}>
          <View style={styles.groupChipPlaceholder}>
            <SkeletonLine width={60} delay={150} />
          </View>
          <View style={styles.groupChipPlaceholder}>
            <SkeletonLine width={45} delay={200} />
          </View>
        </View>
        <View style={styles.buttonPlaceholder}>
          <SkeletonLine width={120} delay={250} />
        </View>
      </View>

      {/* AI Summary Section */}
      <SkeletonSection delay={300}>
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SkeletonLine width="40%" height={18} delay={350} />
            <View style={styles.cardContent}>
              <SkeletonLine width="100%" delay={400} />
              <SkeletonLine width="90%" delay={450} />
              <SkeletonLine width="75%" delay={500} />
            </View>
          </View>
        </View>
      </SkeletonSection>

      {/* Ice Breakers Section */}
      <SkeletonSection delay={400}>
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SkeletonLine width="35%" height={18} delay={450} />
            <View style={styles.cardContent}>
              <SkeletonLine width="85%" delay={500} />
              <SkeletonLine width="70%" delay={550} />
            </View>
          </View>
        </View>
      </SkeletonSection>

      {/* Hot Topics Section */}
      <SkeletonSection delay={500}>
        <View style={styles.section}>
          <SkeletonLine width="30%" height={22} delay={550} />
          <View style={styles.listCard}>
            <View style={styles.listItem}>
              <View style={styles.iconPlaceholder} />
              <View style={styles.listItemContent}>
                <SkeletonLine width="70%" delay={600} />
                <SkeletonLine width="50%" delay={650} />
              </View>
            </View>
          </View>
        </View>
      </SkeletonSection>

      {/* Profile Section */}
      <SkeletonSection delay={600}>
        <View style={styles.section}>
          <SkeletonLine width="25%" height={22} delay={650} />
          <View style={styles.profileGrid}>
            <View style={styles.profileItem}>
              <SkeletonLine width="40%" height={12} delay={700} />
              <SkeletonLine width="60%" delay={750} />
            </View>
            <View style={styles.profileItem}>
              <SkeletonLine width="35%" height={12} delay={800} />
              <SkeletonLine width="55%" delay={850} />
            </View>
            <View style={styles.profileItem}>
              <SkeletonLine width="45%" height={12} delay={900} />
              <SkeletonLine width="50%" delay={950} />
            </View>
          </View>
        </View>
      </SkeletonSection>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  groupChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  groupChipPlaceholder: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  buttonPlaceholder: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    opacity: 0.5,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  cardContent: {
    marginTop: 12,
    gap: 8,
  },
  listCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
  },
  listItemContent: {
    flex: 1,
    gap: 6,
  },
  profileGrid: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 12,
    padding: 16,
    gap: 16,
  },
  profileItem: {
    gap: 6,
  },
});
