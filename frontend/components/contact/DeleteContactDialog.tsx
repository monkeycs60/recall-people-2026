import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { Colors } from '@/constants/theme';

type DeleteContactDialogProps = {
  visible: boolean;
  contactName: string;
  contactFirstName: string;
  contactLastName?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteContactDialog({
  visible,
  contactName,
  contactFirstName,
  contactLastName,
  onCancel,
  onConfirm,
}: DeleteContactDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.avatarContainer}>
            <ContactAvatar
              firstName={contactFirstName}
              lastName={contactLastName}
              size="medium"
            />
          </View>
          <Text style={styles.title}>{t('contact.deleteDialog.title')}</Text>
          <Text style={styles.contactName}>{contactName}</Text>
          <Text style={styles.message}>
            {t('contact.deleteDialog.message', { name: contactName })}
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>
                {t('contact.deleteDialog.cancel')}
              </Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={onConfirm}>
              <Text style={styles.deleteButtonText}>
                {t('contact.deleteDialog.confirm')}
              </Text>
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
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '600',
  },
});
