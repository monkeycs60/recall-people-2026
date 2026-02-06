import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Edit3 } from 'lucide-react-native';
import { HotTopic, ResolvedTopic } from '@/types';
import { Colors, BorderRadius } from '@/constants/theme';

type ResolvedTopicWithData = HotTopic & {
  proposedResolution: string;
};

type ResolvedTopicsSectionState = {
  resolvedTopicsWithData: ResolvedTopicWithData[];
  resolvedTopicsState: ResolvedTopic[];
  editingResolutionId: string | null;
};

type ResolvedTopicsSectionHandlers = {
  onToggleResolved: (topicId: string) => void;
  onUpdateResolution: (topicId: string, resolution: string) => void;
  onSetEditingResolutionId: (id: string | null) => void;
};

type ResolvedTopicsSectionProps = {
  state: ResolvedTopicsSectionState;
  handlers: ResolvedTopicsSectionHandlers;
};

export function ResolvedTopicsSection({ state, handlers }: ResolvedTopicsSectionProps) {
  const { t } = useTranslation();
  const { resolvedTopicsWithData, resolvedTopicsState, editingResolutionId } = state;
  const { onToggleResolved, onUpdateResolution, onSetEditingResolutionId } = handlers;

  return (
    <View>
      <Text style={styles.description}>{t('review.topicsToArchiveDescription')}</Text>

      {resolvedTopicsWithData.map((topic) => {
        const isSelected = resolvedTopicsState.some((resolved) => resolved.id === topic.id);
        const currentResolution = resolvedTopicsState.find((resolved) => resolved.id === topic.id)?.resolution || '';
        const isEditing = editingResolutionId === topic.id;

        return (
          <View key={topic.id} style={styles.resolvedCard}>
            <Pressable style={styles.cardRowStart} onPress={() => onToggleResolved(topic.id)}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSuccess]}>
                {isSelected && <Text style={styles.checkmark}>&#x2713;</Text>}
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.factValue}>{topic.title}</Text>
                {topic.context && <Text style={styles.contextText}>{topic.context}</Text>}
              </View>
            </Pressable>

            {isSelected && (
              <View style={styles.resolutionContainer}>
                <Text style={styles.resolutionLabel}>{t('review.resolutionLabel')}</Text>
                {isEditing ? (
                  <View>
                    <TextInput
                      style={styles.textInputSmall}
                      value={currentResolution}
                      onChangeText={(value) => onUpdateResolution(topic.id, value)}
                      placeholder={t('review.resolutionPlaceholder')}
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      autoFocus
                    />
                    <Pressable
                      style={styles.confirmButtonSuccess}
                      onPress={() => onSetEditingResolutionId(null)}
                    >
                      <Text style={styles.confirmButtonSuccessText}>{t('common.confirm')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.resolutionRow}
                    onPress={() => onSetEditingResolutionId(topic.id)}
                  >
                    <Text style={styles.resolutionText}>
                      {currentResolution || t('review.addResolution')}
                    </Text>
                    <Edit3 size={14} color={Colors.success} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  resolvedCard: {
    backgroundColor: `${Colors.success}10`,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  cardRowStart: {
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
  checkboxSuccess: {
    backgroundColor: Colors.success,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 12,
  },
  factValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  contextText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resolutionContainer: {
    marginTop: 12,
    marginLeft: 32,
  },
  resolutionLabel: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  resolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resolutionText: {
    color: Colors.success,
    fontSize: 14,
    flex: 1,
  },
  textInputSmall: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  confirmButtonSuccess: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmButtonSuccessText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
});
