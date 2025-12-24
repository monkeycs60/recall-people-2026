import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { Trash2, Edit3, Users, User } from 'lucide-react-native';
import { Memory } from '@/types';

type MemoriesListProps = {
  memories: Memory[];
  onEdit: (id: string, data: { description: string; eventDate?: string }) => void;
  onDelete: (id: string) => void;
  highlightId?: string;
};

export function MemoriesList({ memories, onEdit, onDelete, highlightId }: MemoriesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');

  const handleStartEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditDescription(memory.description);
    setEditEventDate(memory.eventDate || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editDescription.trim()) return;
    onEdit(editingId, {
      description: editDescription.trim(),
      eventDate: editEventDate.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleDelete = (memory: Memory) => {
    Alert.alert(
      'Supprimer ce souvenir',
      `Supprimer "${memory.description}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(memory.id) },
      ]
    );
  };

  if (memories.length === 0) {
    return (
      <View className="bg-surface/30 p-4 rounded-lg border border-dashed border-surfaceHover">
        <Text className="text-textMuted text-center">
          Aucun souvenir enregistré
        </Text>
      </View>
    );
  }

  return (
    <View>
      {memories.map((memory) => {
        const isEditing = editingId === memory.id;

        if (isEditing) {
          return (
            <View key={memory.id} className="bg-surface p-4 rounded-lg mb-2">
              <TextInput
                className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-2"
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description du souvenir"
                placeholderTextColor="#71717a"
                multiline
              />
              <TextInput
                className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
                value={editEventDate}
                onChangeText={setEditEventDate}
                placeholder="Date (optionnel)"
                placeholderTextColor="#71717a"
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

        const isHighlighted = highlightId === memory.id;

        return (
          <View
            key={memory.id}
            className="rounded-lg mb-2 overflow-hidden"
            style={{
              backgroundColor: isHighlighted ? '#8b5cf620' : '#18181b',
              borderWidth: isHighlighted ? 2 : 0,
              borderColor: isHighlighted ? '#8b5cf6' : 'transparent',
            }}
          >
            <Pressable
              className="p-4 flex-row items-start"
              onPress={() => handleStartEdit(memory)}
            >
              <View
                className={`w-7 h-7 rounded-full mr-3 items-center justify-center ${
                  memory.isShared ? 'bg-blue-500/20' : 'bg-purple-500/20'
                }`}
              >
                {memory.isShared ? (
                  <Users size={14} color="#3B82F6" />
                ) : (
                  <User size={14} color="#A855F7" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-textPrimary font-medium">{memory.description}</Text>
                <View className="flex-row items-center mt-1">
                  {memory.eventDate && (
                    <Text className="text-textSecondary text-sm mr-2">{memory.eventDate}</Text>
                  )}
                  <Text className="text-textMuted text-xs">
                    {memory.isShared ? 'Ensemble' : 'Solo'}
                  </Text>
                </View>
                <Text className="text-textMuted text-xs mt-1">
                  {new Date(memory.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable className="p-2" onPress={() => handleStartEdit(memory)}>
                  <Edit3 size={16} color="#9CA3AF" />
                </Pressable>
                <Pressable className="p-2" onPress={() => handleDelete(memory)}>
                  <Trash2 size={16} color="#EF4444" />
                </Pressable>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
