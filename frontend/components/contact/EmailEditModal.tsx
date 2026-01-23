import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

type EmailEditModalProps = {
  visible: boolean;
  initialValue?: string;
  onSave: (value: string | null) => void;
  onClose: () => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailEditModal({ visible, initialValue, onSave, onClose }: EmailEditModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue || '');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const inputContainerStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? Colors.error
      : isFocused
        ? Colors.primary
        : Colors.borderLight;
    const borderWidth = error || isFocused ? 2 : 1.5;

    return {
      borderColor: withTiming(borderColor, { duration: 150 }),
      borderWidth: withTiming(borderWidth, { duration: 150 }),
    };
  });

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      setError(t('contact.emailModal.invalidFormat'));
      return;
    }
    onSave(trimmed || null);
    onClose();
  };

  const handleDelete = () => {
    onSave(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.emailModal.title')}</Text>

          <Animated.View style={[styles.inputContainer, inputContainerStyle]}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => {
                setValue(text);
                setError(null);
              }}
              placeholder={t('contact.emailModal.placeholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </Animated.View>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            {initialValue && (
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
            )}
            <View style={styles.spacer} />
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.emailModal.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{t('contact.emailModal.save')}</Text>
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
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 8,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
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
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
