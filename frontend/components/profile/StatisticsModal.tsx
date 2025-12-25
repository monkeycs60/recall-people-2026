import { View, Text, Pressable, Modal } from 'react-native';
import { X, Users, FolderOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useContactsStore } from '@/stores/contacts-store';
import { useGroupsStore } from '@/stores/groups-store';

type StatisticsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function StatisticsModal({ visible, onClose }: StatisticsModalProps) {
  const { t } = useTranslation();
  const contacts = useContactsStore((state) => state.contacts);
  const groups = useGroupsStore((state) => state.groups);

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
              {t('profile.statistics.title')}
            </Text>
            <Pressable onPress={onClose} className="p-1">
              <X size={24} color="#a1a1aa" />
            </Pressable>
          </View>

          <View className="p-4 pb-8">
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
        </View>
      </View>
    </Modal>
  );
}
