import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type ProfileHeaderProps = {
  name: string;
  email: string;
  provider?: string;
};

export function ProfileHeader({ name, email, provider }: ProfileHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="bg-surface rounded-xl p-4 mb-6">
      <Text className="text-textPrimary text-xl font-semibold">
        {name}
      </Text>
      <Text className="text-textSecondary mt-1">
        {email}
      </Text>
      {provider && (
        <View className="flex-row items-center mt-2">
          <Check size={16} color="#22c55e" />
          <Text className="text-green-500 ml-1.5 text-sm">
            {t('profile.connectedWith', { provider })}
          </Text>
        </View>
      )}
    </View>
  );
}
