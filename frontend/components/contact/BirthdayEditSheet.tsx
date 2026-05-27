import { View, Text, Pressable, StyleSheet } from 'react-native';
import { forwardRef, useState } from 'react';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Cake } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EditSheetShell, sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors, Fonts } from '@/constants/theme';

type BirthdayEditSheetProps = {
  initialDay?: number;
  initialMonth?: number;
  initialYear?: number;
  onSave: (day: number | null, month: number | null, year: number | null) => void;
};

function formatBirthday(day: number, month: number, year: number | undefined, language: string): string {
  const locale = language === 'en' ? 'en-US' : `${language}-${language.toUpperCase()}`;
  const date = new Date(year ?? 2000, month - 1, day);
  return date.toLocaleDateString(
    locale,
    year ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' }
  );
}

export const BirthdayEditSheet = forwardRef<BottomSheetModal, BirthdayEditSheetProps>(
  ({ initialDay, initialMonth, initialYear, onSave }, ref) => {
    const { t, i18n } = useTranslation();
    const [day, setDay] = useState(initialDay?.toString() ?? '');
    const [month, setMonth] = useState<number | null>(initialMonth ?? null);
    const [year, setYear] = useState(initialYear?.toString() ?? '');

    const months = t('contact.birthdayModal.months', { returnObjects: true }) as string[];

    const dayNumber = parseInt(day, 10);
    const canSave = Boolean(month) && !isNaN(dayNumber) && dayNumber >= 1 && dayNumber <= 31;
    const hasInitialValue = Boolean(initialDay && initialMonth);

    const readValue =
      initialDay && initialMonth
        ? formatBirthday(initialDay, initialMonth, initialYear, i18n.language)
        : null;

    return (
      <EditSheetShell
        ref={ref}
        title={t('contact.birthdayModal.title')}
        icon={<Cake size={18} color={Colors.primary} strokeWidth={2.3} />}
        config={{
          snapPoint: '34%',
          editSnapPoint: '66%',
          readValue,
          canSave,
          onStart: () => {
            setDay(initialDay?.toString() ?? '');
            setMonth(initialMonth ?? null);
            setYear(initialYear?.toString() ?? '');
          },
          onSave: () => onSave(dayNumber, month, year ? parseInt(year, 10) : null),
          onDelete: hasInitialValue ? () => onSave(null, null, null) : undefined,
        }}
      >
        <View style={styles.row}>
          <View style={styles.dayColumn}>
            <Text style={styles.label}>{t('contact.birthdayModal.day')}</Text>
            <BottomSheetTextInput
              style={[sheetInputStyles.input, styles.numberInput]}
              value={day}
              onChangeText={(text) => setDay(text.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="15"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={styles.yearColumn}>
            <Text style={styles.label}>{t('contact.birthdayModal.year')}</Text>
            <BottomSheetTextInput
              style={[sheetInputStyles.input, styles.numberInput]}
              value={year}
              onChangeText={(text) => setYear(text.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={t('contact.birthdayModal.yearPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        </View>

        <Text style={styles.label}>{t('contact.birthdayModal.month')}</Text>
        <View style={styles.monthGrid}>
          {months.map((monthName, index) => {
            const monthValue = index + 1;
            const isSelected = month === monthValue;
            return (
              <Pressable
                key={monthValue}
                style={[styles.monthChip, isSelected && styles.monthChipSelected]}
                onPress={() => setMonth(monthValue)}
              >
                <Text style={[styles.monthChipText, isSelected && styles.monthChipTextSelected]}>
                  {monthName.slice(0, 3)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </EditSheetShell>
    );
  }
);

BirthdayEditSheet.displayName = 'BirthdayEditSheet';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  dayColumn: {
    width: 90,
  },
  yearColumn: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  numberInput: {
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  monthChip: {
    width: '22%',
    flexGrow: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    alignItems: 'center',
  },
  monthChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  monthChipText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  monthChipTextSelected: {
    fontFamily: Fonts.sans.bold,
    color: Colors.primary,
  },
});
