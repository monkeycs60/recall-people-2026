import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

type NameEditModalProps = {
  visible: boolean;
  initialFirstName: string;
  initialLastName?: string;
  onSave: (firstName: string, lastName: string | null) => void;
  onClose: () => void;
};

export function NameEditModal({
  visible,
  initialFirstName,
  initialLastName,
  onSave,
  onClose,
}: NameEditModalProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName || '');
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);

  const firstNameInputStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(firstNameFocused ? Colors.primary : Colors.borderLight, { duration: 150 }),
    borderWidth: withTiming(firstNameFocused ? 2 : 1.5, { duration: 150 }),
  }));

  const lastNameInputStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(lastNameFocused ? Colors.primary : Colors.borderLight, { duration: 150 }),
    borderWidth: withTiming(lastNameFocused ? 2 : 1.5, { duration: 150 }),
  }));

  useEffect(() => {
    if (visible) {
      setFirstName(initialFirstName);
      setLastName(initialLastName || '');
    }
  }, [visible, initialFirstName, initialLastName]);

  const handleSave = () => {
    if (!firstName.trim()) {
      return;
    }
    onSave(firstName.trim(), lastName.trim() || null);
    onClose();
  };

  const isValid = firstName.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{t('contact.nameModal.title')}</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('contact.nameModal.firstName')}</Text>
            <Animated.View style={[styles.inputContainer, firstNameInputStyle]}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('contact.nameModal.firstNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onFocus={() => setFirstNameFocused(true)}
                onBlur={() => setFirstNameFocused(false)}
              />
            </Animated.View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{t('contact.nameModal.lastName')}</Text>
            <Animated.View style={[styles.inputContainer, lastNameInputStyle]}>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('contact.nameModal.lastNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setLastNameFocused(true)}
                onBlur={() => setLastNameFocused(false)}
              />
            </Animated.View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('contact.nameModal.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={styles.saveButtonText}>{t('contact.nameModal.save')}</Text>
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
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
