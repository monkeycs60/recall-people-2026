import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Edit3 } from 'lucide-react-native';
import { ExtractedMemory } from '@/types';
import { Colors, BorderRadius } from '@/constants/theme';

type MemoriesSectionProps = {
  memories: ExtractedMemory[];
  selectedMemories: number[];
  editingMemoryIndex: number | null;
  onToggleMemory: (index: number) => void;
  onUpdateMemory: (index: number, field: 'description' | 'eventDate', value: string) => void;
  onSetEditingIndex: (index: number | null) => void;
};

export function MemoriesSection({
  memories,
  selectedMemories,
  editingMemoryIndex,
  onToggleMemory,
  onUpdateMemory,
  onSetEditingIndex,
}: MemoriesSectionProps) {
  const { t } = useTranslation();

  return (
    <View>
      {memories.map((memory, index) => {
        const isEditing = editingMemoryIndex === index;

        if (isEditing) {
          return (
            <View key={index} style={styles.card}>
              <TextInput
                style={styles.textInput}
                value={memory.description}
                onChangeText={(value) => onUpdateMemory(index, 'description', value)}
                placeholder={t('review.descriptionPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                spellCheck
                autoCorrect
              />
              <TextInput
                style={styles.textInput}
                value={memory.eventDate || ''}
                onChangeText={(value) => onUpdateMemory(index, 'eventDate', value)}
                placeholder={t('review.datePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable style={styles.confirmButton} onPress={() => onSetEditingIndex(null)}>
                <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View key={index} style={styles.cardRowStandalone}>
            <Pressable onPress={() => onToggleMemory(index)}>
              <View style={[styles.checkbox, selectedMemories.includes(index) && styles.checkboxSelected]}>
                {selectedMemories.includes(index) && <Text style={styles.checkmark}>&#x2713;</Text>}
              </View>
            </Pressable>

            <View style={[styles.memoryDot, memory.isShared ? styles.blueDot : styles.purpleDot]} />

            <Pressable style={styles.cardContent} onPress={() => onSetEditingIndex(index)}>
              <View style={styles.factRow}>
                <Text style={styles.factValue}>{memory.description}</Text>
                <Edit3 size={14} color={Colors.textMuted} />
              </View>
              <View style={styles.memoryMeta}>
                {memory.eventDate && <Text style={styles.memoryDate}>{memory.eventDate}</Text>}
                <Text style={styles.memoryType}>
                  {memory.isShared ? t('review.together') : t('review.solo')}
                </Text>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    marginBottom: 12,
  },
  cardRowStandalone: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.hairline,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 12,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  memoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  blueDot: {
    backgroundColor: '#3B82F6',
  },
  purpleDot: {
    backgroundColor: '#8B5CF6',
  },
  memoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memoryDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  memoryType: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  textInput: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmButtonText: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
});
