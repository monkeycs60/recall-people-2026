import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronDown } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type BirthdayEditModalProps = {
  visible: boolean;
  initialDay?: number;
  initialMonth?: number;
  initialYear?: number;
  onSave: (day: number | null, month: number | null, year: number | null) => void;
  onClose: () => void;
};

export function BirthdayEditModal({
  visible,
  initialDay,
  initialMonth,
  initialYear,
  onSave,
  onClose,
}: BirthdayEditModalProps) {
  const { t } = useTranslation();
  const [day, setDay] = useState(initialDay?.toString() || '');
  const [month, setMonth] = useState<number | null>(initialMonth || null);
  const [year, setYear] = useState(initialYear?.toString() || '');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const months: string[] = t('contact.birthdayModal.months', { returnObjects: true });

  useEffect(() => {
    if (visible) {
      setDay(initialDay?.toString() || '');
      setMonth(initialMonth || null);
      setYear(initialYear?.toString() || '');
      setShowMonthPicker(false);
    }
  }, [visible, initialDay, initialMonth, initialYear]);

  const handleSave = () => {
    const dayNum = parseInt(day, 10);
    const yearNum = year ? parseInt(year, 10) : null;

    if (!day || !month || isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return;
    }

    onSave(dayNum, month, yearNum);
    onClose();
  };

  const handleDelete = () => {
    onSave(null, null, null);
    onClose();
  };

  const hasInitialValue = initialDay && initialMonth;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.birthdayModal.title')}</Text>

          <View style={styles.row}>
            <View style={styles.dayContainer}>
              <Text style={styles.label}>{t('contact.birthdayModal.day')}</Text>
              <TextInput
                style={styles.dayInput}
                value={day}
                onChangeText={(text) => setDay(text.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="15"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>

            <View style={styles.monthContainer}>
              <Text style={styles.label}>{t('contact.birthdayModal.month')}</Text>
              <Pressable
                style={styles.monthButton}
                onPress={() => setShowMonthPicker(!showMonthPicker)}
              >
                <Text style={month ? styles.monthText : styles.monthPlaceholder}>
                  {month ? months[month - 1] : t('contact.birthdayModal.month')}
                </Text>
                <ChevronDown size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {showMonthPicker && (
            <ScrollView style={styles.monthPicker} nestedScrollEnabled>
              {months.map((monthName, index) => (
                <Pressable
                  key={index}
                  style={[styles.monthOption, month === index + 1 && styles.monthOptionSelected]}
                  onPress={() => {
                    setMonth(index + 1);
                    setShowMonthPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      month === index + 1 && styles.monthOptionTextSelected,
                    ]}
                  >
                    {monthName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.yearContainer}>
            <Text style={styles.label}>{t('contact.birthdayModal.year')}</Text>
            <TextInput
              style={styles.yearInput}
              value={year}
              onChangeText={(text) => setYear(text.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={t('contact.birthdayModal.yearPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <View style={styles.buttonRow}>
            {hasInitialValue && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
            )}
            <View style={styles.spacer} />
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.birthdayModal.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, (!day || !month) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!day || !month}
            >
              <Text style={styles.saveButtonText}>{t('contact.birthdayModal.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  dayContainer: {
    width: 70,
  },
  dayInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  monthContainer: {
    flex: 1,
  },
  monthButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  monthPlaceholder: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  monthPicker: {
    maxHeight: 200,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  monthOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  monthOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  monthOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  monthOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  yearContainer: {
    marginBottom: 20,
  },
  yearInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 10,
  },
  spacer: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
