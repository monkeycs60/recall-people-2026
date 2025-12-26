import { View, Text, Pressable, Dimensions, ScrollView, StyleSheet, Image } from 'react-native';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Globe, Check } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

const ILLUSTRATIONS = {
  problem: require('@/assets/ai-assets/guy-wondering-questions.png'),
  action: require('@/assets/ai-assets/guy-talking-to-his-phone.png'),
  value: require('@/assets/ai-assets/guy-with-cards-and-labels-background.png'),
  trust: require('@/assets/ai-assets/guy-with-privacy-label.png'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type OnboardingProps = {
  onComplete: () => void;
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

  const slides = [
    { id: 0, key: 'language', type: 'language' as const },
    { id: 1, key: 'problem', type: 'illustration' as const, image: ILLUSTRATIONS.problem },
    { id: 2, key: 'action', type: 'illustration' as const, image: ILLUSTRATIONS.action },
    { id: 3, key: 'value', type: 'illustration' as const, image: ILLUSTRATIONS.value },
    { id: 4, key: 'trust', type: 'illustration' as const, image: ILLUSTRATIONS.trust },
  ];

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
    <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
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
            style={({ pressed }) => [
              styles.languageRow,
              pressed && styles.languageRowPressed,
            ]}
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

  const renderSlide = (slide: (typeof slides)[0]) => {
    if (slide.type === 'language') {
      return renderLanguageSlide();
    }

    return (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
        <View style={styles.illustrationContainer}>
          <Image
            source={slide.image}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
        <View style={styles.textContent}>
          <Text style={styles.title}>{t(`onboarding.${slide.key}.title`)}</Text>
          <Text style={styles.description}>{t(`onboarding.${slide.key}.description`)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const dotStyle = useAnimatedStyle(() => {
              const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
              ];

              const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.3, 1, 0.3],
                Extrapolation.CLAMP
              );

              return {
                width: withSpring(width),
                opacity: withSpring(opacity),
              };
            });

            return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
          })}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.nextButton, pressed && styles.nextButtonPressed]}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipButtonPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  skipText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  slideContent: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  illustration: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    maxHeight: 300,
  },
  textContent: {
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  languageRowPressed: {
    backgroundColor: Colors.surfaceHover,
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
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  nextButtonPressed: {
    backgroundColor: Colors.primaryDark,
  },
  nextButtonText: {
    color: Colors.textInverse,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
});
