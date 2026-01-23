import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

type CreateContactModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (firstName: string, lastName: string) => void;
};

export function CreateContactModal({ visible, onClose, onCreate }: CreateContactModalProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
      setFirstName('');
      setLastName('');
    }
  }, [visible]);

  const handleCreate = () => {
    if (!firstName.trim()) return;
    onCreate(firstName.trim(), lastName.trim());
  };

  const isValid = firstName.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('contacts.createModal.title')}</Text>

          <Text style={styles.label}>{t('contact.name.firstName')} *</Text>
          <Animated.View style={[styles.inputContainer, firstNameInputStyle]}>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('contact.name.firstNamePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              autoFocus
              returnKeyType="next"
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
            />
          </Animated.View>

          <Text style={styles.label}>{t('contact.name.lastName')}</Text>
          <Animated.View style={[styles.inputContainer, lastNameInputStyle]}>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('contact.name.lastNamePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
            />
          </Animated.View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.createButton, !isValid && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!isValid}
            >
              <Text style={[styles.createButtonText, !isValid && styles.createButtonTextDisabled]}>
                {t('contacts.createModal.create')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: 16,
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
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  createButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  createButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: Colors.textInverse,
  },
});
