import { View, Text, Pressable, StyleSheet } from 'react-native';
import { RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';

type RetryProcessingCardProps = {
  onRetry: () => void;
  onDiscard: () => void;
};

export const RetryProcessingCard = ({ onRetry, onDiscard }: RetryProcessingCardProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <ShieldCheck size={26} color={Colors.mint} strokeWidth={2.2} />
      </View>

      <Text style={styles.title}>{t('recording.retry.title')}</Text>
      <Text style={styles.subtitle}>{t('recording.retry.subtitle')}</Text>

      <Pressable style={styles.primaryButton} onPress={onRetry}>
        <RefreshCw size={17} color={Colors.textInverse} strokeWidth={2.4} />
        <Text style={styles.primaryButtonText}>{t('recording.retry.retryButton')}</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={onDiscard}>
        <Text style={styles.secondaryButtonText}>{t('recording.retry.discardButton')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.sans.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    paddingVertical: 15,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    color: Colors.textInverse,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    color: Colors.textMuted,
  },
});
