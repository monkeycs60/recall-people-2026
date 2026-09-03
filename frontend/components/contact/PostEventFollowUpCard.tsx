import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, MessageCircle, Mic } from 'lucide-react-native';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import type { PastUnresolvedTopic } from '@/utils/hotTopics';

type PostEventFollowUpCardProps = {
  topic: PastUnresolvedTopic;
  onResolve: () => void;
  onTellStory: () => void;
};

export function PostEventFollowUpCard({ topic, onResolve, onTellStory }: PostEventFollowUpCardProps) {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, topic.isStale && styles.cardStale]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <MessageCircle size={16} color={Colors.primary} strokeWidth={2.3} />
        </View>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{t('postEvent.cardTitle', { title: topic.title })}</Text>
          <Text style={styles.subtitle}>
            {t('postEvent.cardDaysAgo', { count: topic.daysPast })}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.resolveButton} onPress={onResolve}>
          <Check size={15} color={Colors.textSecondary} strokeWidth={2.5} />
          <Text style={styles.resolveText}>{t('postEvent.resolveButton')}</Text>
        </Pressable>
        <Pressable style={styles.tellButton} onPress={onTellStory}>
          <Mic size={15} color={Colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.tellText}>{t('postEvent.tellButton')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    gap: 14,
    ...Shadows.card,
  },
  cardStale: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans.medium,
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  resolveButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceAlt,
  },
  resolveText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tellButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    ...Shadows.fab,
  },
  tellText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    color: Colors.textInverse,
  },
});
