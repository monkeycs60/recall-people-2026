import { View, Text, Pressable, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useState, type ComponentType } from 'react';
import { X, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { addLove, MAX_LOVES } from '@/utils/loves';
import { Colors, Fonts } from '@/constants/theme';

type LovesEditorProps = {
  loves: string[];
  onChange: (loves: string[]) => void;
  InputComponent?: ComponentType<TextInputProps>;
};

export function LovesEditor({ loves, onChange, InputComponent = TextInput }: LovesEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const removeLove = (love: string) => {
    onChange(loves.filter((existing) => existing !== love));
  };

  const submitDraft = () => {
    const next = addLove(loves, draft);
    if (next !== loves) {
      onChange(next);
      setDraft('');
    }
  };

  const isFull = loves.length >= MAX_LOVES;
  const canAdd = draft.trim().length > 0 && !isFull;

  return (
    <View style={styles.container}>
      {loves.length > 0 && (
        <View style={styles.chipsRow}>
          {loves.map((love) => (
            <Pressable
              key={love}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => removeLove(love)}
            >
              <Text style={styles.chipText} numberOfLines={1}>{love}</Text>
              <X size={13} color={Colors.textSecondary} strokeWidth={2.6} />
            </Pressable>
          ))}
        </View>
      )}

      {!isFull && (
        <View style={styles.addRow}>
          <InputComponent
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('review.lovesAddPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="sentences"
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={submitDraft}
          />
          <Pressable
            style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
            onPress={submitDraft}
            disabled={!canAdd}
          >
            <Plus size={18} color={Colors.textInverse} strokeWidth={2.6} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: Colors.surfaceAlt,
    paddingLeft: 12,
    paddingRight: 9,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipPressed: {
    backgroundColor: Colors.primaryLight,
  },
  chipText: {
    flexShrink: 1,
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
});
