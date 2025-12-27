import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type IceBreakersProps = {
  iceBreakers?: string[];
  isLoading?: boolean;
  firstName: string;
};

const ORANGE_ACCENT = '#E07B39';
const ORANGE_LIGHT = '#FDF4EC';

export function IceBreakers({ iceBreakers, isLoading, firstName }: IceBreakersProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={ORANGE_ACCENT} />
          <Text style={styles.loadingText}>{t('contact.iceBreakers.loading')}</Text>
        </View>
      </View>
    );
  }

  if (!iceBreakers || iceBreakers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t('contact.iceBreakers.empty', { firstName })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageCircle size={16} color={ORANGE_ACCENT} />
        <Text style={styles.headerText}>{t('contact.iceBreakers.header')}</Text>
      </View>
      <View style={styles.questionsContainer}>
        {iceBreakers.map((question, index) => (
          <View key={index} style={styles.questionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ORANGE_LIGHT,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE_ACCENT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: ORANGE_ACCENT,
    marginLeft: 6,
  },
  questionsContainer: {
    gap: 8,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: ORANGE_ACCENT,
    marginRight: 8,
    lineHeight: 22,
  },
  questionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  loadingContainer: {
    backgroundColor: `${ORANGE_LIGHT}80`,
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
