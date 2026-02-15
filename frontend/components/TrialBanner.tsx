import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, ChevronRight } from 'lucide-react-native';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { Paywall } from '@/components/Paywall';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

const TRIAL_DURATION_DAYS = 14;

export function TrialBanner() {
  const { t } = useTranslation();
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);

  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const isTestPro = useSubscriptionStore((state) => state.isTestPro);
  const isInTrial = useSubscriptionStore((state) => state.isInTrial);
  const trialDaysRemaining = useSubscriptionStore((state) => state.trialDaysRemaining);

  if (isPremium || isTestPro) {
    return null;
  }

  const trialExpired = !isInTrial && trialDaysRemaining <= 0;
  const progressRatio = isInTrial
    ? Math.max(0, Math.min(1, (TRIAL_DURATION_DAYS - trialDaysRemaining) / TRIAL_DURATION_DAYS))
    : 1;

  const handleBannerPress = () => {
    setIsPaywallVisible(true);
  };

  if (trialExpired) {
    return (
      <>
        <Pressable style={styles.expiredBanner} onPress={handleBannerPress}>
          <Crown size={16} color={Colors.primary} />
          <Text style={styles.expiredText}>
            {t('trial.expired')}
          </Text>
          <View style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>
              {t('trial.upgrade')}
            </Text>
            <ChevronRight size={14} color={Colors.textInverse} />
          </View>
        </Pressable>

        <Modal
          visible={isPaywallVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsPaywallVisible(false)}
        >
          <Paywall onClose={() => setIsPaywallVisible(false)} reason="contact_limit" />
        </Modal>
      </>
    );
  }

  if (isInTrial) {
    return (
      <>
        <Pressable style={styles.trialBanner} onPress={handleBannerPress}>
          <View style={styles.trialContent}>
            <Crown size={14} color={Colors.primary} />
            <Text style={styles.trialText}>
              {t('trial.daysRemaining', { count: trialDaysRemaining })}
            </Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
          </View>
        </Pressable>

        <Modal
          visible={isPaywallVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsPaywallVisible(false)}
        >
          <Paywall onClose={() => setIsPaywallVisible(false)} reason="contact_limit" />
        </Modal>
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  trialBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs + 2,
  },
  trialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trialText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  expiredBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expiredText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textInverse,
  },
});
