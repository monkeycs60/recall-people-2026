import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
  StyleSheet,
  Image,
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
} from 'react-native-reanimated';
import { Globe, Check, Mic, Shield, Sparkles, Search } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

const ILLUSTRATIONS = {
  solution: require('@/assets/ai-assets/guy-talking-to-his-phone.png'),
  privacy: require('@/assets/ai-assets/guy-with-privacy-label.png'),
};

const DEMO_VIDEO = require('@/assets/video/onboarding-demo.webm');

const ONBOARDING_BACKGROUND = Colors.background;

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
    { id: 1, key: 'solution', type: 'solution' as const },
    { id: 2, key: 'demo', type: 'demo' as const },
    { id: 3, key: 'assistant', type: 'assistant' as const },
    { id: 4, key: 'privacy', type: 'privacy' as const },
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

  const renderSolutionSlide = () => (
    <View
      style={[styles.slideContainer, { width: SCREEN_WIDTH, backgroundColor: ONBOARDING_BACKGROUND }]}
    >
      <View style={styles.illustrationContainer}>
        <Image source={ILLUSTRATIONS.solution} style={styles.illustration} resizeMode="contain" />
      </View>
      <View style={styles.textContent}>
        <Text style={styles.title}>{t('onboarding.solution.title')}</Text>
        <Text style={styles.description}>{t('onboarding.solution.description')}</Text>
      </View>

      {/* Visual flow: Mic → Sparkles → Card */}
      <View style={styles.flowContainer}>
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: Colors.primaryLight }]}>
            <Mic size={24} color={Colors.primary} />
          </View>
        </View>
        <View style={styles.flowArrow}>
          <Text style={styles.flowArrowText}>→</Text>
        </View>
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: Colors.primaryLight }]}>
            <Sparkles size={24} color={Colors.primary} />
          </View>
        </View>
        <View style={styles.flowArrow}>
          <Text style={styles.flowArrowText}>→</Text>
        </View>
        <View style={styles.flowStep}>
          <View style={[styles.flowIcon, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.flowCardIcon}>📇</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDemoSlide = () => (
    <View
      style={[styles.slideContainer, { width: SCREEN_WIDTH, backgroundColor: ONBOARDING_BACKGROUND }]}
    >
      <View style={styles.demoContent}>
        <Text style={styles.title}>{t('onboarding.demo.title')}</Text>

        {/* Video demo */}
        <View style={styles.videoContainer}>
          <Video
            source={DEMO_VIDEO}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
          />
        </View>

        <Text style={styles.demoDescription}>{t('onboarding.demo.description')}</Text>
      </View>
    </View>
  );

  const assistantExamples = [
    t('onboarding.assistant.example1'),
    t('onboarding.assistant.example2'),
    t('onboarding.assistant.example3'),
  ];

  const renderAssistantSlide = () => (
    <View
      style={[styles.slideContainer, { width: SCREEN_WIDTH, backgroundColor: ONBOARDING_BACKGROUND }]}
    >
      <View style={styles.assistantContent}>
        {/* Search icon with floating question chips around it */}
        <View style={styles.searchVisualization}>
          {/* Floating chips positioned around the icon */}
          <View style={[styles.floatingChip, styles.chipPosition1]}>
            <Text style={styles.floatingChipText}>{assistantExamples[0]}</Text>
          </View>
          <View style={[styles.floatingChip, styles.chipPosition2]}>
            <Text style={styles.floatingChipText}>{assistantExamples[1]}</Text>
          </View>
          <View style={[styles.floatingChip, styles.chipPosition3]}>
            <Text style={styles.floatingChipText}>{assistantExamples[2]}</Text>
          </View>

          {/* Central search icon */}
          <View style={styles.assistantIconContainer}>
            <Search size={40} color={Colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>{t('onboarding.assistant.title')}</Text>
        <Text style={styles.description}>{t('onboarding.assistant.description')}</Text>
      </View>
    </View>
  );

  const renderPrivacySlide = () => (
    <View
      style={[styles.slideContainer, { width: SCREEN_WIDTH, backgroundColor: ONBOARDING_BACKGROUND }]}
    >
      <View style={styles.privacyContent}>
        <View style={styles.privacyIconContainer}>
          <Shield size={64} color={Colors.primary} />
        </View>
        <Text style={styles.title}>{t('onboarding.privacy.title')}</Text>
        <Text style={styles.description}>{t('onboarding.privacy.description')}</Text>

        <View style={styles.privacyBadge}>
          <Text style={styles.privacyBadgeText}>100% {t('onboarding.privacy.local')}</Text>
        </View>
      </View>
    </View>
  );

  const renderSlide = (slide: (typeof slides)[0]) => {
    switch (slide.type) {
      case 'language':
        return renderLanguageSlide();
      case 'solution':
        return renderSolutionSlide();
      case 'demo':
        return renderDemoSlide();
      case 'assistant':
        return renderAssistantSlide();
      case 'privacy':
        return renderPrivacySlide();
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
          {slides.map((_, index) => {
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
  },
  skipButton: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  skipButtonPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  skipText: {
    color: Colors.textSecondary,
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
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  illustration: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    maxHeight: 220,
  },
  textContent: {
    paddingBottom: Spacing.md,
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
    fontSize: 24,
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
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
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
  // Flow visualization
  flowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  flowStep: {
    alignItems: 'center',
  },
  flowIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowCardIcon: {
    fontSize: 24,
  },
  flowArrow: {
    paddingHorizontal: Spacing.md,
  },
  flowArrowText: {
    fontSize: 24,
    color: Colors.textMuted,
  },
  // Demo slide
  demoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  videoContainer: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 1.1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginVertical: Spacing.lg,
  },
  video: {
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
  },
  searchVisualization: {
    width: SCREEN_WIDTH * 0.9,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: SCREEN_WIDTH * 0.6,
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
    left: SCREEN_WIDTH * 0.15,
    transform: [{ rotate: '-1deg' }],
  },
  // Privacy slide
  privacyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyIconContainer: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.xl,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
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
