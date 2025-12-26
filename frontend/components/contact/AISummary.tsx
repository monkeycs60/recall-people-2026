import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type AISummaryProps = {
  summary?: string;
  isLoading?: boolean;
  firstName: string;
};

export function AISummary({ summary, isLoading, firstName }: AISummaryProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('contact.aiSummary.loading')}</Text>
        </View>
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
        <Sparkles size={16} color={Colors.secondary} />
        <Text style={styles.headerText}>{t('contact.aiSummary.header', { firstName })}</Text>
      </View>
      <Text style={styles.contextHeader}>
        {t('contact.aiSummary.contextHeader', { firstName })}
      </Text>
      <Text style={styles.summaryText}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginLeft: 6,
  },
  contextHeader: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  loadingContainer: {
    backgroundColor: `${Colors.surface}80`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  emptyContainer: {
    backgroundColor: `${Colors.surface}50`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
