import { View, Text } from 'react-native';
import { forwardRef, useCallback } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Users, FolderOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useContactsStore } from '@/stores/contacts-store';
import { useGroupsStore } from '@/stores/groups-store';

export const StatisticsSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();
  const contacts = useContactsStore((state) => state.contacts);
  const groups = useGroupsStore((state) => state.groups);

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
        <View className="px-4 pb-4 border-b border-surfaceHover">
          <Text className="text-textPrimary text-lg font-semibold">
            {t('profile.statistics.title')}
          </Text>
        </View>

        <View className="p-4">
          <View className="flex-row gap-4">
            <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
              <View className="w-12 h-12 bg-violet-500/20 rounded-full items-center justify-center mb-2">
                <Users size={24} color="#8b5cf6" />
              </View>
              <Text className="text-textPrimary text-3xl font-bold">
                {contacts.length}
              </Text>
              <Text className="text-textSecondary text-sm">
                {t('profile.statistics.contacts')}
              </Text>
            </View>

            <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
              <View className="w-12 h-12 bg-violet-500/20 rounded-full items-center justify-center mb-2">
                <FolderOpen size={24} color="#8b5cf6" />
              </View>
              <Text className="text-textPrimary text-3xl font-bold">
                {groups.length}
              </Text>
              <Text className="text-textSecondary text-sm">
                {t('profile.statistics.groups')}
              </Text>
            </View>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

StatisticsSheet.displayName = 'StatisticsSheet';
