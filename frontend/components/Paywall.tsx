import { View, Text, Pressable, ActivityIndicator, StyleSheet, BackHandler, Linking, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle, RefreshCw, Check, Minus, Sparkles } from 'lucide-react-native';
import { PACKAGE_TYPE, PurchasesOffering } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { revenueCatService } from '@/services/revenuecat.service';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { showErrorToast, showSuccessToast } from '@/lib/error-handler';
import { useAuthStore } from '@/stores/auth-store';

const TERMS_URL = 'https://recall-people-2026.vercel.app/terms';
const PRIVACY_URL = 'https://recall-people-2026.vercel.app/privacy';

type PaywallReason = 'ai_search' | 'recording_duration' | 'ai_assistant' | 'contact_limit' | 'proactive_reminders';

type ComparisonRow = {
  label: string;
  free: string;
  pro: string;
  isBoolean?: boolean;
};

type PaywallProps = {
  onClose: () => void;
  reason?: PaywallReason;
};

export function Paywall({ onClose, reason = 'contact_limit' }: PaywallProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.user?.id);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('$rc_annual');
  const [loadError, setLoadError] = useState(false);

  const loadOfferings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const currentOffering = await revenueCatService.getOfferings(userId);
      const preferredPackage = currentOffering.availablePackages.find(
        (pkg) => pkg.packageType === PACKAGE_TYPE.ANNUAL || pkg.identifier === '$rc_annual'
      ) ?? currentOffering.availablePackages.find(
        (pkg) => pkg.packageType === PACKAGE_TYPE.MONTHLY || pkg.identifier === '$rc_monthly'
      );

      if (preferredPackage) {
        setSelectedPackage(preferredPackage.identifier);
      }
      setOffering(currentOffering);
    } catch (error) {
      console.error('[Paywall] Load offerings error:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

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
      case 'contact_limit':
        return t('paywall.reason.contactLimit');
      case 'proactive_reminders':
        return t('paywall.reason.proactiveReminders');
      default:
        return '';
    }
  };

  const unlimited = t('paywall.comparison.unlimited');
  const perMonth = t('paywall.comparison.perMonth');

  const comparisonRows: ComparisonRow[] = [
    { label: t('paywall.comparison.contacts'), free: '15', pro: unlimited },
    { label: t('paywall.comparison.recordings'), free: '1 min', pro: '3 min' },
    { label: t('paywall.comparison.aiAssistant'), free: `10${perMonth}`, pro: unlimited },
    { label: t('paywall.comparison.reminders'), free: '', pro: '', isBoolean: true },
    { label: t('paywall.comparison.digest'), free: '', pro: '', isBoolean: true },
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
    (pkg) => pkg.identifier === '$rc_monthly' || pkg.packageType === PACKAGE_TYPE.MONTHLY
  );
  const annualPackage = offering.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_annual' || pkg.packageType === PACKAGE_TYPE.ANNUAL
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
        <Text style={styles.title}>{t('paywall.title')}</Text>
        <View style={styles.titleAccent} />
        <Text style={styles.reason}>{getReasonText()}</Text>

        <View style={styles.comparisonCard}>
          <View style={styles.comparisonHeader}>
            <View style={styles.comparisonHeaderLabel} />
            <Text style={styles.comparisonHeaderFree}>{t('paywall.comparison.free')}</Text>
            <View style={styles.proBadge}>
              <Sparkles size={10} color={Colors.primary} />
              <Text style={styles.proBadgeText}>{t('paywall.comparison.pro')}</Text>
            </View>
          </View>

          {comparisonRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.comparisonRow,
                index % 2 === 1 && styles.comparisonRowAlt,
                index === comparisonRows.length - 1 && styles.comparisonRowLast,
              ]}
            >
              <Text style={styles.comparisonLabel}>{row.label}</Text>
              {row.isBoolean ? (
                <>
                  <View style={styles.comparisonFreeValue}>
                    <View style={styles.booleanMinus}>
                      <Minus size={10} color={Colors.textMuted} />
                    </View>
                  </View>
                  <View style={styles.comparisonProValue}>
                    <View style={styles.booleanCheck}>
                      <Check size={12} color={Colors.surface} strokeWidth={3} />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.comparisonFreeText}>{row.free}</Text>
                  <View style={styles.comparisonProValue}>
                    <View style={styles.proPill}>
                      <Text style={styles.proPillText}>{row.pro}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          ))}
        </View>

        <View style={styles.packages}>
          {annualPackage && (
            <Pressable
              style={[
                styles.packageCard,
                selectedPackage === annualPackage.identifier && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage(annualPackage.identifier)}
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
                selectedPackage === monthlyPackage.identifier && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage(monthlyPackage.identifier)}
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
    backgroundColor: Colors.surfaceAlt,
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
    borderRadius: 14,
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
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  titleAccent: {
    width: 40,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginBottom: 12,
  },
  reason: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 21,
  },
  comparisonCard: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginBottom: 28,
    overflow: 'hidden',
    ...Shadows.elevated,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surfaceAlt,
  },
  comparisonHeaderLabel: {
    flex: 1,
  },
  comparisonHeaderFree: {
    width: 64,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  proBadge: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  comparisonRowAlt: {
    backgroundColor: 'rgba(0,0,0,0.015)',
  },
  comparisonRowLast: {
    borderBottomWidth: 0,
  },
  comparisonLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  comparisonFreeValue: {
    width: 64,
    alignItems: 'center',
  },
  comparisonFreeText: {
    width: 64,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  comparisonProValue: {
    width: 80,
    alignItems: 'center',
  },
  proPill: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  proPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  booleanMinus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  booleanCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packages: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.hairline,
    ...Shadows.card,
  },
  packageCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    ...Shadows.fab,
  },
  packageBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  packageBadgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  packageTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 20,
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
    fontWeight: '600',
    color: Colors.success,
    marginTop: 4,
  },
  autoRenewLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 6,
  },
  purchaseButton: {
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    ...Shadows.fab,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
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
    color: Colors.textMuted,
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
