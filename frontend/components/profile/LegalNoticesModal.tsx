import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { X, Shield, FileText, Mail } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type LegalNoticesModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function LegalNoticesModal({ visible, onClose }: LegalNoticesModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-background rounded-t-3xl max-h-[80%]">
          <View className="flex-row items-center justify-between p-4 border-b border-surfaceHover">
            <Text className="text-textPrimary text-lg font-semibold">
              {t('profile.legal.title')}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={24} color="#a1a1aa" />
            </Pressable>
          </View>

          <ScrollView className="p-4 pb-8">
            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <Shield size={20} color="#8b5cf6" />
                <Text className="text-textPrimary text-base font-semibold ml-2">
                  {t('profile.legal.privacy')}
                </Text>
              </View>
              <Text className="text-textSecondary text-sm leading-5">
                {t('profile.legal.privacyText')}
              </Text>
            </View>

            <View className="mb-6">
              <View className="flex-row items-center mb-2">
                <FileText size={20} color="#8b5cf6" />
                <Text className="text-textPrimary text-base font-semibold ml-2">
                  {t('profile.legal.terms')}
                </Text>
              </View>
              <Text className="text-textSecondary text-sm leading-5">
                {t('profile.legal.termsText')}
              </Text>
            </View>

            <View className="mb-8">
              <View className="flex-row items-center mb-2">
                <Mail size={20} color="#8b5cf6" />
                <Text className="text-textPrimary text-base font-semibold ml-2">
                  {t('profile.legal.contact')}
                </Text>
              </View>
              <Text className="text-textSecondary text-sm leading-5">
                {t('profile.legal.contactText')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
