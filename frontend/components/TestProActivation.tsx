import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Crown, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { checkProWhitelist } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { showSuccessToast } from '@/lib/error-handler';

type TestProActivationProps = {
  onClose: () => void;
  onNotWhitelisted: () => void;
};

export function TestProActivation({ onClose, onNotWhitelisted }: TestProActivationProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isChecking, setIsChecking] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const user = useAuthStore((state) => state.user);
  const activateTestPro = useSubscriptionStore((state) => state.activateTestPro);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const isTestPro = useSubscriptionStore((state) => state.isTestPro);

  useEffect(() => {
    checkWhitelist();
  }, []);

  const checkWhitelist = async () => {
    setIsChecking(true);
    setDebugInfo(`Checking whitelist for: ${user?.email || 'no email'}`);

    try {
      const whitelisted = await checkProWhitelist();
      setIsWhitelisted(whitelisted);
      setDebugInfo((prev) => `${prev}\nAPI response: isWhitelisted=${whitelisted}`);

      if (!whitelisted) {
        setTimeout(() => {
          onNotWhitelisted();
        }, 2000);
      }
    } catch (error) {
      setDebugInfo((prev) => `${prev}\nError: ${error}`);
      setIsWhitelisted(false);
      setTimeout(() => {
        onNotWhitelisted();
      }, 2000);
    } finally {
      setIsChecking(false);
    }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    activateTestPro();
    showSuccessToast(t('testPro.activated'));

    setTimeout(() => {
      setIsActivating(false);
      onClose();
    }, 500);
  };

  if (isChecking) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('testPro.checking')}</Text>
        </View>
      </View>
    );
  }

  if (isWhitelisted === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.content}>
          <AlertCircle size={48} color={Colors.warning} style={styles.icon} />
          <Text style={styles.title}>{t('testPro.notWhitelisted')}</Text>
          <Text style={styles.subtitle}>{user?.email}</Text>
          <Text style={styles.redirectText}>{t('testPro.redirecting')}</Text>
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>{debugInfo}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (isPremium || isTestPro) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.content}>
          <CheckCircle2 size={48} color={Colors.success} style={styles.icon} />
          <Text style={styles.title}>{t('testPro.alreadyActive')}</Text>
          <Text style={styles.subtitle}>{t('testPro.enjoyFeatures')}</Text>
          <Pressable style={styles.activateButton} onPress={onClose}>
            <Text style={styles.activateButtonText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Crown size={48} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>{t('testPro.title')}</Text>
        <Text style={styles.subtitle}>{t('testPro.subtitle')}</Text>

        <View style={styles.emailBadge}>
          <CheckCircle2 size={16} color={Colors.success} />
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>{t('testPro.features')}</Text>
          <Text style={styles.featureItem}>{t('paywall.features.unlimitedNotes')}</Text>
          <Text style={styles.featureItem}>{t('paywall.features.longerRecordings')}</Text>
          <Text style={styles.featureItem}>{t('paywall.features.aiSearch')}</Text>
        </View>

        <Pressable
          style={styles.activateButton}
          onPress={handleActivate}
          disabled={isActivating}
        >
          {isActivating ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.activateButtonText}>{t('testPro.activate')}</Text>
          )}
        </Pressable>

        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>{debugInfo}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surfaceHover,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  redirectText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 16,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
  },
  emailText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
  },
  features: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featureItem: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 8,
    paddingLeft: 8,
  },
  activateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  activateButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  debugContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textMuted,
  },
});
