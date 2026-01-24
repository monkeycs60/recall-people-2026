import {
	View,
	Text,
	TextInput,
	Pressable,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Mic, Send } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { noteService } from '@/services/note.service';
import { transcribeAudio, askQuestion } from '@/lib/api';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { showErrorToast } from '@/lib/error-handler';

type Suggestion = {
	id: string;
	text: string;
	contactName: string;
};

export default function AskScreen() {
	const { t } = useTranslation();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams();
	const isVoiceMode = params.mode === 'voice';
	const preselectedContactId = params.contactId as string | undefined;
	const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

	const { contacts } = useContactsQuery();
	const preselectedContact = preselectedContactId
		? contacts.find((contact) => contact.id === preselectedContactId)
		: null;
	const [question, setQuestion] = useState('');
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const inputRef = useRef<TextInput>(null);

	useFocusEffect(
		useCallback(() => {
			loadSuggestions();
			return () => {
				if (durationIntervalRef.current) {
					clearInterval(durationIntervalRef.current);
				}
			};
		}, [contacts, preselectedContact])
	);

	const loadSuggestions = async () => {
		const newSuggestions: Suggestion[] = [];

		if (preselectedContact) {
			const firstName = preselectedContact.firstName;
			const suggestionTemplates = [
				t('ask.suggestions.recentWith', { firstName }),
				t('ask.suggestions.birthdayOf', { firstName }),
				t('ask.suggestions.newsOf', { firstName }),
			];

			suggestionTemplates.forEach((text, index) => {
				newSuggestions.push({
					id: `${preselectedContact.id}-${index}`,
					text,
					contactName: firstName,
				});
			});
		} else {
			const recentContacts = contacts
				.filter((contact) => contact.lastContactAt)
				.sort((contactA, contactB) => {
					const dateA = new Date(contactA.lastContactAt || 0).getTime();
					const dateB = new Date(contactB.lastContactAt || 0).getTime();
					return dateB - dateA;
				})
				.slice(0, 3);

			for (const contact of recentContacts) {
				const firstName = contact.firstName;
				const suggestionTemplates = [
					t('ask.suggestions.recentWith', { firstName }),
					t('ask.suggestions.birthdayOf', { firstName }),
					t('ask.suggestions.newsOf', { firstName }),
				];

				const randomSuggestion =
					suggestionTemplates[Math.floor(Math.random() * suggestionTemplates.length)];
				newSuggestions.push({
					id: contact.id,
					text: randomSuggestion,
					contactName: firstName,
				});
			}
		}

		setSuggestions(newSuggestions);
	};

	const startRecording = async () => {
		try {
			await setAudioModeAsync({
				playsInSilentMode: true,
				allowsRecording: true,
			});

			await audioRecorder.prepareToRecordAsync();
			await audioRecorder.record();
			setIsRecording(true);
			setRecordingDuration(0);

			durationIntervalRef.current = setInterval(() => {
				setRecordingDuration((prev) => prev + 1);
			}, 1000);

			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error) {
			console.error('[Ask] Recording error:', error);
		}
	};

	const stopRecording = async () => {
		try {
			if (!audioRecorder.isRecording) return;
		} catch {
			return;
		}

		if (durationIntervalRef.current) {
			clearInterval(durationIntervalRef.current);
			durationIntervalRef.current = null;
		}

		try {
			setIsRecording(false);
			setIsTranscribing(true);
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

			await audioRecorder.stop();
			const uri = audioRecorder.uri;

			if (!uri) throw new Error('No audio URI');

			const result = await transcribeAudio(uri);
			setQuestion(result.transcript);
			setIsTranscribing(false);

			inputRef.current?.focus();
		} catch (error) {
			console.error('[Ask] Transcription error:', error);
			setIsTranscribing(false);
		}
	};

	const toggleRecording = () => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	};

	const handleSuggestionPress = (suggestionText: string) => {
		setQuestion(suggestionText);
		inputRef.current?.focus();
	};

	const handleSubmit = async () => {
		if (!question.trim() || isSubmitting) return;

		setIsSubmitting(true);

		try {
			const contactsToQuery = preselectedContact
				? [preselectedContact]
				: contacts;

			const allContactsWithNotes = await Promise.all(
				contactsToQuery.map(async (contact) => {
					const notes = await noteService.getByContact(contact.id);
					return {
						id: contact.id,
						firstName: contact.firstName,
						lastName: contact.lastName,
						notes: notes.map((note) => ({
							id: note.id,
							title: note.title || 'Note sans titre',
							transcription: note.transcription || '',
							createdAt: note.createdAt,
						})),
					};
				})
			);

			const response = await askQuestion({
				question: question.trim(),
				contacts: allContactsWithNotes,
			});

			const relatedContact = response.relatedContactId
				? contacts.find((contact) => contact.id === response.relatedContactId)
				: null;

			router.push({
				pathname: '/ask-result',
				params: {
					question,
					answer: response.answer,
					sources: JSON.stringify(response.sources),
					relatedContactId: response.relatedContactId || undefined,
					relatedContactName: relatedContact
						? `${relatedContact.firstName}${relatedContact.lastName ? ` ${relatedContact.lastName}` : ''}`
						: undefined,
					noInfoFound: response.noInfoFound ? 'true' : 'false',
				},
			});
		} catch (error) {
			console.error('[Ask] Submit error:', error);
			showErrorToast(
				'Erreur',
				"Impossible de répondre à votre question. Vérifiez votre connexion."
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const canSubmit = question.trim().length > 0 && !isRecording && !isTranscribing && !isSubmitting;

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={0}>
			<View style={styles.container}>
				<View
					style={[
						styles.header,
						{ paddingTop: insets.top + Spacing.md },
					]}>
					<Pressable style={styles.backButton} onPress={() => router.back()}>
						<ChevronLeft size={24} color={Colors.textPrimary} />
					</Pressable>
					<Text style={styles.headerTitle}>
						{preselectedContact
							? t('ask.titleAbout', { firstName: preselectedContact.firstName })
							: t('ask.title')}
					</Text>
					<View style={styles.backButton} />
				</View>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					keyboardShouldPersistTaps="handled">
					<View style={styles.inputContainer}>
						<TextInput
							ref={inputRef}
							style={styles.input}
							placeholder={
								preselectedContact
									? t('ask.inputPlaceholderAbout', { firstName: preselectedContact.firstName })
									: t('ask.inputPlaceholder')
							}
							placeholderTextColor={Colors.textMuted}
							value={question}
							onChangeText={setQuestion}
							multiline
							maxLength={500}
							editable={!isRecording && !isTranscribing}
							autoFocus={!isVoiceMode}
							textAlignVertical="top"
						/>
					</View>

					<View style={styles.actionButtons}>
						<Pressable
							style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
							onPress={toggleRecording}
							disabled={isTranscribing}>
							{isRecording ? (
								<Animated.View
									entering={FadeIn}
									style={styles.recordingIndicator}>
									<View style={styles.recordingDot} />
									<Text style={styles.voiceButtonText}>
										{formatDuration(recordingDuration)}
									</Text>
								</Animated.View>
							) : (
								<>
									<Mic size={20} color={Colors.primary} />
									<Text style={styles.voiceButtonText}>
										{t('ask.voiceButton', 'Parler')}
									</Text>
								</>
							)}
						</Pressable>

						<Pressable
							style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
							onPress={handleSubmit}
							disabled={!canSubmit}>
							{isSubmitting ? (
								<ActivityIndicator size="small" color={Colors.textInverse} />
							) : (
								<>
									<Text
										style={[
											styles.sendButtonText,
											!canSubmit && styles.sendButtonTextDisabled,
										]}>
										{t('ask.sendButton', 'Envoyer')}
									</Text>
									<Send
										size={16}
										color={canSubmit ? Colors.textInverse : Colors.textMuted}
									/>
								</>
							)}
						</Pressable>
					</View>

					{isTranscribing && (
						<Animated.View
							entering={FadeIn}
							exiting={FadeOut}
							style={styles.transcribingContainer}>
							<ActivityIndicator size="small" color={Colors.primary} />
							<Text style={styles.transcribingText}>
								Transcription en cours...
							</Text>
						</Animated.View>
					)}

					<View style={styles.divider} />

					<View style={styles.suggestionsContainer}>
						<Text style={styles.suggestionsTitle}>
							{t('ask.suggestionsTitle', '💡 Suggestions :')}
						</Text>

						{suggestions.length > 0 ? (
							suggestions.map((suggestion) => (
								<Pressable
									key={suggestion.id}
									style={styles.suggestionCard}
									onPress={() => handleSuggestionPress(suggestion.text)}>
									<Text style={styles.suggestionText}>{suggestion.text}</Text>
								</Pressable>
							))
						) : (
							<Text style={styles.noSuggestionsText}>
								Enregistre des notes pour voir des suggestions
							</Text>
						)}
					</View>
				</ScrollView>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	backButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: Colors.textPrimary,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: Spacing.lg,
	},
	inputContainer: {
		backgroundColor: Colors.surface,
		borderRadius: BorderRadius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.md,
		minHeight: 120,
	},
	input: {
		fontSize: 16,
		color: Colors.textPrimary,
		minHeight: 80,
		textAlignVertical: 'top',
	},
	actionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		marginTop: Spacing.lg,
	},
	voiceButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.surface,
		borderWidth: 2,
		borderColor: Colors.border,
		paddingVertical: 14,
		borderRadius: 12,
	},
	voiceButtonActive: {
		backgroundColor: '#FEE2E2',
		borderColor: Colors.border,
	},
	voiceButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.primary,
	},
	sendButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.primary,
		paddingVertical: 14,
		borderRadius: 12,
	},
	sendButtonDisabled: {
		backgroundColor: Colors.textMuted,
		opacity: 0.5,
	},
	sendButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.textInverse,
	},
	sendButtonTextDisabled: {
		color: Colors.textInverse,
	},
	recordingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.textInverse,
	},
	transcribingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.md,
		marginTop: Spacing.md,
		paddingVertical: Spacing.md,
	},
	transcribingText: {
		fontSize: 14,
		color: Colors.textSecondary,
		fontStyle: 'italic',
	},
	noSuggestionsText: {
		fontSize: 14,
		color: Colors.textMuted,
		fontStyle: 'italic',
		textAlign: 'center',
		paddingVertical: Spacing.xl,
	},
	divider: {
		height: 1,
		backgroundColor: Colors.border,
		marginVertical: Spacing.xl,
	},
	suggestionsContainer: {
		gap: Spacing.md,
	},
	suggestionsTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: Colors.textSecondary,
		marginBottom: Spacing.sm,
	},
	suggestionCard: {
		backgroundColor: Colors.surface,
		borderRadius: BorderRadius.md,
		padding: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	suggestionText: {
		fontSize: 15,
		color: Colors.textPrimary,
		lineHeight: 22,
	},
});
