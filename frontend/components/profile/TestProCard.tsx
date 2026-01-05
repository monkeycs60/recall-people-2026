import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Crown, Zap, ZapOff } from 'lucide-react-native';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { Colors } from '@/constants/theme';

export function TestProCard() {
  const { t } = useTranslation();
  const isTestPro = useSubscriptionStore((state) => state.isTestPro);
  const activateTestPro = useSubscriptionStore((state) => state.activateTestPro);
  const deactivateTestPro = useSubscriptionStore((state) => state.deactivateTestPro);

  const handleToggle = () => {
    if (isTestPro) {
      deactivateTestPro();
    } else {
      activateTestPro();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Crown size={14} color={Colors.warning} />
          <Text style={styles.badgeText}>{t('testPro.badge')}</Text>
        </View>
      </View>

      <Text style={styles.title}>{t('testPro.title')}</Text>
      <Text style={styles.description}>{t('testPro.description')}</Text>

      <Pressable
        style={[styles.button, isTestPro ? styles.buttonDeactivate : styles.buttonActivate]}
        onPress={handleToggle}
      >
        {isTestPro ? (
          <>
            <ZapOff size={18} color={Colors.background} />
            <Text style={styles.buttonText}>{t('testPro.deactivate')}</Text>
          </>
        ) : (
          <>
            <Zap size={18} color={Colors.background} />
            <Text style={styles.buttonText}>{t('testPro.activate')}</Text>
          </>
        )}
      </Pressable>

      {isTestPro && (
        <View style={styles.activeIndicator}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>{t('testPro.active')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Colors.warning}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.warning,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonActivate: {
    backgroundColor: Colors.warning,
  },
  buttonDeactivate: {
    backgroundColor: Colors.textMuted,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  activeText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '500',
  },
});
