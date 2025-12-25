import { View, Text, ScrollView, Linking, Pressable } from 'react-native';
import { forwardRef, useCallback } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Shield, Database, Lock, Server, Mail, ExternalLink } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export const LegalNoticesSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@recall.app');
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['85%']}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1a1a1a' }}
      handleIndicatorStyle={{ backgroundColor: '#525252' }}
    >
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pb-4 border-b border-surfaceHover">
          <Text className="text-textPrimary text-lg font-semibold">
            {t('profile.legal.title')}
          </Text>
        </View>

        <View className="p-4">
          {/* Privacy First Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-violet-500/20 rounded-full items-center justify-center mr-3">
                <Shield size={20} color="#8b5cf6" />
              </View>
              <Text className="text-textPrimary text-base font-semibold flex-1">
                {t('profile.legal.privacyFirst.title')}
              </Text>
            </View>
            <Text className="text-textSecondary text-sm leading-5 ml-13">
              {t('profile.legal.privacyFirst.description')}
            </Text>
          </View>

          {/* Local Storage Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-emerald-500/20 rounded-full items-center justify-center mr-3">
                <Database size={20} color="#10b981" />
              </View>
              <Text className="text-textPrimary text-base font-semibold flex-1">
                {t('profile.legal.localStorage.title')}
              </Text>
            </View>
            <Text className="text-textSecondary text-sm leading-5 ml-13">
              {t('profile.legal.localStorage.description')}
            </Text>
          </View>

          {/* Data Sovereignty Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-blue-500/20 rounded-full items-center justify-center mr-3">
                <Lock size={20} color="#3b82f6" />
              </View>
              <Text className="text-textPrimary text-base font-semibold flex-1">
                {t('profile.legal.dataSovereignty.title')}
              </Text>
            </View>
            <Text className="text-textSecondary text-sm leading-5 ml-13">
              {t('profile.legal.dataSovereignty.description')}
            </Text>
          </View>

          {/* AI Processing Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-amber-500/20 rounded-full items-center justify-center mr-3">
                <Server size={20} color="#f59e0b" />
              </View>
              <Text className="text-textPrimary text-base font-semibold flex-1">
                {t('profile.legal.aiProcessing.title')}
              </Text>
            </View>
            <Text className="text-textSecondary text-sm leading-5 ml-13">
              {t('profile.legal.aiProcessing.description')}
            </Text>
          </View>

          {/* Contact Section */}
          <View className="mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-rose-500/20 rounded-full items-center justify-center mr-3">
                <Mail size={20} color="#f43f5e" />
              </View>
              <Text className="text-textPrimary text-base font-semibold flex-1">
                {t('profile.legal.contact.title')}
              </Text>
            </View>
            <Text className="text-textSecondary text-sm leading-5 ml-13 mb-2">
              {t('profile.legal.contact.description')}
            </Text>
            <Pressable
              className="ml-13 flex-row items-center"
              onPress={handleEmailPress}
            >
              <Text className="text-primary text-sm font-medium mr-1">
                support@recall.app
              </Text>
              <ExternalLink size={14} color="#8b5cf6" />
            </Pressable>
          </View>

          {/* Version Info */}
          <View className="mt-6 pt-4 border-t border-surfaceHover">
            <Text className="text-textMuted text-xs text-center">
              {t('profile.legal.lastUpdated')}
            </Text>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

LegalNoticesSheet.displayName = 'LegalNoticesSheet';
