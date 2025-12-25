import { View, Text, Pressable, Dimensions, ScrollView } from 'react-native';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Mic, Brain, Users, Search, Globe, CheckCircle } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type OnboardingProps = {
  onComplete: () => void;
};

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const { t } = useTranslation();
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
    {
      id: 0,
      icon: Globe,
      key: 'language',
    },
    {
      id: 1,
      icon: CheckCircle,
      key: 'welcome',
    },
    {
      id: 2,
      icon: Mic,
      key: 'record',
    },
    {
      id: 3,
      icon: Brain,
      key: 'ai',
    },
    {
      id: 4,
      icon: Users,
      key: 'contacts',
    },
    {
      id: 5,
      icon: Search,
      key: 'search',
    },
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

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const slide = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentSlide(slide);
  };

  const renderLanguageSlide = () => (
    <View className="flex-1 px-6 justify-center" style={{ width: SCREEN_WIDTH }}>
      <View className="items-center mb-8">
        <View className="bg-primary/20 p-6 rounded-full mb-6">
          <Globe size={64} color="#8b5cf6" />
        </View>
        <Text className="text-textPrimary text-3xl font-bold text-center mb-4">
          {t('onboarding.language.title')}
        </Text>
        <Text className="text-textSecondary text-base text-center">
          {t('onboarding.language.description')}
        </Text>
      </View>

      <View className="bg-surface rounded-2xl p-4 mb-6">
        {SUPPORTED_LANGUAGES.map((language) => (
          <Pressable
            key={language}
            className="flex-row items-center px-4 py-4 rounded-xl active:bg-surfaceHover"
            onPress={() => handleSelectLanguage(language)}
          >
            <Text className="text-3xl mr-4">{LANGUAGE_FLAGS[language]}</Text>
            <Text className="flex-1 text-textPrimary text-lg font-medium">
              {LANGUAGE_NAMES[language]}
            </Text>
            {currentLanguage === language && (
              <View className="bg-primary rounded-full p-1">
                <CheckCircle size={20} color="#ffffff" fill="#8b5cf6" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderSlide = (slide: typeof slides[0]) => {
    if (slide.key === 'language') {
      return renderLanguageSlide();
    }

    const Icon = slide.icon;

    return (
      <View className="flex-1 px-6 justify-center" style={{ width: SCREEN_WIDTH }}>
        <View className="items-center">
          <View className="bg-primary/20 p-6 rounded-full mb-8">
            <Icon size={64} color="#8b5cf6" />
          </View>
          <Text className="text-textPrimary text-3xl font-bold text-center mb-4">
            {t(`onboarding.${slide.key}.title`)}
          </Text>
          <Text className="text-textSecondary text-base text-center leading-6">
            {t(`onboarding.${slide.key}.description`)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Skip button */}
      {currentSlide < slides.length - 1 && (
        <Pressable
          onPress={handleSkip}
          className="absolute top-12 right-6 z-10 px-4 py-2 rounded-full bg-surface active:bg-surfaceHover"
        >
          <Text className="text-textSecondary font-medium">
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      )}

      {/* Slides */}
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

      {/* Bottom section */}
      <View className="px-6 pb-12">
        {/* Pagination dots */}
        <View className="flex-row justify-center mb-8">
          {slides.map((_, index) => {
            const dotStyle = useAnimatedStyle(() => {
              const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH,
              ];

              const width = interpolate(
                scrollX.value,
                inputRange,
                [8, 24, 8],
                Extrapolation.CLAMP
              );

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

            return (
              <Animated.View
                key={index}
                style={[dotStyle]}
                className="h-2 rounded-full bg-primary mx-1"
              />
            );
          })}
        </View>

        {/* Next/Get Started button */}
        <Pressable
          onPress={handleNext}
          className="bg-primary py-4 rounded-2xl active:bg-primary/90"
        >
          <Text className="text-white text-center text-lg font-semibold">
            {currentSlide === slides.length - 1
              ? t('onboarding.getStarted')
              : t('onboarding.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
