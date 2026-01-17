import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { MessageCircle, FileText, Search, Mic, ChevronRight, UserCircle, Plus } from 'lucide-react-native';

type AskSource = {
  noteId: string;
  noteTitle: string;
  noteDate: string;
  contactId: string;
  contactName: string;
};

type AskResultParams = {
  question: string;
  answer: string;
  sources: string; // JSON string
  relatedContactId?: string;
  relatedContactName?: string;
  noInfoFound?: string; // 'true' or 'false'
  contactNotFound?: string; // 'true' or 'false'
  suggestedContacts?: string; // JSON string of contact suggestions
  isGeneralQuestion?: string; // 'true' or 'false'
};

export default function AskResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<AskResultParams>();

  const question = params.question || '';
  const answer = params.answer || '';
  const sources: AskSource[] = params.sources ? JSON.parse(params.sources) : [];
  const relatedContactId = params.relatedContactId;
  const relatedContactName = params.relatedContactName;
  const noInfoFound = params.noInfoFound === 'true';
  const contactNotFound = params.contactNotFound === 'true';
  const suggestedContacts = params.suggestedContacts ? JSON.parse(params.suggestedContacts) : [];
  const isGeneralQuestion = params.isGeneralQuestion === 'true';

  const [newQuestion, setNewQuestion] = useState('');

  const handleNewQuestion = () => {
    if (newQuestion.trim()) {
      // Navigate back to ask screen with the new question
      router.back();
      // TODO: trigger new ask with newQuestion
    }
  };

  const handleViewNote = (source: AskSource) => {
    // TODO: Navigate to note detail screen
    console.log('View note:', source.noteId);
  };

  const handleViewContact = () => {
    if (relatedContactId) {
      router.push(`/contact/${relatedContactId}`);
    }
  };

  const handleCreateContact = (contactName: string) => {
    // TODO: Navigate to create contact screen with pre-filled name
    console.log('Create contact:', contactName);
  };

  const handleAddNote = (contactName: string) => {
    // TODO: Navigate to add note screen for contact
    console.log('Add note for:', contactName);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Case 1: Contact not found
  if (contactNotFound) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.questionContainer}>
          <MessageCircle size={20} color={Colors.primary} />
          <Text style={styles.questionText}>{question}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>🤔</Text>
          <Text style={styles.emptyStateTitle}>
            {t('ask.contactNotFound.title')}
          </Text>
          <Text style={styles.emptyStateDescription}>
            {t('ask.contactNotFound.description')}
          </Text>

          {suggestedContacts.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>
                {t('ask.contactNotFound.suggestionsTitle')}
              </Text>
              {suggestedContacts.map((contact: { id: string; name: string }) => (
                <Pressable
                  key={contact.id}
                  style={styles.suggestionItem}
                  onPress={() => router.push(`/contact/${contact.id}`)}
                >
                  <UserCircle size={20} color={Colors.textSecondary} />
                  <Text style={styles.suggestionText}>{contact.name}</Text>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            style={styles.createButton}
            onPress={() => handleCreateContact(question)}
          >
            <Plus size={18} color={Colors.primary} />
            <Text style={styles.createButtonText}>
              {t('ask.contactNotFound.createButton')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.newQuestionContainer}>
          <TextInput
            style={styles.newQuestionInput}
            value={newQuestion}
            onChangeText={setNewQuestion}
            placeholder={t('ask.newQuestionPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />
          <Pressable style={styles.micButton}>
            <Mic size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Case 2: No info found
  if (noInfoFound) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.questionContainer}>
          <MessageCircle size={20} color={Colors.primary} />
          <Text style={styles.questionText}>{question}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateEmoji}>😕</Text>
          <Text style={styles.emptyStateTitle}>
            {t('ask.noInfo.title')}
          </Text>
          <Text style={styles.emptyStateDescription}>
            {t('ask.noInfo.description', { contactName: relatedContactName || '' })}
          </Text>

          <Pressable
            style={styles.addNoteButton}
            onPress={() => handleAddNote(relatedContactName || '')}
          >
            <Plus size={18} color={Colors.primary} />
            <Text style={styles.addNoteButtonText}>
              {t('ask.noInfo.addNoteButton', { contactName: relatedContactName || '' })}
            </Text>
          </Pressable>
        </View>

        <View style={styles.newQuestionContainer}>
          <TextInput
            style={styles.newQuestionInput}
            value={newQuestion}
            onChangeText={setNewQuestion}
            placeholder={t('ask.newQuestionPlaceholder')}
            placeholderTextColor={Colors.textMuted}
          />
          <Pressable style={styles.micButton}>
            <Mic size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Case 3: Success - answer with sources
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.questionContainer}>
        <MessageCircle size={20} color={Colors.primary} />
        <Text style={styles.questionText}>{question}</Text>
      </View>

      <View style={styles.divider} />

      {sources.length > 0 && (
        <View style={styles.sourceHeaderContainer}>
          <FileText size={16} color={Colors.textSecondary} />
          <Text style={styles.sourceHeaderText}>
            {t('ask.result.sourceHeader', {
              date: formatDate(sources[0].noteDate),
            })}
          </Text>
        </View>
      )}

      <View style={styles.answerContainer}>
        <Text style={styles.answerText}>{answer}</Text>
      </View>

      {sources.length > 0 && (
        <>
          <View style={styles.divider} />

          <View style={styles.sourcesSection}>
            <Text style={styles.sourcesTitle}>
              📝 {t('ask.result.sourcesTitle')}
            </Text>
            {sources.map((source) => (
              <Pressable
                key={source.noteId}
                style={styles.sourceCard}
                onPress={() => handleViewNote(source)}
              >
                <View style={styles.sourceCardContent}>
                  <Text style={styles.sourceCardTitle}>{source.noteTitle}</Text>
                  <Text style={styles.sourceCardDate}>
                    {formatDate(source.noteDate)}
                  </Text>
                </View>
                <ChevronRight size={20} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      <View style={styles.divider} />

      <View style={styles.newQuestionContainer}>
        <TextInput
          style={styles.newQuestionInput}
          value={newQuestion}
          onChangeText={setNewQuestion}
          placeholder={t('ask.newQuestionPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={handleNewQuestion}
        />
        <Pressable style={styles.micButton}>
          <Mic size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {relatedContactId && relatedContactName && (
        <Pressable style={styles.viewContactButton} onPress={handleViewContact}>
          <Text style={styles.viewContactButtonText}>
            {t('ask.result.viewContactButton', { contactName: relatedContactName })} →
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  questionText: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  sourceHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sourceHeaderText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  answerContainer: {
    paddingVertical: Spacing.sm,
  },
  answerText: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  sourcesSection: {
    marginTop: Spacing.md,
  },
  sourcesTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  sourceCardContent: {
    flex: 1,
  },
  sourceCardTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sourceCardDate: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  newQuestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  newQuestionInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  micButton: {
    padding: Spacing.sm,
  },
  viewContactButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  viewContactButtonText: {
    ...Typography.titleMedium,
    color: Colors.primary,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    ...Typography.headlineMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyStateDescription: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  suggestionsTitle: {
    ...Typography.labelLarge,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  suggestionText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  createButtonText: {
    ...Typography.titleMedium,
    color: Colors.primary,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addNoteButtonText: {
    ...Typography.titleMedium,
    color: Colors.primary,
  },
});
