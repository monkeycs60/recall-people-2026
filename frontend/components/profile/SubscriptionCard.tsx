import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Sparkles } from 'lucide-react-native';
import { useSubscriptionStore, FREE_CONTACTS_LIMIT } from '@/stores/subscription-store';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { Colors, Shadows, Fonts } from '@/constants/theme';

type SubscriptionCardProps = {
  onUpgrade: () => void;
  onManage: () => void;
};

export function SubscriptionCard({ onUpgrade, onManage }: SubscriptionCardProps) {
  const { t } = useTranslation();
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const { contacts } = useContactsQuery();
  const contactCount = contacts.length;

  if (isPremium) {
    return (
      <Pressable onPress={onManage}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCard}
        >
          <View style={styles.glowCircle} />
          <View style={styles.premiumHeader}>
            <View style={styles.premiumBadge}>
              <Crown size={14} color="#FFFFFF" />
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.premiumTitle}>{t('subscription.premiumTitle')}</Text>
          <Text style={styles.premiumSubtitle}>{t('subscription.premiumSubtitle')}</Text>
          <View style={styles.premiumFeatures}>
            {[t('subscription.unlimitedContacts'), t('subscription.aiSearch'), t('subscription.feature3')].map((feature) => (
              <View key={feature} style={styles.featureChip}>
                <Text style={styles.featureChipText}>{feature}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  const contactsRemaining = FREE_CONTACTS_LIMIT - contactCount;
  const progressPercent = Math.min((contactCount / FREE_CONTACTS_LIMIT) * 100, 100);

  return (
    <View style={styles.freeCard}>
      <View style={styles.freeHeader}>
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>{t('subscription.freePlan')}</Text>
        </View>
        <Text style={styles.quotaText}>
          {contactCount}/{FREE_CONTACTS_LIMIT} {t('subscription.contactsUsed')}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.remainingText}>
          {contactsRemaining > 0
            ? t('subscription.contactsRemaining', { count: contactsRemaining })
            : t('subscription.noContactsRemaining')}
        </Text>
      </View>

      <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
        <Sparkles size={18} color={Colors.background} />
        <Text style={styles.upgradeButtonText}>{t('subscription.upgradeToPro')}</Text>
      </Pressable>

      <View style={styles.upgradeFeatures}>
        <Text style={styles.upgradeFeaturesTitle}>{t('subscription.unlockWith')}</Text>
        <View style={styles.upgradeFeaturesList}>
          {[
            t('subscription.feature1'),
            t('subscription.feature2'),
            t('subscription.feature3'),
            t('subscription.feature4'),
            t('subscription.feature5'),
            t('subscription.feature6'),
          ].map((feature) => (
            <Text key={feature} style={styles.upgradeFeatureItem}>{feature}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  premiumCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  premiumTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 14,
  },
  premiumFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  featureChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },

  freeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    ...Shadows.card,
  },
  freeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  freeBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
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
    backgroundColor: Colors.surfaceAlt,
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
    borderRadius: 14,
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  upgradeFeatures: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
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
