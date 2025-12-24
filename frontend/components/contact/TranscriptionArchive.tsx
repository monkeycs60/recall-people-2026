import { View, Text, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, X, Trash2 } from 'lucide-react-native';
import { Note } from '@/types';

type TranscriptionArchiveProps = {
  notes: Note[];
  onDelete: (id: string) => void;
  highlightId?: string;
};

export function TranscriptionArchive({ notes, onDelete, highlightId }: TranscriptionArchiveProps) {
  const hasHighlightedNote = highlightId ? notes.some((note) => note.id === highlightId) : false;
  const [isExpanded, setIsExpanded] = useState(hasHighlightedNote);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleDelete = (note: Note) => {
    Alert.alert(
      'Supprimer cette transcription',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete(note.id);
            setSelectedNote(null);
          },
        },
      ]
    );
  };

  if (notes.length === 0) {
    return null;
  }

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between py-3"
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View className="flex-row items-center">
          <FileText size={18} color="#9CA3AF" />
          <Text className="text-textSecondary ml-2">
            Transcriptions ({notes.length})
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color="#9CA3AF" />
        ) : (
          <ChevronDown size={18} color="#9CA3AF" />
        )}
      </Pressable>

      {isExpanded && (
        <View className="bg-surface/30 rounded-lg overflow-hidden">
          {notes.map((note, index) => {
            const isHighlighted = highlightId === note.id;
            return (
              <Pressable
                key={note.id}
                className={`flex-row items-center p-3 ${
                  index < notes.length - 1 ? 'border-b border-surfaceHover' : ''
                }`}
                style={{
                  backgroundColor: isHighlighted ? '#8b5cf630' : 'transparent',
                  borderLeftWidth: isHighlighted ? 3 : 0,
                  borderLeftColor: isHighlighted ? '#8b5cf6' : 'transparent',
                }}
                onPress={() => setSelectedNote(note)}
              >
                <Text className="text-textMuted mr-2">📝</Text>
                <Text className={isHighlighted ? 'text-textPrimary flex-1 font-medium' : 'text-textSecondary flex-1'}>
                  {new Date(note.createdAt).toLocaleDateString()}
                  {note.title && ` — ${note.title}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal
        visible={selectedNote !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedNote(null)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between p-4 border-b border-surfaceHover">
            <View className="flex-1">
              <Text className="text-textPrimary font-semibold">
                {selectedNote?.title || 'Transcription'}
              </Text>
              <Text className="text-textMuted text-sm">
                {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                className="p-2"
                onPress={() => selectedNote && handleDelete(selectedNote)}
              >
                <Trash2 size={20} color="#EF4444" />
              </Pressable>
              <Pressable className="p-2" onPress={() => setSelectedNote(null)}>
                <X size={24} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>
          <ScrollView className="flex-1 p-4">
            <Text className="text-textPrimary leading-6">
              {selectedNote?.transcription || 'Aucune transcription disponible'}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
