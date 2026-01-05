import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Gender } from '@/types';

type GenderEditModalProps = {
  visible: boolean;
  initialValue?: Gender;
  onSave: (value: Gender) => Promise<void>;
  onClose: () => void;
};

const GENDER_OPTIONS: Gender[] = ['male', 'female', 'unknown'];

export function GenderEditModal({
  visible,
  initialValue = 'unknown',
  onSave,
  onClose,
}: GenderEditModalProps) {
  const { t } = useTranslation();

  const handleSelect = async (gender: Gender) => {
    await onSave(gender);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('contact.genderModal.title')}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((gender) => (
              <Pressable
                key={gender}
                style={[
                  styles.option,
                  initialValue === gender && styles.optionSelected,
                ]}
                onPress={() => handleSelect(gender)}
              >
                <Text
                  style={[
                    styles.optionText,
                    initialValue === gender && styles.optionTextSelected,
                  ]}
                >
                  {t(`contact.contactCard.gender.${gender}`)}
                </Text>
                {initialValue === gender && (
                  <Check size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
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
  content: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
});
