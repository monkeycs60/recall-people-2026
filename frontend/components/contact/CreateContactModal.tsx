import { View, Text, TextInput, Pressable, StyleSheet, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('contact.name.firstNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="next"
          />

          <Text style={styles.label}>{t('contact.name.lastName')}</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('contact.name.lastNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

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
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
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
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  createButtonDisabled: {
    backgroundColor: Colors.border,
  },
  createButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: Colors.textMuted,
  },
});
