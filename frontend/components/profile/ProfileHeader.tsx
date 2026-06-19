import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import { UserAvatar } from './UserAvatar';

type ProfileHeaderProps = {
  name: string;
  email: string;
  provider?: 'credentials' | 'google' | 'apple';
  avatarUrl?: string;
  avatarCacheKey?: string;
  onAvatarPress?: () => void;
};

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
};

export function ProfileHeader({
  name,
  email,
  provider,
  avatarUrl,
  avatarCacheKey,
  onAvatarPress,
}: ProfileHeaderProps) {
  const { t } = useTranslation();

  const showProvider = provider && provider !== 'credentials';
  const providerDisplayName = provider ? PROVIDER_DISPLAY_NAMES[provider] : null;

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        <UserAvatar
          name={name}
          size={56}
          avatarUrl={avatarUrl}
          cacheKey={avatarCacheKey}
          onPress={onAvatarPress}
          showEditBadge={!!onAvatarPress}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        {showProvider && providerDisplayName && (
          <View style={styles.providerRow}>
            <Check size={14} color={Colors.success} />
            <Text style={styles.providerText}>
              {t('profile.connectedWith', { provider: providerDisplayName })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadows.card,
  },
  avatarWrapper: {},
  infoContainer: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  providerText: {
    fontSize: 12,
    color: Colors.success,
    marginLeft: 6,
  },
});
