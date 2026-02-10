import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Edit3, Calendar } from 'lucide-react-native';
import { ExtractedHotTopicV1 } from '@/types';
import { Colors, BorderRadius } from '@/constants/theme';

type HotTopicDateInfo = {
  enabled: boolean;
  date: string;
};

type HotTopicsSectionState = {
  hotTopics: ExtractedHotTopicV1[];
  selectedHotTopics: number[];
  editingHotTopicIndex: number | null;
  hotTopicDates: Record<number, HotTopicDateInfo>;
};

type HotTopicsSectionHandlers = {
  onToggleHotTopic: (index: number) => void;
  onUpdateHotTopic: (index: number, field: 'title' | 'context', value: string) => void;
  onSetEditingIndex: (index: number | null) => void;
  onToggleDate: (index: number) => void;
  onOpenDatePicker: (index: number) => void;
  formatRelativeDate: (dateStr: string) => string;
};

type HotTopicsSectionProps = {
  state: HotTopicsSectionState;
  handlers: HotTopicsSectionHandlers;
};

export function HotTopicsSection({ state, handlers }: HotTopicsSectionProps) {
  const { t } = useTranslation();
  const { hotTopics, selectedHotTopics, editingHotTopicIndex, hotTopicDates } = state;
  const { onToggleHotTopic, onUpdateHotTopic, onSetEditingIndex, onToggleDate, onOpenDatePicker, formatRelativeDate } = handlers;

  return (
    <View>
      <Text style={styles.reminderExplanation}>{t('review.reminderExplanation')}</Text>

      {hotTopics.map((topic, index) => {
        const isEditing = editingHotTopicIndex === index;

        if (isEditing) {
          return (
            <View key={index} style={styles.card}>
              <TextInput
                style={[styles.textInput, styles.textInputBold]}
                value={topic.title}
                onChangeText={(value) => onUpdateHotTopic(index, 'title', value)}
                placeholder={t('review.titlePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                spellCheck
                autoCorrect
              />
              <TextInput
                style={styles.textInput}
                value={topic.context || ''}
                onChangeText={(value) => onUpdateHotTopic(index, 'context', value)}
                placeholder={t('review.contextPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                spellCheck
                autoCorrect
              />
              <Pressable style={styles.confirmButton} onPress={() => onSetEditingIndex(null)}>
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              </Pressable>
            </View>
          );
        }

        const dateInfo = hotTopicDates[index];

        return (
          <View key={index} style={styles.card}>
            <View style={styles.cardRow}>
              <Pressable onPress={() => onToggleHotTopic(index)}>
                <View style={[styles.checkbox, selectedHotTopics.includes(index) && styles.checkboxSelected]}>
                  {selectedHotTopics.includes(index) && <Text style={styles.checkmark}>&#x2713;</Text>}
                </View>
              </Pressable>

              <View style={styles.orangeDot} />

              <Pressable style={styles.cardContent} onPress={() => onSetEditingIndex(index)}>
                <View style={styles.factRow}>
                  <Text style={styles.factValue}>{topic.title}</Text>
                  <Edit3 size={14} color={Colors.textMuted} />
                </View>
                {topic.context && <Text style={styles.contextText}>{topic.context}</Text>}
              </Pressable>
            </View>

            <View style={styles.reminderRow}>
              <Pressable style={styles.reminderCheckbox} onPress={() => onToggleDate(index)}>
                <View style={[styles.smallCheckbox, dateInfo?.enabled && styles.smallCheckboxSelected]}>
                  {dateInfo?.enabled && <Text style={styles.smallCheckmark}>&#x2713;</Text>}
                </View>
                <Text style={styles.reminderLabel}>{t('review.reminder')}</Text>
              </Pressable>

              {dateInfo?.enabled && (
                <>
                  <Pressable style={styles.datePickerButton} onPress={() => onOpenDatePicker(index)}>
                    <Calendar size={16} color={Colors.info} />
                    <Text style={dateInfo.date ? styles.datePickerText : styles.datePickerPlaceholder}>
                      {dateInfo.date || t('review.selectDate')}
                    </Text>
                  </Pressable>
                  {dateInfo.date && (
                    <Text style={styles.relativeDateText}>{formatRelativeDate(dateInfo.date)}</Text>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  reminderExplanation: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 12,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  contextText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
    marginTop: 6,
    marginRight: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  textInputBold: {
    fontWeight: '500',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmButtonText: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  reminderCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCheckboxSelected: {
    backgroundColor: Colors.info,
    borderColor: Colors.info,
  },
  smallCheckmark: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  reminderLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.info,
    gap: 6,
  },
  datePickerText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  relativeDateText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: '500',
  },
});
