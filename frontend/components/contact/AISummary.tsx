import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type AISummaryProps = {
  summary?: string;
  isLoading?: boolean;
};

export function AISummary({ summary, isLoading }: AISummaryProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Génération du résumé...</Text>
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Ajoutez des notes pour générer un résumé automatique
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={16} color={Colors.primary} />
        <Text style={styles.headerText}>Résumé IA</Text>
      </View>
      <Text style={styles.summaryText}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
