import { View, Text, Pressable } from 'react-native';
import { forwardRef, useCallback, useMemo } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';

export const LanguagePicker = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();
  const currentLanguage = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const handleSelectLanguage = (language: Language) => {
    setLanguage(language);
    changeLanguage(language);
    if (ref && 'current' in ref && ref.current) {
      ref.current.dismiss();
    }
  };

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1a1a1a' }}
      handleIndicatorStyle={{ backgroundColor: '#525252' }}
    >
      <BottomSheetView style={{ paddingBottom: 32 }}>
        <View className="px-4 pb-2 border-b border-surfaceHover">
          <Text className="text-textPrimary text-lg font-semibold">
            {t('languagePicker.title')}
          </Text>
          <Text className="text-textSecondary text-sm mt-1">
            {t('languagePicker.description')}
          </Text>
        </View>

        <View className="pt-2">
          {SUPPORTED_LANGUAGES.map((language) => (
            <Pressable
              key={language}
              className="flex-row items-center px-4 py-4 active:bg-surfaceHover"
              onPress={() => handleSelectLanguage(language)}
            >
              <Text className="text-2xl mr-3">{LANGUAGE_FLAGS[language]}</Text>
              <Text className="flex-1 text-textPrimary text-base">
                {LANGUAGE_NAMES[language]}
              </Text>
              {currentLanguage === language && (
                <Check size={20} color="#8b5cf6" />
              )}
            </Pressable>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

LanguagePicker.displayName = 'LanguagePicker';
