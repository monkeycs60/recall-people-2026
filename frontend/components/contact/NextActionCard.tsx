import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MessageCircle } from 'lucide-react-native';
import { HotTopic } from '@/types';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { formatLocalizedDate } from '@/utils/dateLocale';

type NextActionCardProps = {
  firstName: string;
  topic?: HotTopic | null;
  suggestedQuestion?: string;
};

export function NextActionCard({
  firstName,
  topic,
  suggestedQuestion,
}: NextActionCardProps) {
  const { t } = useTranslation();

  if (!topic && !suggestedQuestion) return null;

  const hasTopic = Boolean(topic);
  const actionTitle = hasTopic
    ? topic!.title
    : t('contact.nextAction.questionTitle', { firstName });
  const actionDescription = hasTopic
    ? topic!.eventDate
      ? t('contact.nextAction.eventDescriptionWithDate', {
          date: formatLocalizedDate(topic!.eventDate, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
        })
      : topic!.context || t('contact.nextAction.eventDescription')
    : suggestedQuestion;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{t('contact.nextAction.label')}</Text>
        <View style={[styles.iconTile, !hasTopic && styles.iconTileAccent]}>
          {hasTopic ? (
            <CalendarDays size={16} color={Colors.primary} strokeWidth={2.2} />
          ) : (
            <MessageCircle size={16} color={Colors.accent} strokeWidth={2.2} />
          )}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {actionTitle}
      </Text>
      {actionDescription ? (
        <Text style={styles.description} numberOfLines={3}>
          {actionDescription}
        </Text>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: 16,
    ...Shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  iconTileAccent: {
    backgroundColor: Colors.accentLight,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
});
