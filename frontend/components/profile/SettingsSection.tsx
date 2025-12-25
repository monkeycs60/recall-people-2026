import { View, Text } from 'react-native';
import { ReactNode } from 'react';

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
};

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mb-6">
      <Text className="text-textSecondary text-xs uppercase tracking-wider mb-2 px-1">
        {title}
      </Text>
      <View className="bg-surface rounded-xl overflow-hidden">
        {children}
      </View>
    </View>
  );
}
