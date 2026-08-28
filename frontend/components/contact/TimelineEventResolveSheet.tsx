import { forwardRef, useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CalendarCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors, Fonts } from '@/constants/theme';
import { formatLocalizedDate } from '@/utils/dateLocale';

export type TimelineEventResolutionValues = {
  resolutionDate: Date;
  resolutionReason: string;
};

type TimelineEventResolveSheetProps = {
  eventTitle?: string;
  isSaving?: boolean;
  onDismiss?: () => void;
  onResolve: (values: TimelineEventResolutionValues) => Promise<void> | void;
};

function cloneDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const TimelineEventResolveSheet = forwardRef<BottomSheetModal, TimelineEventResolveSheetProps>(
  ({ eventTitle, isSaving = false, onDismiss, onResolve }, ref) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const today = useMemo(() => cloneDay(new Date()), []);
    const [resolutionDate, setResolutionDate] = useState(today);
    const [resolutionReason, setResolutionReason] = useState('');
    const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
    const snapPoints = useMemo(() => [Platform.OS === 'ios' ? '68%' : '54%'], []);

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const dismiss = () => {
      if (ref && typeof ref !== 'function') ref.current?.dismiss();
    };

    const handleDateChange = (pickerEvent: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowAndroidDatePicker(false);
      if (pickerEvent.type === 'set' && selectedDate) setResolutionDate(cloneDay(selectedDate));
    };

    const handleResolve = async () => {
      if (!eventTitle || isSaving) return;
      await onResolve({ resolutionDate, resolutionReason: resolutionReason.trim() });
      dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => {
          setResolutionDate(today);
          setResolutionReason('');
          setShowAndroidDatePicker(false);
          onDismiss?.();
        }}
      >
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <CalendarCheck size={19} color={Colors.success} strokeWidth={2.5} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t('contactComingUp.resolveEventTitle')}</Text>
              <Text style={styles.eventTitle} numberOfLines={2}>{eventTitle}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('contactComingUp.resolutionDate')}</Text>
            {Platform.OS === 'android' ? (
              <Pressable style={styles.dateButton} onPress={() => setShowAndroidDatePicker(true)}>
                <CalendarCheck size={18} color={Colors.success} strokeWidth={2.4} />
                <Text style={styles.dateButtonText}>
                  {formatLocalizedDate(resolutionDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.iosDatePickerWrap}>
                <DateTimePicker
                  value={resolutionDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={today}
                  style={styles.iosDatePicker}
                />
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('contactComingUp.resolutionReason')}</Text>
            <BottomSheetTextInput
              style={[sheetInputStyles.input, sheetInputStyles.inputMultiline]}
              value={resolutionReason}
              onChangeText={setResolutionReason}
              placeholder={t('contactComingUp.resolutionReasonPlaceholder')}
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
              style={[styles.resolveButton, isSaving && styles.resolveButtonDisabled]}
              onPress={handleResolve}
              disabled={isSaving}
            >
              <Text style={styles.resolveButtonText}>{t('contactComingUp.resolveAction')}</Text>
            </Pressable>
          </View>

          {Platform.OS === 'android' && showAndroidDatePicker ? (
            <DateTimePicker
              value={resolutionDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={today}
            />
          ) : null}
        </View>
      </BottomSheetModal>
    );
  }
);

TimelineEventResolveSheet.displayName = 'TimelineEventResolveSheet';

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: Colors.surface },
  handle: { backgroundColor: Colors.hairline },
  container: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { fontFamily: Fonts.sans.bold, fontSize: 17, color: Colors.textPrimary },
  eventTitle: { fontFamily: Fonts.sans.medium, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  field: { marginBottom: 14 },
  label: { fontFamily: Fonts.sans.medium, fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
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
  dateButtonText: { fontFamily: Fonts.sans.bold, fontSize: 15, color: Colors.textPrimary },
  iosDatePickerWrap: { borderRadius: 14, borderWidth: 1.5, borderColor: Colors.hairline, overflow: 'hidden' },
  iosDatePicker: { height: 150 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.hairline,
  },
  cancelButtonText: { fontFamily: Fonts.sans.bold, color: Colors.primary, fontSize: 15 },
  resolveButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 14, backgroundColor: Colors.success },
  resolveButtonDisabled: { opacity: 0.5 },
  resolveButtonText: { fontFamily: Fonts.sans.bold, color: Colors.textInverse, fontSize: 15 },
});
