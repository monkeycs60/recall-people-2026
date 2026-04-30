import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageCircle, RefreshCw } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';

type SuggestedQuestionsProps = {
  suggestedQuestions?: string[];
  isLoading?: boolean;
  isRegenerating?: boolean;
  firstName: string;
  onRegenerate?: () => void;
};

export function SuggestedQuestions({ suggestedQuestions, isLoading, isRegenerating, firstName, onRegenerate }: SuggestedQuestionsProps) {
  const { t } = useTranslation();
  const isBusy = isLoading || isRegenerating;

  if (isBusy) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MessageCircle size={16} color={Colors.accent} strokeWidth={2.1} />
            <Text style={styles.headerText}>{t('contact.suggestedQuestions.header')}</Text>
          </View>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
        <View style={styles.skeletonBlock}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.skeletonQuestion}>
              <View style={styles.skeletonIndex} />
              <View style={styles.skeletonTextGroup}>
                <View style={[styles.skeletonLine, styles.skeletonLineFull]} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.loadingText}>{t('contact.suggestedQuestions.loading')}</Text>
      </View>
    );
  }

  if (!suggestedQuestions || suggestedQuestions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {t('contact.suggestedQuestions.empty', { firstName })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageCircle size={16} color={Colors.accent} strokeWidth={2.1} />
          <Text style={styles.headerText}>{t('contact.suggestedQuestions.header')}</Text>
        </View>
        {onRegenerate && (
          <Pressable
            style={styles.regenerateButton}
            onPress={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <ActivityIndicator size="small" color={Colors.accent} />
            ) : (
              <RefreshCw size={15} color={Colors.textSecondary} />
            )}
          </Pressable>
        )}
      </View>
      <View style={styles.questionsContainer}>
        {suggestedQuestions.map((question, index) => (
          <View key={index} style={styles.questionItem}>
            <Text style={styles.questionIndex}>{index + 1}</Text>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        ))}
      </View>
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
    marginBottom: 12,
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
  questionsContainer: {
    gap: 10,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  questionIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  questionText: {
    flex: 1,
    fontFamily: Fonts.sans.medium,
    fontSize: 15.5,
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 10,
  },
  skeletonBlock: {
    gap: 12,
    paddingTop: 2,
  },
  skeletonQuestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  skeletonIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentLight,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: 7,
    paddingTop: 3,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.surfaceAlt,
  },
  skeletonLineFull: {
    width: '100%',
  },
  skeletonLineShort: {
    width: '68%',
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
