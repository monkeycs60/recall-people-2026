import { View, Text, Pressable, Modal, Platform, StyleSheet } from 'react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Moon, Sun } from 'lucide-react-native';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { useSettingsStore } from '@/stores/settings-store';
import { reminderService } from '@/services/reminder.service';
import {
  parseReminderTime,
  formatReminderTime,
  DEFAULT_EVENING_REMINDER_TIME,
  DEFAULT_MORNING_REMINDER_TIME,
  type ReminderTime,
} from '@/lib/notification-schedule';
import { Colors } from '@/constants/theme';

function reminderTimeToDate(value: string, fallback: ReminderTime): Date {
  const { hour, minute } = parseReminderTime(value, fallback);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dateToReminderTime(date: Date): string {
  return formatReminderTime({ hour: date.getHours(), minute: date.getMinutes() });
}

type ReminderTimePickerProps = {
  value: Date;
  visible: boolean;
  title: string;
  onCommit: (time: string) => void;
  onClose: () => void;
};

function ReminderTimePicker({ value, visible, title, onCommit, onClose }: ReminderTimePickerProps) {
  const { t } = useTranslation();
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      onClose();
      if (event.type === 'set' && selectedDate) {
        onCommit(dateToReminderTime(selectedDate));
      }
    };
    return (
      <DateTimePicker value={value} mode="time" is24Hour display="default" onChange={handleAndroidChange} />
    );
  }

  const displayedDate = pendingDate ?? value;

  const handleSpinnerChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) setPendingDate(selectedDate);
  };

  const handleCancel = () => {
    setPendingDate(null);
    onClose();
  };

  const handleConfirm = () => {
    onCommit(dateToReminderTime(displayedDate));
    setPendingDate(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <Pressable style={styles.modalOverlay} onPress={handleCancel}>
        <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Pressable onPress={handleCancel}>
              <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
            </Pressable>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={handleConfirm}>
              <Text style={styles.modalDone}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={displayedDate}
            mode="time"
            is24Hour
            display="spinner"
            onChange={handleSpinnerChange}
            style={styles.iosPicker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ReminderTimeRows() {
  const { t } = useTranslation();
  const eveningReminderTime = useSettingsStore((state) => state.eveningReminderTime);
  const morningReminderTime = useSettingsStore((state) => state.morningReminderTime);
  const setEveningReminderTime = useSettingsStore((state) => state.setEveningReminderTime);
  const setMorningReminderTime = useSettingsStore((state) => state.setMorningReminderTime);

  const [showEveningPicker, setShowEveningPicker] = useState(false);
  const [showMorningPicker, setShowMorningPicker] = useState(false);

  const handleEveningTimeChange = useCallback((time: string) => {
    setEveningReminderTime(time);
    reminderService.rescheduleEventReminders().catch((error) => {
      console.warn('[profile] Failed to reschedule event reminders:', error);
    });
  }, [setEveningReminderTime]);

  const handleMorningTimeChange = useCallback((time: string) => {
    setMorningReminderTime(time);
    Promise.all([
      reminderService.rescheduleEventReminders(),
      reminderService.scheduleNotSeenReminders(),
      reminderService.schedulePostEventFollowUps(),
    ]).catch((error) => {
      console.warn('[profile] Failed to reschedule reminders:', error);
    });
  }, [setMorningReminderTime]);

  const openEveningPicker = useCallback(() => setShowEveningPicker(true), []);
  const openMorningPicker = useCallback(() => setShowMorningPicker(true), []);
  const closeEveningPicker = useCallback(() => setShowEveningPicker(false), []);
  const closeMorningPicker = useCallback(() => setShowMorningPicker(false), []);

  return (
    <>
      <SettingsRow
        icon={<Moon size={20} color={Colors.primary} />}
        label={t('settings.eveningReminderTime')}
        description={t('settings.eveningReminderTimeDescription')}
        value={eveningReminderTime}
        onPress={openEveningPicker}
      />
      <SettingsRow
        icon={<Sun size={20} color={Colors.primary} />}
        label={t('settings.morningReminderTime')}
        description={t('settings.morningReminderTimeDescription')}
        value={morningReminderTime}
        onPress={openMorningPicker}
      />
      <ReminderTimePicker
        value={reminderTimeToDate(eveningReminderTime, DEFAULT_EVENING_REMINDER_TIME)}
        visible={showEveningPicker}
        title={t('settings.eveningReminderTime')}
        onCommit={handleEveningTimeChange}
        onClose={closeEveningPicker}
      />
      <ReminderTimePicker
        value={reminderTimeToDate(morningReminderTime, DEFAULT_MORNING_REMINDER_TIME)}
        visible={showMorningPicker}
        title={t('settings.morningReminderTime')}
        onCommit={handleMorningTimeChange}
        onClose={closeMorningPicker}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 26, 46, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  modalCancel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalDone: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  iosPicker: {
    height: 200,
  },
});
