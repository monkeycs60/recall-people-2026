import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

type ProfileHeaderProps = {
  name: string;
  email: string;
  provider?: 'credentials' | 'google';
};

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  google: 'Google',
};

export function ProfileHeader({ name, email, provider }: ProfileHeaderProps) {
  const { t } = useTranslation();

  const showProvider = provider && provider !== 'credentials';
  const providerDisplayName = provider ? PROVIDER_DISPLAY_NAMES[provider] : null;

  return (
    <View className="bg-surface rounded-xl p-4 mb-6">
      <Text className="text-textPrimary text-xl font-semibold">
        {name}
      </Text>
      <Text className="text-textSecondary mt-1">
        {email}
      </Text>
      {showProvider && providerDisplayName && (
        <View className="flex-row items-center mt-2">
          <Check size={16} color="#22c55e" />
          <Text className="text-green-500 ml-1.5 text-sm">
            {t('profile.connectedWith', { provider: providerDisplayName })}
          </Text>
        </View>
      )}
    </View>
  );
}
