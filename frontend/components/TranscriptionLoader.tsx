import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

const DOT_COUNT = 3;
const DOT_SIZE = 10;
const DOT_SPACING = 8;
const ANIMATION_DURATION = 400;

type DotProps = {
  index: number;
};

function AnimatedDot({ index }: DotProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  scale.value = withDelay(
    index * 150,
    withRepeat(
      withSequence(
        withTiming(1.3, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    )
  );

  opacity.value = withDelay(
    index * 150,
    withRepeat(
      withSequence(
        withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.ease) }),
        withTiming(0.4, { duration: ANIMATION_DURATION, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    )
  );

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function TranscriptionLoader() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        {Array.from({ length: DOT_COUNT }).map((_, index) => (
          <AnimatedDot key={index} index={index} />
        ))}
      </View>
      <Text style={styles.text}>{t('home.transcribing')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_SPACING,
    height: DOT_SIZE * 1.5,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  text: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
