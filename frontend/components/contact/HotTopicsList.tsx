import { View, Text, Pressable, TextInput, Alert, StyleSheet, Image } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RotateCcw, Trash2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react-native';
import { HotTopic } from '@/types';
import { Colors } from '@/constants/theme';

const EMPTY_NEWS_ILLUSTRATION = require('@/assets/ai-assets/empty-news.png');

type HotTopicsListProps = {
  hotTopics: HotTopic[];
  onResolve: (id: string, resolution?: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { title: string; context?: string }) => void;
  onUpdateResolution?: (id: string, resolution: string) => void;
};

export function HotTopicsList({
  hotTopics,
  onResolve,
  onReopen,
  onDelete,
  onEdit,
  onUpdateResolution,
}: HotTopicsListProps) {
  const { t } = useTranslation();
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContext, setEditContext] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [editingResolutionId, setEditingResolutionId] = useState<string | null>(null);
  const [editResolutionText, setEditResolutionText] = useState('');

  const activeTopics = hotTopics.filter((topic) => topic.status === 'active');
  const resolvedTopics = hotTopics.filter((topic) => topic.status === 'resolved');

  const handleStartEdit = (topic: HotTopic) => {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setEditContext(topic.context || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    onEdit(editingId, { title: editTitle.trim(), context: editContext.trim() || undefined });
    setEditingId(null);
  };

  const handleDelete = (topic: HotTopic) => {
    Alert.alert(
      t('contact.hotTopic.deleteTitle'),
      t('contact.hotTopic.deleteConfirm', { title: topic.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(topic.id) },
      ]
    );
  };

  const handleStartResolve = (topic: HotTopic) => {
    setResolvingId(topic.id);
    setResolutionText('');
  };

  const handleConfirmResolve = () => {
    if (!resolvingId) return;
    onResolve(resolvingId, resolutionText.trim() || undefined);
    setResolvingId(null);
    setResolutionText('');
  };

  const handleStartEditResolution = (topic: HotTopic) => {
    setEditingResolutionId(topic.id);
    setEditResolutionText(topic.resolution || '');
  };

  const handleSaveResolution = () => {
    if (!editingResolutionId || !onUpdateResolution) return;
    onUpdateResolution(editingResolutionId, editResolutionText.trim());
    setEditingResolutionId(null);
    setEditResolutionText('');
  };

  const renderTopic = (topic: HotTopic) => {
    const isResolved = topic.status === 'resolved';
    const isEditing = editingId === topic.id;
    const isResolving = resolvingId === topic.id;
    const isEditingResolution = editingResolutionId === topic.id;

    if (isEditing) {
      return (
        <View key={topic.id} style={styles.editCard}>
          <TextInput
            style={styles.editInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder={t('contact.hotTopic.titlePlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.editInput, styles.editInputContext]}
            value={editContext}
            onChangeText={setEditContext}
            placeholder={t('contact.hotTopic.contextEditPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            multiline
          />
          <View style={styles.editActions}>
            <Pressable style={styles.cancelButton} onPress={() => setEditingId(null)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (isResolving) {
      return (
        <View key={topic.id} style={styles.resolveCard}>
          <Text style={styles.resolveTitle}>{topic.title}</Text>
          <Text style={styles.resolveLabel}>{t('contact.hotTopic.resolutionLabel')}</Text>
          <TextInput
            style={styles.resolveInput}
            value={resolutionText}
            onChangeText={setResolutionText}
            placeholder={t('contact.hotTopic.resolutionPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <Pressable style={styles.cancelButton} onPress={() => setResolvingId(null)}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.successButton} onPress={handleConfirmResolve}>
              <Text style={styles.saveButtonText}>{t('contact.hotTopic.archive')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View
        key={topic.id}
        style={[styles.topicCard, isResolved && styles.topicCardResolved]}
      >
        <Pressable
          style={styles.topicContent}
          onPress={() => !isResolved && handleStartEdit(topic)}
        >
          <View style={[styles.statusDot, isResolved ? styles.statusDotResolved : styles.statusDotActive]} />
          <View style={styles.topicTextContainer}>
            <Text style={[styles.topicTitle, isResolved && styles.topicTitleResolved]}>
              {topic.title}
            </Text>
            {topic.context && !isResolved && (
              <Text style={styles.topicContext}>{topic.context}</Text>
            )}
            {isResolved && topic.resolution && !isEditingResolution && (
              <Pressable
                style={styles.resolutionRow}
                onPress={() => onUpdateResolution && handleStartEditResolution(topic)}
              >
                <Text style={styles.resolutionText}>→ {topic.resolution}</Text>
                {onUpdateResolution && <Edit3 size={12} color={Colors.success} />}
              </Pressable>
            )}
            {isResolved && !topic.resolution && onUpdateResolution && !isEditingResolution && (
              <Pressable style={styles.addResolutionButton} onPress={() => handleStartEditResolution(topic)}>
                <Text style={styles.addResolutionText}>{t('contact.hotTopic.addResolution')}</Text>
              </Pressable>
            )}
            {isEditingResolution && (
              <View style={styles.editResolutionContainer}>
                <TextInput
                  style={styles.editResolutionInput}
                  value={editResolutionText}
                  onChangeText={setEditResolutionText}
                  placeholder={t('contact.hotTopic.resolutionPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  autoFocus
                />
                <View style={styles.editResolutionActions}>
                  <Pressable style={styles.smallCancelButton} onPress={() => setEditingResolutionId(null)}>
                    <Text style={styles.smallCancelText}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable style={styles.smallSuccessButton} onPress={handleSaveResolution}>
                    <Text style={styles.smallSuccessText}>{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <Text style={styles.topicDate}>
              {isResolved && topic.resolvedAt
                ? t('contact.hotTopic.resolvedAt', { date: new Date(topic.resolvedAt).toLocaleDateString() })
                : new Date(topic.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.topicActions}>
            {isResolved ? (
              <Pressable style={styles.actionButton} onPress={() => onReopen(topic.id)}>
                <RotateCcw size={18} color={Colors.primary} />
              </Pressable>
            ) : (
              <Pressable style={styles.actionButton} onPress={() => handleStartResolve(topic)}>
                <Check size={18} color={Colors.success} />
              </Pressable>
            )}
            <Pressable style={styles.actionButton} onPress={() => handleDelete(topic)}>
              <Trash2 size={18} color={Colors.error} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View>
      {activeTopics.length === 0 && resolvedTopics.length === 0 && (
        <View style={styles.emptyState}>
          <Image
            source={EMPTY_NEWS_ILLUSTRATION}
            style={styles.emptyStateIllustration}
            resizeMode="contain"
          />
          <Text style={styles.emptyStateTitle}>{t('contact.hotTopic.emptyState')}</Text>
          <Text style={styles.emptyStateDescription}>{t('contact.hotTopic.emptyStateDescription')}</Text>
        </View>
      )}

      {activeTopics.map(renderTopic)}

      {resolvedTopics.length > 0 && (
        <Pressable style={styles.showResolvedButton} onPress={() => setShowResolved(!showResolved)}>
          <Text style={styles.showResolvedText}>
            {t('contact.hotTopic.showResolved', { count: resolvedTopics.length })}
          </Text>
          {showResolved ? (
            <ChevronUp size={16} color={Colors.textMuted} />
          ) : (
            <ChevronDown size={16} color={Colors.textMuted} />
          )}
        </Pressable>
      )}

      {showResolved && resolvedTopics.map(renderTopic)}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    backgroundColor: `${Colors.surface}50`,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyStateIllustration: {
    width: 140,
    height: 110,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  editCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: Colors.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  editInputContext: {
    fontWeight: '400',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHover,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  successButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  resolveCard: {
    backgroundColor: `${Colors.success}15`,
    borderWidth: 1,
    borderColor: `${Colors.success}40`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  resolveTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  resolveLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.success,
    marginBottom: 4,
  },
  resolveInput: {
    backgroundColor: Colors.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  topicCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  topicCardResolved: {
    opacity: 0.7,
  },
  topicContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  statusDotActive: {
    backgroundColor: Colors.warning,
  },
  statusDotResolved: {
    backgroundColor: Colors.success,
  },
  topicTextContainer: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  topicTitleResolved: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  topicContext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  resolutionText: {
    fontSize: 14,
    color: Colors.success,
    flex: 1,
  },
  addResolutionButton: {
    marginTop: 4,
  },
  addResolutionText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  editResolutionContainer: {
    marginTop: 8,
  },
  editResolutionInput: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  editResolutionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallCancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceHover,
    borderRadius: 6,
  },
  smallCancelText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  smallSuccessButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.success}20`,
    borderRadius: 6,
  },
  smallSuccessText: {
    fontSize: 13,
    color: Colors.success,
  },
  topicDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  showResolvedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  showResolvedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 4,
  },
});
