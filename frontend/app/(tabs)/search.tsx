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
import { BotMessageSquare, Mic, Send, ChevronRight, Trash2 } from 'lucide-react-native';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { noteService } from '@/services/note.service';
import { transcribeAudio, askQuestion, consumeAskQuota } from '@/lib/api';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { showErrorToast, showInfoToast } from '@/lib/error-handler';
import { formatLocalizedDate } from '@/utils/dateLocale';
import { normalizeQuestionText } from '@/utils/questionText';
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
	const askUsed = useSubscriptionStore((state) => state.askUsed);
	const askLimit = useSubscriptionStore((state) => state.askLimit);
	const canUseAsk = useSubscriptionStore((state) => state.canUseAsk);
	const syncQuotas = useSubscriptionStore((state) => state.syncQuotas);

	const [question, setQuestion] = useState('');
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [showPaywall, setShowPaywall] = useState(false);
	const [showTestProFirst, setShowTestProFirst] = useState(true);
	const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const inputRef = useRef<TextInput>(null);

	const historyEntries = useQuestionHistoryStore((state) => state.entries);
	const addHistoryEntry = useQuestionHistoryStore((state) => state.addEntry);
	const removeHistoryEntry = useQuestionHistoryStore((state) => state.removeEntry);

	useFocusEffect(
		useCallback(() => {
			syncQuotas();
			return () => {
				if (durationIntervalRef.current) {
					clearInterval(durationIntervalRef.current);
				}
			};
		}, [syncQuotas])
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

	const checkAndUseAskQuota = async (): Promise<boolean> => {
		if (isPremium) return true;

		if (!canUseAsk()) {
			showInfoToast(
				t('assistant.quotaExhausted'),
				t('subscription.upgradeToPro')
			);
			setShowPaywall(true);
			return false;
		}

		try {
			const result = await consumeAskQuota();
			if (result.success) {
				await syncQuotas();
				return true;
			} else if (result.error === 'quota_exhausted') {
				await syncQuotas();
				showInfoToast(
					t('assistant.quotaExhausted'),
					t('subscription.upgradeToPro')
				);
				setShowPaywall(true);
				return false;
			}
		} catch (error) {
			console.error('[Assistant] Failed to use quota:', error);
		}

		return true;
	};

	const handleSubmit = async () => {
		const normalizedQuestion = normalizeQuestionText(question);
		if (!normalizedQuestion.trim() || isSubmitting) return;

		const canProceed = await checkAndUseAskQuota();
		if (!canProceed) return;

		setQuestion(normalizedQuestion);
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
							title: note.title || t('common.untitledNote'),
							transcription: note.transcription || '',
							createdAt: note.createdAt,
						})),
					};
				})
			);

			const response = await askQuestion({
				question: normalizedQuestion.trim(),
				contacts: allContactsWithNotes,
			});

			const relatedContact = response.relatedContactId
				? contacts.find((contact) => contact.id === response.relatedContactId)
				: null;

			const relatedContactName = relatedContact
				? `${relatedContact.firstName}${relatedContact.lastName ? ` ${relatedContact.lastName}` : ''}`
				: undefined;

			addHistoryEntry({
				question: normalizedQuestion.trim(),
				answerSummary: response.answer,
				relatedContactId: response.relatedContactId || undefined,
				relatedContactName,
			});

			router.push({
				pathname: '/ask-result',
				params: {
					question: normalizedQuestion,
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
				t('common.error'),
				t('errors.askQuestionFailed')
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

		return formatLocalizedDate(date, {
			day: 'numeric',
			month: 'short',
		});
	};

	const handleHistoryItemPress = (entry: QuestionHistoryEntry) => {
		const normalizedQuestion = normalizeQuestionText(entry.question);
		router.push({
			pathname: '/ask-result',
			params: {
				question: normalizedQuestion,
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
				<View style={[styles.header, { paddingTop: insets.top + 14 }]}>
					<View style={styles.titleRow}>
						<Text style={styles.screenTitle}>{t('assistant.title')}</Text>
						<View style={styles.titleIconContainer}>
							<BotMessageSquare size={19} color={Colors.primary} strokeWidth={2.1} />
						</View>
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
							onChangeText={(value) => setQuestion(normalizeQuestionText(value))}
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
									<Mic size={16} color={Colors.primary} />
									<Text style={styles.voiceButtonText}>
										{t('assistant.voiceButton')}
									</Text>
								</>
							)}
						</Pressable>

						<Pressable
							style={[styles.sendButton, canSubmit && styles.sendButtonActive]}
							onPress={handleSubmit}
							disabled={!canSubmit}>
							{isSubmitting ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<>
									<Text
										style={[
											styles.sendButtonText,
											canSubmit && styles.sendButtonTextActive,
										]}>
										{t('assistant.sendButton')}
									</Text>
									<Send
										size={14}
										color={canSubmit ? '#FFFFFF' : Colors.textMuted}
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
						<Animated.View entering={FadeInDown.delay(200)} style={styles.quotaInfo}>
							<Text style={styles.quotaText}>
								{canUseAsk()
									? t('assistant.quotaRemaining', { used: askUsed, limit: askLimit })
									: t('assistant.quotaExhausted')}
							</Text>
						</Animated.View>
					)}

					{historyEntries.length > 0 && (
						<>
							<View style={styles.historyHeaderRow}>
								<Text style={styles.historyTitle}>
									{t('assistant.history.title')}
								</Text>
								<View style={styles.historyBadge}>
									<Text style={styles.historyBadgeText}>{historyEntries.length}</Text>
								</View>
							</View>

							{historyEntries.slice(0, 10).map((entry) => (
								<Pressable
									key={entry.id}
									style={styles.historyCard}
									onPress={() => handleHistoryItemPress(entry)}>
									<View style={styles.historyCardContent}>
										<View style={styles.historyCardTop}>
											<Text style={styles.historyQuestion} numberOfLines={2}>
												{normalizeQuestionText(entry.question)}
											</Text>
											<ChevronRight size={14} color={Colors.textMuted} />
										</View>
										<Text style={styles.historyAnswer} numberOfLines={2}>
											{entry.answerSummary}
										</Text>
										<View style={styles.historyMeta}>
											<Text style={styles.historyDate}>
												{formatHistoryDate(entry.date)}
											</Text>
											{entry.relatedContactName && (
												<Text style={styles.historyContactName}>
													· {entry.relatedContactName}
												</Text>
											)}
										</View>
									</View>
									<Pressable
										style={styles.historyDeleteButton}
										onPress={() => removeHistoryEntry(entry.id)}
										hitSlop={8}>
										<Trash2 size={14} color={Colors.textMuted} />
									</Pressable>
								</Pressable>
							))}
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
		paddingHorizontal: 20,
		paddingBottom: 10,
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 8,
	},
	screenTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 30,
		letterSpacing: -0.8,
		color: Colors.textPrimary,
	},
	titleIconContainer: {
		height: 30,
		justifyContent: 'center',
		transform: [{ translateY: 4 }],
	},
	headerDescription: {
		fontSize: 13,
		color: Colors.textSecondary,
		lineHeight: 20,
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
		paddingBottom: 120,
	},
	inputContainer: {
		backgroundColor: Colors.surface,
		borderRadius: 18,
		padding: 14,
		minHeight: 100,
		...Shadows.elevated,
	},
	input: {
		fontSize: 15,
		color: Colors.textPrimary,
		minHeight: 60,
		textAlignVertical: 'top',
	},
	actionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginTop: 12,
	},
	voiceButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: Colors.primary,
		backgroundColor: 'transparent',
	},
	voiceButtonActive: {
		backgroundColor: Colors.accentLight,
		borderColor: Colors.accent,
	},
	voiceButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: Colors.primary,
	},
	voiceButtonTextActive: {
		fontSize: 13,
		fontWeight: '600',
		color: Colors.accent,
	},
	sendButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
		borderRadius: 14,
		backgroundColor: Colors.surfaceAlt,
	},
	sendButtonActive: {
		backgroundColor: Colors.primary,
		...Shadows.fab,
	},
	sendButtonText: {
		fontSize: 13,
		fontWeight: '600',
		color: Colors.textMuted,
	},
	sendButtonTextActive: {
		color: '#FFFFFF',
	},
	recordingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.accent,
	},
	transcribingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		marginTop: 12,
		paddingVertical: 12,
	},
	transcribingText: {
		fontSize: 14,
		color: Colors.textSecondary,
		fontStyle: 'italic',
	},
	quotaInfo: {
		marginTop: 12,
		paddingVertical: 8,
		paddingHorizontal: 14,
		backgroundColor: Colors.surface,
		borderRadius: 14,
		...Shadows.card,
	},
	quotaText: {
		fontSize: 13,
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	historyHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 24,
		marginBottom: 12,
	},
	historyTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: Colors.textSecondary,
	},
	historyBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 999,
		backgroundColor: Colors.surfaceAlt,
	},
	historyBadgeText: {
		fontSize: 11,
		fontWeight: '600',
		color: Colors.textMuted,
	},
	historyCard: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: Colors.surface,
		borderRadius: 16,
		padding: 14,
		marginBottom: 10,
		...Shadows.card,
	},
	historyCardContent: {
		flex: 1,
		gap: 4,
	},
	historyCardTop: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 4,
	},
	historyQuestion: {
		fontSize: 14,
		fontWeight: '600',
		color: Colors.textPrimary,
		flex: 1,
		paddingRight: 10,
	},
	historyAnswer: {
		fontSize: 12,
		color: Colors.textSecondary,
		lineHeight: 18,
		marginBottom: 8,
	},
	historyMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	historyDate: {
		fontSize: 11,
		color: Colors.textMuted,
		fontFamily: Fonts.mono,
	},
	historyContactName: {
		fontSize: 11,
		color: Colors.textMuted,
	},
	historyDeleteButton: {
		padding: 4,
		marginLeft: 8,
	},
});
