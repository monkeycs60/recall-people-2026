import { View, Text, Pressable, Modal, ScrollView, Alert, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Trash2, ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react-native';
import { Note } from '@/types';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

type NotesTimelineProps = {
  notes: Note[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: { transcription: string }) => void;
  highlightId?: string;
};

function formatRelativeDate(dateString: string, locale: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  const isFrench = locale.startsWith('fr');

  if (diffInDays === 0) {
    return isFrench ? "Aujourd'hui" : 'Today';
  }
  if (diffInDays === 1) {
    return isFrench ? 'Hier' : 'Yesterday';
  }
  if (diffInDays < 7) {
    return isFrench ? `Il y a ${diffInDays} jours` : `${diffInDays} days ago`;
  }

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  };

  return date.toLocaleDateString(locale, options);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + '...';
}

export function NotesTimeline({ notes, onDelete, onUpdate, highlightId }: NotesTimelineProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState('');

  const sortedNotes = [...notes].sort(
    (noteA, noteB) => new Date(noteB.createdAt).getTime() - new Date(noteA.createdAt).getTime()
  );

  const handleDelete = (note: Note) => {
    Alert.alert(
      t('contact.sections.notes'),
      t('contact.deleteDialog.message', { name: note.title || 'Note' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            onDelete(note.id);
            setSelectedNote(null);
          },
        },
      ]
    );
  };

  const toggleExpanded = (noteId: string) => {
    setExpandedNotes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleOpenNote = (note: Note) => {
    setSelectedNote(note);
    setEditedTranscription(note.transcription);
    setIsEditing(false);
  };

  const handleCloseNote = () => {
    if (isEditing && selectedNote && editedTranscription !== selectedNote.transcription) {
      Alert.alert(
        i18n.language.startsWith('fr') ? 'Modifications non sauvegardees' : 'Unsaved changes',
        i18n.language.startsWith('fr')
          ? 'Voulez-vous abandonner vos modifications ?'
          : 'Do you want to discard your changes?',
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: i18n.language.startsWith('fr') ? 'Abandonner' : 'Discard',
            style: 'destructive',
            onPress: () => {
              setSelectedNote(null);
              setIsEditing(false);
            },
          },
        ]
      );
    } else {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const handleStartEditing = () => {
    if (selectedNote) {
      setEditedTranscription(selectedNote.transcription);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (selectedNote && editedTranscription.trim() !== selectedNote.transcription) {
      onUpdate(selectedNote.id, { transcription: editedTranscription.trim() });
      setSelectedNote({ ...selectedNote, transcription: editedTranscription.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (selectedNote) {
      setEditedTranscription(selectedNote.transcription);
    }
    setIsEditing(false);
  };

  if (notes.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>{t('contact.sections.notes')}</Text>

      <View style={styles.timelineContainer}>
        {sortedNotes.map((note, index) => {
          const isHighlighted = highlightId === note.id;
          const isExpanded = expandedNotes.has(note.id);
          const isLast = index === sortedNotes.length - 1;
          const previewLength = 120;
          const needsExpansion = note.transcription.length > previewLength;

          return (
            <View key={note.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, isHighlighted && styles.timelineDotHighlighted]} />
                {!isLast && <View style={styles.timelineLine} />}
              </View>

              <View style={styles.timelineContent}>
                <Text style={styles.dateText}>
                  {formatRelativeDate(note.createdAt, i18n.language)}
                </Text>

                <Pressable
                  style={[
                    styles.noteCard,
                    isHighlighted && styles.noteCardHighlighted,
                  ]}
                  onPress={() => handleOpenNote(note)}
                >
                  {note.title && (
                    <Text style={styles.noteTitle}>{note.title}</Text>
                  )}

                  <Text style={styles.transcriptionPreview}>
                    {isExpanded
                      ? note.transcription
                      : truncateText(note.transcription, previewLength)}
                  </Text>

                  {needsExpansion && (
                    <Pressable
                      style={styles.expandButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        toggleExpanded(note.id);
                      }}
                    >
                      <Text style={styles.expandButtonText}>
                        {isExpanded
                          ? (i18n.language.startsWith('fr') ? 'Voir moins' : 'See less')
                          : (i18n.language.startsWith('fr') ? 'Voir plus' : 'See more')}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color={Colors.primary} />
                      ) : (
                        <ChevronDown size={14} color={Colors.primary} />
                      )}
                    </Pressable>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <Modal
        visible={selectedNote !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseNote}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>
                {selectedNote?.title || t('contact.sections.notes')}
              </Text>
              <Text style={styles.modalDate}>
                {selectedNote && formatRelativeDate(selectedNote.createdAt, i18n.language)}
              </Text>
            </View>
            <View style={styles.modalActions}>
              {isEditing ? (
                <>
                  <Pressable style={styles.cancelEditButton} onPress={handleCancelEdit}>
                    <Text style={styles.cancelEditButtonText}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable style={styles.saveEditButton} onPress={handleSaveEdit}>
                    <Check size={20} color={Colors.textInverse} />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    style={styles.modalActionButton}
                    onPress={handleStartEditing}
                  >
                    <Pencil size={18} color={Colors.textMuted} />
                  </Pressable>
                  <Pressable
                    style={styles.modalActionButton}
                    onPress={() => selectedNote && handleDelete(selectedNote)}
                  >
                    <Trash2 size={20} color={Colors.error} />
                  </Pressable>
                  <Pressable style={styles.modalActionButton} onPress={handleCloseNote}>
                    <X size={24} color={Colors.textMuted} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
          {isEditing ? (
            <ScrollView
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.editHintContainer}>
                <Pencil size={14} color={Colors.textMuted} />
                <Text style={styles.editHintText}>
                  {i18n.language.startsWith('fr')
                    ? 'Modifiez la transcription ci-dessous'
                    : 'Edit the transcription below'}
                </Text>
              </View>
              <TextInput
                style={styles.transcriptionInput}
                value={editedTranscription}
                onChangeText={setEditedTranscription}
                multiline
                autoFocus
                textAlignVertical="top"
                placeholder={i18n.language.startsWith('fr') ? 'Transcription...' : 'Transcription...'}
                placeholderTextColor={Colors.textMuted}
              />
            </ScrollView>
          ) : (
            <ScrollView style={styles.modalContent}>
              <Pressable onPress={handleStartEditing} style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionText}>
                  {selectedNote?.transcription || ''}
                </Text>
                <View style={styles.editIndicator}>
                  <Pencil size={14} color={Colors.textMuted} />
                  <Text style={styles.editIndicatorText}>
                    {i18n.language.startsWith('fr') ? 'Appuyez pour modifier' : 'Tap to edit'}
                  </Text>
                </View>
              </Pressable>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  timelineContainer: {
    paddingLeft: Spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    zIndex: 1,
  },
  timelineDotHighlighted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  noteCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteCardHighlighted: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primaryLight,
  },
  noteTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  transcriptionPreview: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: Colors.primary,
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
    borderBottomColor: Colors.border,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
  },
  modalDate: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
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
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: 26,
  },
  transcriptionContainer: {
    flex: 1,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  editIndicatorText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  editHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  editHintText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  transcriptionInput: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: 26,
    minHeight: 200,
    padding: 0,
  },
  cancelEditButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  cancelEditButtonText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '500',
  },
  saveEditButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
});
