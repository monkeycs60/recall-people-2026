import { View, Text, Pressable, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Crown } from 'lucide-react-native';
import { PurchasesOffering } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { revenueCatService } from '@/services/revenuecat.service';
import { Colors } from '@/constants/theme';
import { showErrorToast, showSuccessToast } from '@/lib/error-handler';

type PaywallProps = {
  onClose: () => void;
  reason?: 'notes_limit' | 'ai_search' | 'recording_duration' | 'ai_assistant';
};

export function Paywall({ onClose, reason = 'notes_limit' }: PaywallProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('$rc_annual');

  useEffect(() => {
    loadOfferings();
  }, []);

  // Handle hardware back button to close paywall
  useEffect(() => {
    const handleBackPress = () => {
      if (!isPurchasing) {
        onClose();
        return true;
      }
      return true; // Block back while purchasing
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [isPurchasing, onClose]);

  const loadOfferings = async () => {
    setIsLoading(true);
    try {
      const currentOffering = await revenueCatService.getOfferings();
      if (!currentOffering) {
        showErrorToast(
          t('paywall.errors.noOfferingsAvailable'),
          t('paywall.errors.loadingFailed')
        );
      }
      setOffering(currentOffering);
    } catch (error) {
      console.error('[Paywall] Load offerings error:', error);
      showErrorToast(
        t('paywall.errors.noOfferingsAvailable'),
        t('paywall.errors.loadingFailed')
      );
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

  const getReasonText = () => {
    switch (reason) {
      case 'notes_limit':
        return t('paywall.reason.notesLimit');
      case 'ai_search':
        return t('paywall.reason.aiSearch');
      case 'recording_duration':
        return t('paywall.reason.recordingDuration');
      case 'ai_assistant':
        return t('paywall.reason.aiAssistant');
      default:
        return '';
    }
  };

  const features = [
    t('paywall.features.unlimitedNotes'),
    t('paywall.features.longerRecordings'),
    t('paywall.features.aiSearch'),
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
        </View>
      </View>
    );
  }

  const monthlyPackage = offering?.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_monthly'
  );
  const annualPackage = offering?.availablePackages.find(
    (pkg) => pkg.identifier === '$rc_annual'
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.content}>
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
                {annualPackage.product.priceString}/{t('paywall.year')}
              </Text>
              <Text style={styles.packageSaving}>{t('paywall.save30')}</Text>
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
                {monthlyPackage.product.priceString}/{t('paywall.month')}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={styles.purchaseButton}
          onPress={handlePurchase}
          disabled={isPurchasing}
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
    borderRadius: 16,
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
  packageSaving: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 4,
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
  purchaseButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
  },
  restoreText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
