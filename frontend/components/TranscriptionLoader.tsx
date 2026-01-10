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
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { ProcessingStep } from '@/types';

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

type StepIndicatorProps = {
  step: ProcessingStep;
  totalSteps: number;
  currentStepIndex: number;
};

function StepIndicator({ totalSteps, currentStepIndex }: StepIndicatorProps) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            index < currentStepIndex && styles.stepDotCompleted,
            index === currentStepIndex && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );
}

type TranscriptionLoaderProps = {
  step?: ProcessingStep;
  hasPreselectedContact?: boolean;
};

export function TranscriptionLoader({ step = 'transcribing', hasPreselectedContact = false }: TranscriptionLoaderProps) {
  const { t } = useTranslation();

  const getStepConfig = () => {
    if (hasPreselectedContact) {
      return {
        totalSteps: 2,
        currentStepIndex: step === 'transcribing' ? 0 : 1,
      };
    }
    return {
      totalSteps: 2,
      currentStepIndex: step === 'transcribing' ? 0 : 1,
    };
  };

  const { totalSteps, currentStepIndex } = getStepConfig();

  const getStepText = () => {
    switch (step) {
      case 'transcribing':
        return t('processing.transcribing');
      case 'detecting':
        return t('processing.detecting');
      case 'extracting':
        return t('processing.extracting');
      default:
        return t('processing.transcribing');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dotsContainer}>
        {Array.from({ length: DOT_COUNT }).map((_, index) => (
          <AnimatedDot key={index} index={index} />
        ))}
      </View>

      <View style={styles.textContainer}>
        <Animated.Text
          key={step}
          entering={SlideInRight.duration(300).easing(Easing.out(Easing.ease))}
          exiting={SlideOutLeft.duration(200).easing(Easing.in(Easing.ease))}
          style={styles.text}
        >
          {getStepText()}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeIn.delay(200).duration(400)}>
        <StepIndicator
          step={step}
          totalSteps={totalSteps}
          currentStepIndex={currentStepIndex}
        />
      </Animated.View>
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
  textContainer: {
    height: 28,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border,
  },
  stepDotCompleted: {
    backgroundColor: Colors.primary,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
});
