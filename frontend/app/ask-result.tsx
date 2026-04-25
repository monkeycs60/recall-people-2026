import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, Typography, Shadows, Fonts } from '@/constants/theme';
import { getLocaleDateStringLocale } from '@/utils/dateLocale';
import { Sparkle, ChevronRight, UserCircle, Plus } from 'lucide-react-native';

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

  const handleViewNote = (source: AskSource) => {
    router.push(`/contact/${source.contactId}`);
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
    return date.toLocaleDateString(getLocaleDateStringLocale(), {
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
          <Sparkle size={18} color={Colors.primary} />
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
          <Sparkle size={18} color={Colors.primary} />
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
        <Sparkle size={18} color={Colors.primary} />
        <Text style={styles.questionText}>{question}</Text>
      </View>

      <View style={styles.divider} />

      {sources.length > 0 && (
        <Text style={styles.sourceHeaderText}>
          {t('ask.result.sourceHeader', {
            date: formatDate(sources[0].noteDate),
          })}
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  questionContainer: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  questionText: {
    fontFamily: Fonts.sans.semibold,
    fontSize: 16,
    color: Colors.primaryDark,
    lineHeight: 22,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.hairline,
    marginVertical: 20,
  },
  sourceHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  answerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...Shadows.card,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  sourcesSection: {
    marginTop: 8,
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  sourceCardContent: {
    flex: 1,
  },
  sourceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sourceCardDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  viewContactButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    ...Shadows.fab,
  },
  viewContactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    ...Typography.headlineMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateDescription: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  suggestionsTitle: {
    ...Typography.labelLarge,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  suggestionText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addNoteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
