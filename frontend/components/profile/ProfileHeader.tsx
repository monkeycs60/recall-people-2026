import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

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

  const initials = name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{initials}</Text>
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  providerText: {
    fontSize: 13,
    color: Colors.success,
    marginLeft: 6,
  },
});
