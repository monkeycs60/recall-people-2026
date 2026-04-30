import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Edit3, MapPin, NotebookText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';

type MeetingContextCardProps = {
  context: string;
  sourceTitle?: string;
  onEdit?: () => void;
};

export function MeetingContextCard({ context, sourceTitle, onEdit }: MeetingContextCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MapPin size={17} color={Colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{t('contact.meetingContext.label')}</Text>
          {onEdit ? (
            <Pressable
              style={styles.editButton}
              onPress={onEdit}
              accessibilityRole="button"
              accessibilityLabel={t('contact.meetingContext.edit')}
              hitSlop={8}
            >
              <Edit3 size={14} color={Colors.textMuted} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.contextText}>{context}</Text>
        {sourceTitle ? (
          <View style={styles.sourceRow}>
            <NotebookText size={12} color={Colors.textMuted} strokeWidth={2} />
            <Text style={styles.sourceText}>
              {t('contact.meetingContext.source', { title: sourceTitle })}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.hairline,
    padding: 15,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  contextText: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
  sourceText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
});
