import { View, Text, Pressable, Modal } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Language, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, LANGUAGE_FLAGS } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';

type LanguagePickerProps = {
  visible: boolean;
  onClose: () => void;
};

export function LanguagePicker({ visible, onClose }: LanguagePickerProps) {
  const { t } = useTranslation();
  const currentLanguage = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  const handleSelectLanguage = (language: Language) => {
    setLanguage(language);
    changeLanguage(language);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-background rounded-t-3xl">
          <View className="flex-row items-center justify-between p-4 border-b border-surfaceHover">
            <Text className="text-textPrimary text-lg font-semibold">
              {t('languagePicker.title')}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={24} color="#a1a1aa" />
            </Pressable>
          </View>

          <Text className="text-textSecondary text-sm px-4 py-2">
            {t('languagePicker.description')}
          </Text>

          <View className="pb-8">
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
        </View>
      </View>
    </Modal>
  );
}
