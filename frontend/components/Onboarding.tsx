import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Globe, Check } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';
import { Colors, Spacing, BorderRadius, Fonts, Shadows } from '@/constants/theme';
import { ONBOARDING_SLIDES, type OnboardingSlide } from '@/lib/onboarding-flow';

const ONBOARDING_BACKGROUND = Colors.background;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH, 500);

type OnboardingProps = {
  onComplete: () => void;
};

type PaginationDotProps = {
  index: number;
  scrollX: SharedValue<number>;
};

const PaginationDot = ({ index, scrollX }: PaginationDotProps) => {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const isActive = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP
    );

    return {
      width: withSpring(width),
      backgroundColor: isActive > 0.5 ? Colors.primary : Colors.textMuted,
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
};

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  const currentLanguage = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const handleSelectLanguage = (language: Language) => {
    setLanguage(language);
    changeLanguage(language);
  };

  const slides = ONBOARDING_SLIDES;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const slide = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentSlide(slide);
  };

  const renderLanguageSlide = () => (
    <View
      style={[styles.slideContainer, { width: SCREEN_WIDTH, backgroundColor: ONBOARDING_BACKGROUND }]}
    >
      <View style={styles.slideContent}>
        <View style={styles.iconContainer}>
          <Globe size={40} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{t('onboarding.language.title')}</Text>
        <Text style={styles.description}>{t('onboarding.language.description')}</Text>
      </View>

      <View style={styles.languageList}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <Pressable
            key={language}
            style={({ pressed }) => [styles.languageRow, pressed && styles.languageRowPressed]}
            onPress={() => handleSelectLanguage(language)}
          >
            <Text style={styles.languageFlag}>{LANGUAGE_FLAGS[language]}</Text>
            <Text style={styles.languageName}>{LANGUAGE_NAMES[language]}</Text>
            {currentLanguage === language && (
              <View style={styles.checkContainer}>
                <Check size={16} color={Colors.textInverse} strokeWidth={3} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderSlide = (slide: OnboardingSlide) => {
    switch (slide.type) {
      case 'language':
        return renderLanguageSlide();
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: ONBOARDING_BACKGROUND }]}>
      {currentSlide < slides.length - 1 && (
        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [
            styles.skipButton,
            { top: insets.top + Spacing.md },
            pressed && styles.skipButtonPressed,
          ]}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {slides.map((slide) => (
          <View key={slide.id}>{renderSlide(slide)}</View>
        ))}
      </ScrollView>

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, Spacing.lg), backgroundColor: ONBOARDING_BACKGROUND }]}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <PaginationDot key={index} index={index} scrollX={scrollX} />
          ))}
        </View>

        {currentSlide === slides.length - 1 ? (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.getStarted')}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },
  skipButtonPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  iconContainer: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    color: Colors.textPrimary,
    width: '100%',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },
  languageList: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: Spacing.sm,
    maxWidth: CONTENT_WIDTH,
    width: '100%',
    ...Shadows.card,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: 14,
  },
  languageRowPressed: {
    backgroundColor: Colors.primaryLight,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  languageName: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
  },
  checkContainer: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    alignSelf: 'center',
    width: '100%',
    maxWidth: CONTENT_WIDTH + Spacing.lg * 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 18,
    ...Shadows.fab,
  },
  nextButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  nextButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  // Solution slide
  solutionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  illustrationWrapper: {
    width: CONTENT_WIDTH * 0.5,
    height: CONTENT_WIDTH * 0.5,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.floating,
  },
  solutionIllustration: {
    width: '100%',
    height: '100%',
  },
  solutionTitle: {
    fontFamily: Fonts.sans.bold,
    color: Colors.textPrimary,
    width: '100%',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featuresGrid: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  featuresRowOffset: {
    marginLeft: -Spacing.lg,
  },
  featureCell: {
    width: (CONTENT_WIDTH - Spacing.xl * 2) / 2.2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  featureCellOffset: {
    marginTop: Spacing.sm,
  },
  featureCellWide: {
    width: (CONTENT_WIDTH - Spacing.xl * 2) / 1.5,
  },
  featureEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  featureCellText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  // Demo slide
  demoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  demoIllustrationWrapper: {
    width: CONTENT_WIDTH * 0.78,
    height: CONTENT_WIDTH * 0.78,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...Shadows.floating,
    marginVertical: Spacing.lg,
  },
  demoIllustration: {
    width: '100%',
    height: '100%',
  },
  demoDescription: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  // Assistant slide
  assistantContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  searchVisualization: {
    width: CONTENT_WIDTH * 0.9,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  assistantIconContainer: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  floatingChip: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Shadows.elevated,
    maxWidth: CONTENT_WIDTH * 0.6,
  },
  floatingChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipPosition1: {
    top: 20,
    left: 10,
    transform: [{ rotate: '-3deg' }],
  },
  chipPosition2: {
    top: 40,
    right: 5,
    transform: [{ rotate: '2deg' }],
  },
  chipPosition3: {
    bottom: 30,
    left: CONTENT_WIDTH * 0.15,
    transform: [{ rotate: '-1deg' }],
  },
  // Typing slide
  typingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  typingIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  typingIconCircle: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingOr: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  // Privacy slide
  privacyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  privacyIllustrationWrapper: {
    width: CONTENT_WIDTH * 0.68,
    height: CONTENT_WIDTH * 0.68,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    marginBottom: Spacing.xl,
  },
  privacyIllustration: {
    width: '100%',
    height: '100%',
  },
  privacyBadge: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  privacyBadgeText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '700',
  },
});
