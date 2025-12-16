import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { Check, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { HotTopic } from '@/types';

type HotTopicsListProps = {
  hotTopics: HotTopic[];
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { title: string; context?: string }) => void;
};

export function HotTopicsList({
  hotTopics,
  onResolve,
  onReopen,
  onDelete,
  onEdit,
}: HotTopicsListProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContext, setEditContext] = useState('');

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
      'Supprimer ce sujet',
      `Supprimer "${topic.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(topic.id) },
      ]
    );
  };

  const renderTopic = (topic: HotTopic) => {
    const isResolved = topic.status === 'resolved';
    const isEditing = editingId === topic.id;

    if (isEditing) {
      return (
        <View key={topic.id} className="bg-surface p-4 rounded-lg mb-2">
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textPrimary font-medium mb-2"
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Titre du sujet"
            placeholderTextColor="#71717a"
          />
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
            value={editContext}
            onChangeText={setEditContext}
            placeholder="Contexte (optionnel)"
            placeholderTextColor="#71717a"
            multiline
          />
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
              onPress={() => setEditingId(null)}
            >
              <Text className="text-textSecondary">Annuler</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-2 rounded-lg bg-primary items-center"
              onPress={handleSaveEdit}
            >
              <Text className="text-white font-semibold">OK</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View
        key={topic.id}
        className={`bg-surface rounded-lg mb-2 overflow-hidden ${isResolved ? 'opacity-60' : ''}`}
      >
        <Pressable
          className="p-4 flex-row items-start"
          onPress={() => handleStartEdit(topic)}
        >
          <View
            className={`w-2.5 h-2.5 rounded-full mt-1.5 mr-3 ${
              isResolved ? 'bg-textMuted' : 'bg-orange-500'
            }`}
          />
          <View className="flex-1">
            <Text className={`font-medium ${isResolved ? 'text-textMuted line-through' : 'text-textPrimary'}`}>
              {topic.title}
            </Text>
            {topic.context && (
              <Text className="text-textSecondary text-sm mt-1">{topic.context}</Text>
            )}
            <Text className="text-textMuted text-xs mt-1">
              {new Date(topic.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isResolved ? (
              <Pressable className="p-2" onPress={() => onReopen(topic.id)}>
                <RotateCcw size={18} color="#8B5CF6" />
              </Pressable>
            ) : (
              <Pressable className="p-2" onPress={() => onResolve(topic.id)}>
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
            Aucun sujet en cours
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
            Voir résolus ({resolvedTopics.length})
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
