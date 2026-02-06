import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Edit3 } from 'lucide-react-native';
import { ExtractedFact } from '@/types';
import { Colors, BorderRadius } from '@/constants/theme';

type FactsSectionProps = {
  facts: ExtractedFact[];
  selectedFacts: number[];
  editingFactIndex: number | null;
  onToggleFact: (index: number) => void;
  onUpdateFact: (index: number, field: 'factKey' | 'factValue', value: string) => void;
  onSetEditingIndex: (index: number | null) => void;
};

export function FactsSection({
  facts,
  selectedFacts,
  editingFactIndex,
  onToggleFact,
  onUpdateFact,
  onSetEditingIndex,
}: FactsSectionProps) {
  const { t } = useTranslation();

  return (
    <View>
      {facts.map((fact, index) => {
        const isEditing = editingFactIndex === index;

        if (isEditing) {
          return (
            <View key={index} style={styles.card}>
              <Text style={styles.factLabel}>{fact.factKey}</Text>
              <TextInput
                style={styles.textInput}
                value={fact.factValue}
                onChangeText={(value) => onUpdateFact(index, 'factValue', value)}
                placeholder={t('review.valuePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable style={styles.confirmButton} onPress={() => onSetEditingIndex(null)}>
                <Text style={styles.confirmButtonText}>OK</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View key={index} style={styles.cardRowStandalone}>
            <Pressable onPress={() => onToggleFact(index)}>
              <View style={[styles.checkbox, selectedFacts.includes(index) && styles.checkboxSelected]}>
                {selectedFacts.includes(index) && <Text style={styles.checkmark}>&#x2713;</Text>}
              </View>
            </Pressable>

            <Pressable style={styles.cardContent} onPress={() => onSetEditingIndex(index)}>
              <View style={styles.factRow}>
                <Text style={styles.factLabel}>{fact.factKey}</Text>
                <Edit3 size={14} color={Colors.textMuted} />
              </View>
              <Text style={styles.factValue}>{fact.factValue}</Text>
              {fact.action === 'update' && fact.previousValue && (
                <Text style={styles.previousValue}>
                  {t('review.previousValue', { value: fact.previousValue })}
                </Text>
              )}
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
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  cardRowStandalone: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.md,
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
  factLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginBottom: 8,
  },
  factValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  previousValue: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 4,
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
