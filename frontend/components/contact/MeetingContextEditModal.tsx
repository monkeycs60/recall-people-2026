import { View, Text, TextInput, Pressable, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

type MeetingContextEditModalProps = {
  visible: boolean;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
};

export function MeetingContextEditModal({
  visible,
  initialValue,
  onSave,
  onClose,
}: MeetingContextEditModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  const inputContainerStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(isFocused ? Colors.primary : Colors.hairline, { duration: 150 }),
    borderWidth: withTiming(isFocused ? 2 : 1.5, { duration: 150 }),
  }));

  const trimmedValue = value.trim();
  const canSave = trimmedValue.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(trimmedValue);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.meetingContextModal.title')}</Text>

          <Animated.View style={[styles.inputContainer, inputContainerStyle]}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder={t('contact.meetingContextModal.placeholder')}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCorrect
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </Animated.View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.meetingContextModal.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.saveButtonText}>{t('contact.meetingContextModal.save')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxWidth: 360,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    minHeight: 112,
  },
  input: {
    minHeight: 108,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 18,
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
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
