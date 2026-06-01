import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors, Fonts } from '@/constants/theme';
import { formatLocalizedDate } from '@/utils/dateLocale';

export type TimelineEventEditValues = {
  title: string;
  context: string;
  eventDate: string;
};

export type TimelineEventEditSheetEvent = {
  id: string;
  title: string;
  context?: string;
  date: Date;
};

type TimelineEventEditSheetProps = {
  event: TimelineEventEditSheetEvent | null;
  isSaving?: boolean;
  onDismiss?: () => void;
  onSave: (
    event: TimelineEventEditSheetEvent,
    values: TimelineEventEditValues
  ) => Promise<void> | void;
};

function cloneDate(date: Date | undefined): Date {
  if (!date || Number.isNaN(date.getTime())) return new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const TimelineEventEditSheet = forwardRef<BottomSheetModal, TimelineEventEditSheetProps>(
  ({ event, isSaving = false, onDismiss, onSave }, ref) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(event?.title ?? '');
    const [context, setContext] = useState(event?.context ?? '');
    const [date, setDate] = useState(() => cloneDate(event?.date));
    const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);

    const snapPoints = useMemo(() => [Platform.OS === 'ios' ? '82%' : '72%'], []);
    const canSave = Boolean(event && title.trim().length > 0 && !isSaving);
    const dateLabel = formatLocalizedDate(date, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const dismiss = () => {
      if (ref && typeof ref !== 'function') {
        ref.current?.dismiss();
      }
    };

    const handleDateChange = (pickerEvent: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowAndroidDatePicker(false);
      }

      if (pickerEvent.type === 'set' && selectedDate) {
        setDate(cloneDate(selectedDate));
      }
    };

    const handleSave = async () => {
      if (!event || !canSave) return;

      await onSave(event, {
        title: title.trim(),
        context: context.trim(),
        eventDate: formatDateForStorage(date),
      });
      dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => {
          setShowAndroidDatePicker(false);
          onDismiss?.();
        }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <CalendarDays size={18} color={Colors.primary} strokeWidth={2.4} />
            </View>
            <Text style={styles.title}>{t('contactComingUp.editEventTitle')}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('contactComingUp.eventTitleLabel')}</Text>
            <BottomSheetTextInput
              style={sheetInputStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('contactComingUp.eventTitlePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="sentences"
              autoFocus
              selectTextOnFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('contactComingUp.eventDate')}</Text>
            {Platform.OS === 'android' ? (
              <Pressable
                style={styles.dateButton}
                onPress={() => setShowAndroidDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('contactComingUp.eventDate')}
              >
                <CalendarDays size={18} color={Colors.primary} strokeWidth={2.4} />
                <Text style={styles.dateButtonText}>{dateLabel}</Text>
              </Pressable>
            ) : (
              <View style={styles.iosDatePickerWrap}>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.iosDatePicker}
                />
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('contactComingUp.eventContextLabel')}</Text>
            <BottomSheetTextInput
              style={[sheetInputStyles.input, sheetInputStyles.inputMultiline]}
              value={context}
              onChangeText={setContext}
              placeholder={t('contactComingUp.eventContextPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={dismiss} disabled={isSaving}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.saveButtonText}>{t('common.save')}</Text>
            </Pressable>
          </View>

          {Platform.OS === 'android' && showAndroidDatePicker ? (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          ) : null}
        </View>
      </BottomSheetModal>
    );
  }
);

TimelineEventEditSheet.displayName = 'TimelineEventEditSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
  },
  handle: {
    backgroundColor: Colors.hairline,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  dateButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  dateButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  iosDatePickerWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    overflow: 'hidden',
  },
  iosDatePicker: {
    height: 172,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.hairline,
  },
  cancelButtonText: {
    fontFamily: Fonts.sans.bold,
    color: Colors.primary,
    fontSize: 15,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: Fonts.sans.bold,
    color: Colors.textInverse,
    fontSize: 15,
  },
});
