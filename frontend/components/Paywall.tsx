import { View, Text, Pressable, ActivityIndicator, StyleSheet, BackHandler, Linking, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Crown, AlertCircle, RefreshCw } from 'lucide-react-native';
import { PurchasesOffering } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { revenueCatService } from '@/services/revenuecat.service';
import { Colors } from '@/constants/theme';
import { showErrorToast, showSuccessToast } from '@/lib/error-handler';

const TERMS_URL = 'https://recall-people-2026.vercel.app/terms';
const PRIVACY_URL = 'https://recall-people-2026.vercel.app/privacy';

type PaywallReason = 'ai_search' | 'recording_duration' | 'ai_assistant' | 'avatar_generation' | 'contact_limit' | 'proactive_reminders';

type PaywallProps = {
  onClose: () => void;
  reason?: PaywallReason;
};

export function Paywall({ onClose, reason = 'contact_limit' }: PaywallProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('$rc_annual');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  useEffect(() => {
    const handleBackPress = () => {
      if (!isPurchasing) {
        onClose();
        return true;
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [isPurchasing, onClose]);

  const loadOfferings = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const currentOffering = await revenueCatService.getOfferings();
      if (!currentOffering) {
        setLoadError(true);
      }
      setOffering(currentOffering);
    } catch (error) {
      console.error('[Paywall] Load offerings error:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!offering) return;

    setIsPurchasing(true);
    try {
      const success = await revenueCatService.purchasePackage(selectedPackage);
      if (success) {
        showSuccessToast(t('common.success'));
        onClose();
      } else {
        showErrorToast(
          t('paywall.errors.purchaseFailed'),
          t('paywall.errors.purchaseFailedDescription')
        );
      }
    } catch (error) {
      console.error('[Paywall] Purchase error:', error);
      showErrorToast(
        t('paywall.errors.purchaseFailed'),
        t('paywall.errors.purchaseFailedDescription')
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const success = await revenueCatService.restorePurchases();
      if (success) {
        showSuccessToast(t('common.success'));
        onClose();
      } else {
        showErrorToast(
          t('paywall.errors.restoreFailed'),
          t('paywall.errors.restoreFailedDescription')
        );
      }
    } catch (error) {
      console.error('[Paywall] Restore error:', error);
      showErrorToast(
        t('paywall.errors.restoreFailed'),
        t('paywall.errors.restoreFailedDescription')
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const openTerms = useCallback(() => {
    Linking.openURL(TERMS_URL);
  }, []);

  const openPrivacy = useCallback(() => {
    Linking.openURL(PRIVACY_URL);
  }, []);

  const getReasonText = () => {
    switch (reason) {
      case 'ai_search':
        return t('paywall.reason.aiSearch');
      case 'recording_duration':
        return t('paywall.reason.recordingDuration');
      case 'ai_assistant':
        return t('paywall.reason.aiAssistant');
      case 'avatar_generation':
        return t('paywall.reason.avatarGeneration');
      case 'contact_limit':
        return t('paywall.reason.contactLimit');
      case 'proactive_reminders':
        return t('paywall.reason.proactiveReminders');
      default:
        return '';
    }
  };

  const features = [
    t('paywall.features.unlimitedContacts'),
    t('paywall.features.longerRecordings'),
    t('paywall.features.unlimitedAI'),
    t('paywall.features.smartReminders'),
    t('paywall.features.weeklyDigest'),
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (loadError || !offering) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={Colors.textSecondary} />
          <Text style={styles.errorText}>{t('paywall.loadError')}</Text>
          <Pressable style={styles.retryButton} onPress={loadOfferings}>
            <RefreshCw size={18} color={Colors.primary} />
            <Text style={styles.retryButtonText}>{t('paywall.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const monthlyPackage = offering.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_monthly'
  );
  const annualPackage = offering.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_annual'
  );

  const hasOfferings = monthlyPackage || annualPackage;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Crown size={48} color={Colors.primary} style={styles.icon} />
        <Text style={styles.title}>{t('paywall.title')}</Text>
        <Text style={styles.reason}>{getReasonText()}</Text>

        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={20} color={Colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.packages}>
          {annualPackage && (
            <Pressable
              style={[
                styles.packageCard,
                selectedPackage === '$rc_annual' && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage('$rc_annual')}
            >
              <View style={styles.packageBadge}>
                <Text style={styles.packageBadgeText}>{t('paywall.bestValue')}</Text>
              </View>
              <Text style={styles.packageTitle}>{t('paywall.annual')}</Text>
              <Text style={styles.packagePrice}>
                {annualPackage.product.priceString}
              </Text>
              <Text style={styles.packagePeriod}>{t('paywall.perYear')}</Text>
              <Text style={styles.packageSaving}>{t('paywall.save30')}</Text>
              <Text style={styles.autoRenewLabel}>{t('paywall.autoRenews')}</Text>
            </Pressable>
          )}

          {monthlyPackage && (
            <Pressable
              style={[
                styles.packageCard,
                selectedPackage === '$rc_monthly' && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage('$rc_monthly')}
            >
              <Text style={styles.packageTitle}>{t('paywall.monthly')}</Text>
              <Text style={styles.packagePrice}>
                {monthlyPackage.product.priceString}
              </Text>
              <Text style={styles.packagePeriod}>{t('paywall.perMonth')}</Text>
              <Text style={styles.autoRenewLabel}>{t('paywall.autoRenews')}</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={[
            styles.purchaseButton,
            (!hasOfferings || isPurchasing) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing || !hasOfferings}
        >
          {isPurchasing ? (
            <ActivityIndicator color={Colors.textInverse} />
          ) : (
            <Text style={styles.purchaseButtonText}>{t('paywall.subscribe')}</Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={isPurchasing}>
          <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
        </Pressable>

        <View style={styles.legalContainer}>
          <Text style={styles.legalText}>
            {t('paywall.subscriptionTerms')}
          </Text>
          <View style={styles.legalLinksRow}>
            <Pressable onPress={openTerms} hitSlop={8}>
              <Text style={styles.legalLink}>{t('paywall.termsOfUse')}</Text>
            </Pressable>
            <Text style={styles.legalSeparator}>{t('paywall.and')}</Text>
            <Pressable onPress={openPrivacy} hitSlop={8}>
              <Text style={styles.legalLink}>{t('paywall.privacyPolicy')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 32,
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
  reason: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  packages: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  packageBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  packageBadgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  packageTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  packagePeriod: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  packageSaving: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 4,
  },
  autoRenewLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  purchaseButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  restoreText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  legalContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legalLink: {
    fontSize: 11,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
