import { View, Text, Pressable, Modal, ScrollView, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, FileText, X, Trash2 } from 'lucide-react-native';
import { Note } from '@/types';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

type TranscriptionArchiveProps = {
  notes: Note[];
  onDelete: (id: string) => void;
  highlightId?: string;
};

export function TranscriptionArchive({ notes, onDelete, highlightId }: TranscriptionArchiveProps) {
  const insets = useSafeAreaInsets();
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
        style={styles.headerButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <FileText size={18} color={Colors.textMuted} />
          <Text style={styles.headerText}>
            Transcriptions ({notes.length})
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color={Colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={Colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.listContainer}>
          {notes.map((note, index) => {
            const isHighlighted = highlightId === note.id;
            return (
              <Pressable
                key={note.id}
                style={[
                  styles.noteItem,
                  index < notes.length - 1 && styles.noteItemBorder,
                  isHighlighted && styles.noteItemHighlighted,
                ]}
                onPress={() => setSelectedNote(note)}
              >
                <Text style={styles.noteEmoji}>📝</Text>
                <Text style={isHighlighted ? styles.noteTextHighlighted : styles.noteText}>
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
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {selectedNote?.title || 'Transcription'}
              </Text>
              <Text style={styles.modalDate}>
                {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalActionButton}
                onPress={() => selectedNote && handleDelete(selectedNote)}
              >
                <Trash2 size={20} color={Colors.error} />
              </Pressable>
              <Pressable style={styles.modalActionButton} onPress={() => setSelectedNote(null)}>
                <X size={24} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.transcriptionText}>
              {selectedNote?.transcription || 'Aucune transcription disponible'}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  listContainer: {
    backgroundColor: `${Colors.surface}30`,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  noteItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHover,
  },
  noteItemHighlighted: {
    backgroundColor: '#8b5cf630',
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  noteEmoji: {
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  noteText: {
    color: Colors.textSecondary,
    flex: 1,
  },
  noteTextHighlighted: {
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHover,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  modalDate: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalActionButton: {
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.md,
  },
  transcriptionText: {
    color: Colors.textPrimary,
    lineHeight: 24,
  },
});
