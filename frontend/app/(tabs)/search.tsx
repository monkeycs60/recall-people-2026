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
	Modal,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Mic, Send, Sparkle, History, ChevronDown, ChevronUp, Trash2, User } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { DecoCircle } from '@/components/ui/DecoCircle';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { noteService } from '@/services/note.service';
import { transcribeAudio, askQuestion, useAskTrial } from '@/lib/api';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { showErrorToast, showInfoToast } from '@/lib/error-handler';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { useQuestionHistoryStore, QuestionHistoryEntry } from '@/stores/question-history-store';
import { Paywall } from '@/components/Paywall';
import { TestProActivation } from '@/components/TestProActivation';

export default function AssistantScreen() {
	const { t } = useTranslation();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

	const { contacts } = useContactsQuery();
	const isPremium = useSubscriptionStore((state) => state.isPremium);
	const freeAskTrials = useSubscriptionStore((state) => state.freeAskTrials);
	const setFreeAskTrials = useSubscriptionStore((state) => state.setFreeAskTrials);
	const syncTrialsStatus = useSubscriptionStore((state) => state.syncTrialsStatus);

	const [question, setQuestion] = useState('');
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [showPaywall, setShowPaywall] = useState(false);
	const [showTestProFirst, setShowTestProFirst] = useState(true);
	const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
	const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const inputRef = useRef<TextInput>(null);

	const historyEntries = useQuestionHistoryStore((state) => state.entries);
	const addHistoryEntry = useQuestionHistoryStore((state) => state.addEntry);
	const removeHistoryEntry = useQuestionHistoryStore((state) => state.removeEntry);

	useFocusEffect(
		useCallback(() => {
			syncTrialsStatus();
			return () => {
				if (durationIntervalRef.current) {
					clearInterval(durationIntervalRef.current);
				}
			};
		}, [])
	);

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
			console.error('[Assistant] Recording error:', error);
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
			console.error('[Assistant] Transcription error:', error);
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

	const checkAndUseAskTrial = async (): Promise<boolean> => {
		if (isPremium) return true;

		if (freeAskTrials <= 0) {
			showInfoToast(
				t('assistant.noTrialsLeft'),
				t('subscription.upgradeToPro')
			);
			setShowPaywall(true);
			return false;
		}

		try {
			const result = await useAskTrial();
			if (result.success) {
				setFreeAskTrials(result.remaining);
				return true;
			} else if (result.error === 'no_trials_left') {
				setFreeAskTrials(0);
				showInfoToast(
					t('assistant.noTrialsLeft'),
					t('subscription.upgradeToPro')
				);
				setShowPaywall(true);
				return false;
			}
		} catch (error) {
			console.error('[Assistant] Failed to use trial:', error);
		}

		return true;
	};

	const handleSubmit = async () => {
		if (!question.trim() || isSubmitting) return;

		const canProceed = await checkAndUseAskTrial();
		if (!canProceed) return;

		setIsSubmitting(true);

		try {
			const allContactsWithNotes = await Promise.all(
				contacts.map(async (contact) => {
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

			const relatedContactName = relatedContact
				? `${relatedContact.firstName}${relatedContact.lastName ? ` ${relatedContact.lastName}` : ''}`
				: undefined;

			addHistoryEntry({
				question: question.trim(),
				answerSummary: response.answer,
				relatedContactId: response.relatedContactId || undefined,
				relatedContactName,
			});

			router.push({
				pathname: '/ask-result',
				params: {
					question,
					answer: response.answer,
					sources: JSON.stringify(response.sources),
					relatedContactId: response.relatedContactId || undefined,
					relatedContactName,
					noInfoFound: response.noInfoFound ? 'true' : 'false',
				},
			});
		} catch (error) {
			console.error('[Assistant] Submit error:', error);
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

	const formatHistoryDate = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return t('assistant.history.today');
		} else if (diffDays === 1) {
			return t('assistant.history.yesterday');
		} else if (diffDays < 7) {
			return t('assistant.history.daysAgo', { count: diffDays });
		}

		return date.toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
		});
	};

	const handleHistoryItemPress = (entry: QuestionHistoryEntry) => {
		router.push({
			pathname: '/ask-result',
			params: {
				question: entry.question,
				answer: entry.answerSummary,
				sources: JSON.stringify([]),
				relatedContactId: entry.relatedContactId || undefined,
				relatedContactName: entry.relatedContactName || undefined,
				noInfoFound: 'false',
			},
		});
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={0}>
			<View style={styles.container}>
				<DecoCircle
					color={Colors.primaryLight}
					opacity={0.15}
					size={280}
					position={{ top: -100, right: -80 }}
				/>
				<View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
					<View style={styles.titleRow}>
						<Sparkle size={24} color={Colors.primary} />
						<Text style={styles.screenTitle}>{t('assistant.title')}</Text>
					</View>
					<Text style={styles.headerDescription}>{t('assistant.description')}</Text>
				</View>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.contentContainer}
					keyboardShouldPersistTaps="handled">
					<View style={styles.inputContainer}>
						<TextInput
							ref={inputRef}
							style={styles.input}
							placeholder={t('assistant.inputPlaceholder')}
							placeholderTextColor={Colors.textMuted}
							value={question}
							onChangeText={setQuestion}
							multiline
							maxLength={500}
							editable={!isRecording && !isTranscribing}
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
									<Text style={styles.voiceButtonTextActive}>
										{formatDuration(recordingDuration)}
									</Text>
								</Animated.View>
							) : (
								<>
									<Mic size={20} color={Colors.primary} />
									<Text style={styles.voiceButtonText}>
										{t('assistant.voiceButton')}
									</Text>
								</>
							)}
						</Pressable>

						<Pressable
							style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
							onPress={handleSubmit}
							disabled={!canSubmit}>
							{isSubmitting ? (
								<ActivityIndicator size="small" color={Colors.primary} />
							) : (
								<>
									<Text
										style={[
											styles.sendButtonText,
											!canSubmit && styles.sendButtonTextDisabled,
										]}>
										{t('assistant.sendButton')}
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
								{t('assistant.transcribing')}
							</Text>
						</Animated.View>
					)}

					{!isPremium && (
						<Animated.View entering={FadeInDown.delay(200)} style={styles.trialsInfo}>
							<Text style={styles.trialsText}>
								{freeAskTrials > 0
									? t('assistant.trialsRemaining', { count: freeAskTrials })
									: t('assistant.noTrialsLeft')}
							</Text>
						</Animated.View>
					)}

					{historyEntries.length > 0 && (
						<>
							<View style={styles.divider} />

							<View style={styles.historyContainer}>
								<Pressable
									style={styles.historyHeader}
									onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}>
									<View style={styles.historyTitleRow}>
										<History size={18} color={Colors.textSecondary} />
										<Text style={styles.historyTitle}>
											{t('assistant.history.title')}
										</Text>
										<View style={styles.historyBadge}>
											<Text style={styles.historyBadgeText}>{historyEntries.length}</Text>
										</View>
									</View>
									{isHistoryExpanded ? (
										<ChevronUp size={20} color={Colors.textSecondary} />
									) : (
										<ChevronDown size={20} color={Colors.textSecondary} />
									)}
								</Pressable>

								{isHistoryExpanded && (
									<Animated.View entering={FadeIn.duration(200)}>
										{historyEntries.slice(0, 10).map((entry, index) => (
											<Animated.View
												key={entry.id}
												entering={FadeInDown.delay(index * 50).duration(200)}>
												<Pressable
													style={styles.historyCard}
													onPress={() => handleHistoryItemPress(entry)}>
													<View style={styles.historyCardContent}>
														<Text style={styles.historyQuestion} numberOfLines={2}>
															{entry.question}
														</Text>
														<Text style={styles.historyAnswer} numberOfLines={2}>
															{entry.answerSummary}
														</Text>
														<View style={styles.historyMeta}>
															<Text style={styles.historyDate}>
																{formatHistoryDate(entry.date)}
															</Text>
															{entry.relatedContactName && (
																<View style={styles.historyContact}>
																	<User size={12} color={Colors.textMuted} />
																	<Text style={styles.historyContactName}>
																		{entry.relatedContactName}
																	</Text>
																</View>
															)}
														</View>
													</View>
													<Pressable
														style={styles.historyDeleteButton}
														onPress={() => removeHistoryEntry(entry.id)}
														hitSlop={8}>
														<Trash2 size={16} color={Colors.textMuted} />
													</Pressable>
												</Pressable>
											</Animated.View>
										))}
									</Animated.View>
								)}
							</View>
						</>
					)}
				</ScrollView>
			</View>

			<Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
				{showTestProFirst ? (
					<TestProActivation
						onClose={() => {
							setShowTestProFirst(true);
							setShowPaywall(false);
						}}
						onNotWhitelisted={() => setShowTestProFirst(false)}
					/>
				) : (
					<Paywall
						onClose={() => {
							setShowTestProFirst(true);
							setShowPaywall(false);
						}}
						reason="ai_assistant"
					/>
				)}
			</Modal>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		paddingHorizontal: Spacing.lg,
		paddingBottom: Spacing.md,
		backgroundColor: Colors.background,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	screenTitle: {
		fontFamily: 'PlayfairDisplay_700Bold',
		fontSize: 28,
		color: Colors.textPrimary,
	},
	headerDescription: {
		fontSize: 14,
		color: Colors.textSecondary,
		lineHeight: 20,
		marginTop: Spacing.sm,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: Spacing.lg,
		paddingBottom: 120,
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
		borderColor: Colors.primary,
		paddingVertical: 14,
		borderRadius: BorderRadius.md,
	},
	voiceButtonActive: {
		backgroundColor: Colors.error,
		borderColor: Colors.error,
	},
	voiceButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.primary,
	},
	voiceButtonTextActive: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.textInverse,
	},
	sendButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.sm,
		backgroundColor: Colors.primary,
		paddingVertical: 14,
		borderRadius: BorderRadius.md,
	},
	sendButtonDisabled: {
		backgroundColor: Colors.borderLight,
		opacity: 0.6,
	},
	sendButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.textInverse,
	},
	sendButtonTextDisabled: {
		color: Colors.textMuted,
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
	trialsInfo: {
		marginTop: Spacing.md,
		paddingVertical: Spacing.sm,
		paddingHorizontal: Spacing.md,
		backgroundColor: Colors.surface,
		borderRadius: BorderRadius.md,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	trialsText: {
		fontSize: 13,
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	divider: {
		height: 1,
		backgroundColor: Colors.border,
		marginVertical: Spacing.xl,
	},
	historyContainer: {
		gap: Spacing.md,
	},
	historyHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: Spacing.sm,
	},
	historyTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.sm,
	},
	historyTitle: {
		fontSize: 16,
		fontWeight: '500',
		color: Colors.textSecondary,
	},
	historyBadge: {
		backgroundColor: Colors.primaryLight,
		borderRadius: 10,
		paddingHorizontal: Spacing.sm,
		paddingVertical: 2,
	},
	historyBadgeText: {
		fontSize: 12,
		fontWeight: '600',
		color: Colors.primary,
	},
	historyCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: Colors.surface,
		borderRadius: BorderRadius.md,
		padding: Spacing.md,
		borderWidth: 1,
		borderColor: Colors.border,
		marginBottom: Spacing.sm,
	},
	historyCardContent: {
		flex: 1,
		gap: Spacing.xs,
	},
	historyQuestion: {
		fontSize: 14,
		fontWeight: '600',
		color: Colors.textPrimary,
		lineHeight: 20,
	},
	historyAnswer: {
		fontSize: 13,
		color: Colors.textSecondary,
		lineHeight: 18,
	},
	historyMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.md,
		marginTop: Spacing.xs,
	},
	historyDate: {
		fontSize: 12,
		color: Colors.textMuted,
	},
	historyContact: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	historyContactName: {
		fontSize: 12,
		color: Colors.textMuted,
	},
	historyDeleteButton: {
		padding: Spacing.xs,
		marginLeft: Spacing.sm,
	},
});
