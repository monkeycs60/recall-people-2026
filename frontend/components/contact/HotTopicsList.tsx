import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RotateCcw, Trash2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react-native';
import { HotTopic } from '@/types';

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
        <View key={topic.id} className="bg-surface p-4 rounded-lg mb-2">
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textPrimary font-medium mb-2"
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder={t('contact.hotTopic.titlePlaceholder')}
            placeholderTextColor="#71717a"
          />
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
            value={editContext}
            onChangeText={setEditContext}
            placeholder={t('contact.hotTopic.contextEditPlaceholder')}
            placeholderTextColor="#71717a"
            multiline
          />
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
              onPress={() => setEditingId(null)}
            >
              <Text className="text-textSecondary">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-2 rounded-lg bg-primary items-center"
              onPress={handleSaveEdit}
            >
              <Text className="text-white font-semibold">{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (isResolving) {
      return (
        <View key={topic.id} className="bg-success/10 border border-success/30 p-4 rounded-lg mb-2">
          <Text className="text-textPrimary font-medium mb-2">{topic.title}</Text>
          <Text className="text-success text-xs font-medium mb-1">{t('contact.hotTopic.resolutionLabel')}</Text>
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textPrimary text-sm mb-3"
            value={resolutionText}
            onChangeText={setResolutionText}
            placeholder={t('contact.hotTopic.resolutionPlaceholder')}
            placeholderTextColor="#71717a"
            multiline
            autoFocus
          />
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
              onPress={() => setResolvingId(null)}
            >
              <Text className="text-textSecondary">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-2 rounded-lg bg-success items-center"
              onPress={handleConfirmResolve}
            >
              <Text className="text-white font-semibold">{t('contact.hotTopic.archive')}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View
        key={topic.id}
        className={`bg-surface rounded-lg mb-2 overflow-hidden ${isResolved ? 'opacity-70' : ''}`}
      >
        <Pressable
          className="p-4 flex-row items-start"
          onPress={() => !isResolved && handleStartEdit(topic)}
        >
          <View
            className={`w-2.5 h-2.5 rounded-full mt-1.5 mr-3 ${
              isResolved ? 'bg-success' : 'bg-orange-500'
            }`}
          />
          <View className="flex-1">
            <Text className={`font-medium ${isResolved ? 'text-textMuted line-through' : 'text-textPrimary'}`}>
              {topic.title}
            </Text>
            {topic.context && !isResolved && (
              <Text className="text-textSecondary text-sm mt-1">{topic.context}</Text>
            )}
            {isResolved && topic.resolution && !isEditingResolution && (
              <Pressable
                className="flex-row items-center mt-1"
                onPress={() => onUpdateResolution && handleStartEditResolution(topic)}
              >
                <Text className="text-success text-sm flex-1">→ {topic.resolution}</Text>
                {onUpdateResolution && <Edit3 size={12} color="#10B981" />}
              </Pressable>
            )}
            {isResolved && !topic.resolution && onUpdateResolution && !isEditingResolution && (
              <Pressable
                className="mt-1"
                onPress={() => handleStartEditResolution(topic)}
              >
                <Text className="text-textMuted text-sm italic">{t('contact.hotTopic.addResolution')}</Text>
              </Pressable>
            )}
            {isEditingResolution && (
              <View className="mt-2">
                <TextInput
                  className="bg-background py-2 px-3 rounded-lg text-textPrimary text-sm mb-2"
                  value={editResolutionText}
                  onChangeText={setEditResolutionText}
                  placeholder={t('contact.hotTopic.resolutionPlaceholder')}
                  placeholderTextColor="#71717a"
                  multiline
                  autoFocus
                />
                <View className="flex-row gap-2">
                  <Pressable
                    className="py-1.5 px-3 bg-surfaceHover rounded"
                    onPress={() => setEditingResolutionId(null)}
                  >
                    <Text className="text-textSecondary text-sm">{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable
                    className="py-1.5 px-3 bg-success/20 rounded"
                    onPress={handleSaveResolution}
                  >
                    <Text className="text-success text-sm">{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <Text className="text-textMuted text-xs mt-1">
              {isResolved && topic.resolvedAt
                ? t('contact.hotTopic.resolvedAt', { date: new Date(topic.resolvedAt).toLocaleDateString() })
                : new Date(topic.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isResolved ? (
              <Pressable className="p-2" onPress={() => onReopen(topic.id)}>
                <RotateCcw size={18} color="#8B5CF6" />
              </Pressable>
            ) : (
              <Pressable className="p-2" onPress={() => handleStartResolve(topic)}>
                <Check size={18} color="#22C55E" />
              </Pressable>
            )}
            <Pressable className="p-2" onPress={() => handleDelete(topic)}>
              <Trash2 size={18} color="#EF4444" />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View>
      {activeTopics.length === 0 && resolvedTopics.length === 0 && (
        <View className="bg-surface/30 p-4 rounded-lg border border-dashed border-surfaceHover">
          <Text className="text-textMuted text-center">
            {t('contact.hotTopic.emptyState')}
          </Text>
        </View>
      )}

      {activeTopics.map(renderTopic)}

      {resolvedTopics.length > 0 && (
        <Pressable
          className="flex-row items-center justify-center py-3"
          onPress={() => setShowResolved(!showResolved)}
        >
          <Text className="text-textSecondary text-sm mr-1">
            {t('contact.hotTopic.showResolved', { count: resolvedTopics.length })}
          </Text>
          {showResolved ? (
            <ChevronUp size={16} color="#9CA3AF" />
          ) : (
            <ChevronDown size={16} color="#9CA3AF" />
          )}
        </Pressable>
      )}

      {showResolved && resolvedTopics.map(renderTopic)}
    </View>
  );
}
