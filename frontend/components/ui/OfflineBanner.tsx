import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Colors, Spacing } from '@/constants/theme';

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      <WifiOff size={16} color={Colors.textInverse} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('errors.offline')}</Text>
        <Text style={styles.subtitle}>{t('errors.offlineDescription')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: Colors.textInverse,
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
});
