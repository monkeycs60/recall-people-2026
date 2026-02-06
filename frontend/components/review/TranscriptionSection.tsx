import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, BorderRadius } from '@/constants/theme';

type TranscriptionSectionProps = {
  transcription: string;
  editedTranscription: string;
  isEditing: boolean;
  isReExtracting: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onChangeText: (text: string) => void;
  onConfirm: () => void;
};

export function TranscriptionSection({
  transcription,
  editedTranscription,
  isEditing,
  isReExtracting,
  onEditStart,
  onEditCancel,
  onChangeText,
  onConfirm,
}: TranscriptionSectionProps) {
  const { t } = useTranslation();

  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <TextInput
          style={styles.input}
          value={editedTranscription}
          onChangeText={onChangeText}
          multiline
          autoFocus
          placeholder={t('review.transcriptionPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          editable={!isReExtracting}
        />
        <View style={styles.editActions}>
          <Pressable
            style={styles.cancelButton}
            onPress={onEditCancel}
            disabled={isReExtracting}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, isReExtracting && styles.confirmButtonDisabled]}
            onPress={onConfirm}
            disabled={isReExtracting}
          >
            <Text style={styles.confirmButtonText}>
              {isReExtracting ? t('review.reExtracting') : t('review.done')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable onPress={onEditStart}>
      <View style={styles.displayContainer}>
        <Text style={styles.text}>{editedTranscription}</Text>
      </View>
      <Text style={styles.hint}>{t('review.transcriptionHint')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  displayContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  editContainer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
});
