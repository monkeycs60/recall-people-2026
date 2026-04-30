import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BookOpenText, RefreshCw } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

type AISummaryProps = {
  summary?: string;
  isLoading?: boolean;
  isRegenerating?: boolean;
  firstName: string;
  onRegenerate?: () => void;
};

export function AISummary({ summary, isLoading, isRegenerating, firstName, onRegenerate }: AISummaryProps) {
  const { t } = useTranslation();
  const isBusy = isLoading || isRegenerating;

  if (isBusy) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BookOpenText size={16} color={Colors.primary} strokeWidth={2.1} />
            <Text style={styles.headerText}>{t('contact.aiSummary.header', { firstName })}</Text>
          </View>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
        <View style={styles.skeletonBlock}>
          <View style={[styles.skeletonLine, styles.skeletonLineFull]} />
          <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
        <Text style={styles.loadingText}>{t('contact.aiSummary.loading')}</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t('contact.aiSummary.empty', { firstName })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BookOpenText size={16} color={Colors.primary} strokeWidth={2.1} />
          <Text style={styles.headerText}>{t('contact.aiSummary.header', { firstName })}</Text>
        </View>
        {onRegenerate && (
          <Pressable
            style={styles.regenerateButton}
            onPress={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <RefreshCw size={15} color={Colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
      <Text style={styles.summaryText}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  headerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  regenerateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  summaryText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
  },
  skeletonBlock: {
    gap: 9,
    paddingTop: 4,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
  },
  skeletonLineFull: {
    width: '100%',
  },
  skeletonLineWide: {
    width: '86%',
  },
  skeletonLineShort: {
    width: '62%',
  },
  emptyContainer: {
    backgroundColor: `${Colors.surface}50`,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.hairline,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
