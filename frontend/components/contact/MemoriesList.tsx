import { View, Text, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Trash2, Edit3, Users, User } from 'lucide-react-native';
import { Memory } from '@/types';
import { Colors } from '@/constants/theme';

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
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>Aucun souvenir enregistré</Text>
      </View>
    );
  }

  return (
    <View>
      {memories.map((memory) => {
        const isEditing = editingId === memory.id;

        if (isEditing) {
          return (
            <View key={memory.id} style={styles.editCard}>
              <TextInput
                style={styles.editInput}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description du souvenir"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
              <TextInput
                style={[styles.editInput, styles.editInputSecondary]}
                value={editEventDate}
                onChangeText={setEditEventDate}
                placeholder="Date (optionnel)"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.editActions}>
                <Pressable style={styles.cancelButton} onPress={() => setEditingId(null)}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSaveEdit}>
                  <Text style={styles.saveButtonText}>OK</Text>
                </Pressable>
              </View>
            </View>
          );
        }

        const isHighlighted = highlightId === memory.id;

        return (
          <View
            key={memory.id}
            style={[styles.memoryCard, isHighlighted && styles.memoryCardHighlighted]}
          >
            <Pressable style={styles.memoryContent} onPress={() => handleStartEdit(memory)}>
              <View
                style={[
                  styles.memoryIcon,
                  { backgroundColor: memory.isShared ? `${Colors.info}20` : `${Colors.primary}20` },
                ]}
              >
                {memory.isShared ? (
                  <Users size={14} color={Colors.info} />
                ) : (
                  <User size={14} color={Colors.primary} />
                )}
              </View>
              <View style={styles.memoryTextContainer}>
                <Text style={styles.memoryDescription}>{memory.description}</Text>
                <View style={styles.memoryMeta}>
                  {memory.eventDate && (
                    <Text style={styles.memoryDate}>{memory.eventDate}</Text>
                  )}
                  <Text style={styles.memoryType}>
                    {memory.isShared ? 'Ensemble' : 'Solo'}
                  </Text>
                </View>
                <Text style={styles.memoryCreatedAt}>
                  {new Date(memory.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.memoryActions}>
                <Pressable style={styles.actionButton} onPress={() => handleStartEdit(memory)}>
                  <Edit3 size={16} color={Colors.textMuted} />
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => handleDelete(memory)}>
                  <Trash2 size={16} color={Colors.error} />
                </Pressable>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    backgroundColor: `${Colors.surface}50`,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
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
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  editInputSecondary: {
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
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  memoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  memoryCardHighlighted: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  memoryContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  memoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryTextContainer: {
    flex: 1,
  },
  memoryDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  memoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memoryDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  memoryType: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  memoryCreatedAt: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  memoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
