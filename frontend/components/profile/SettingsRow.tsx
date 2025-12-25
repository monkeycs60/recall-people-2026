import { View, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ReactNode } from 'react';

type SettingsRowProps = {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
};

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  destructive = false,
}: SettingsRowProps) {
  return (
    <Pressable
      className="flex-row items-center px-4 py-3.5 border-b border-surfaceHover last:border-b-0 active:bg-surfaceHover"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="w-8 items-center">
        {icon}
      </View>
      <Text
        className={`flex-1 ml-3 text-base ${destructive ? 'text-red-500' : 'text-textPrimary'}`}
      >
        {label}
      </Text>
      {value && (
        <Text className="text-textSecondary mr-2">{value}</Text>
      )}
      {showChevron && onPress && (
        <ChevronRight size={20} color="#71717a" />
      )}
    </Pressable>
  );
}
