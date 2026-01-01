import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Crown, Sparkles, Mic, Search, ChevronRight } from 'lucide-react-native';
import { useSubscriptionStore, FREE_NOTES_PER_MONTH } from '@/stores/subscription-store';
import { Colors } from '@/constants/theme';

type SubscriptionCardProps = {
  onUpgrade: () => void;
  onManage: () => void;
};

export function SubscriptionCard({ onUpgrade, onManage }: SubscriptionCardProps) {
  const { t } = useTranslation();
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const notesCreatedThisMonth = useSubscriptionStore((state) => state.notesCreatedThisMonth);

  if (isPremium) {
    return (
      <Pressable style={styles.premiumCard} onPress={onManage}>
        <View style={styles.premiumHeader}>
          <View style={styles.premiumBadge}>
            <Crown size={16} color={Colors.background} />
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </View>
          <ChevronRight size={20} color={Colors.primary} />
        </View>
        <Text style={styles.premiumTitle}>{t('subscription.premiumTitle')}</Text>
        <Text style={styles.premiumSubtitle}>{t('subscription.premiumSubtitle')}</Text>
        <View style={styles.premiumFeatures}>
          <View style={styles.featureItem}>
            <Mic size={16} color={Colors.primary} />
            <Text style={styles.featureText}>{t('subscription.unlimitedNotes')}</Text>
          </View>
          <View style={styles.featureItem}>
            <Search size={16} color={Colors.primary} />
            <Text style={styles.featureText}>{t('subscription.aiSearch')}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  const notesRemaining = FREE_NOTES_PER_MONTH - notesCreatedThisMonth;
  const progressPercent = (notesCreatedThisMonth / FREE_NOTES_PER_MONTH) * 100;

  return (
    <View style={styles.freeCard}>
      <View style={styles.freeHeader}>
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>{t('subscription.freePlan')}</Text>
        </View>
        <Text style={styles.quotaText}>
          {notesCreatedThisMonth}/{FREE_NOTES_PER_MONTH} {t('subscription.notesUsed')}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.remainingText}>
          {notesRemaining > 0
            ? t('subscription.notesRemaining', { count: notesRemaining })
            : t('subscription.noNotesRemaining')}
        </Text>
      </View>

      <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
        <Sparkles size={18} color={Colors.background} />
        <Text style={styles.upgradeButtonText}>{t('subscription.upgradeToPro')}</Text>
      </Pressable>

      <View style={styles.upgradeFeatures}>
        <Text style={styles.upgradeFeaturesTitle}>{t('subscription.unlockWith')}</Text>
        <View style={styles.upgradeFeaturesList}>
          <Text style={styles.upgradeFeatureItem}>{t('subscription.feature1')}</Text>
          <Text style={styles.upgradeFeatureItem}>{t('subscription.feature2')}</Text>
          <Text style={styles.upgradeFeatureItem}>{t('subscription.feature3')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Premium card styles
  premiumCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 12,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  premiumFeatures: {
    flexDirection: 'row',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Free card styles
  freeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  freeBadge: {
    backgroundColor: Colors.surfaceHover,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freeBadgeText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  quotaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBackground: {
    height: 8,
    backgroundColor: Colors.surfaceHover,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  remainingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  upgradeFeatures: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  upgradeFeaturesTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  upgradeFeaturesList: {
    gap: 4,
  },
  upgradeFeatureItem: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
