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
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BotMessageSquare, FileText, Mic, Send, Sparkles } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/theme';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { noteService } from '@/services/note.service';
import { transcribeAudio, askQuestion, consumeAskQuota } from '@/lib/api';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { ApiError, showErrorToast, showInfoToast } from '@/lib/error-handler';
import { formatLocalizedDate } from '@/utils/dateLocale';
import { normalizeQuestionText } from '@/utils/questionText';
import { filterQuestionEntriesForScope } from '@/utils/contactAssistant';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { QuestionHistoryEntry, useQuestionHistoryStore } from '@/stores/question-history-store';
import { Paywall } from '@/components/Paywall';
import { TestProActivation } from '@/components/TestProActivation';
import {
	CUSTOM_TAB_BAR_BOTTOM_GAP,
	getBottomNavigationInset,
} from '@/constants/bottom-navigation';

const MAX_VISIBLE_SOURCES = 3;

const isQuotaExhaustedError = (error: unknown): boolean => {
	if (!(error instanceof ApiError)) return false;

	return (
			error.backendMessage === 'quota_exhausted' ||
			error.message === 'quota_exhausted' ||
			(error.status === 403 && error.backendMessage?.includes('quota') === true)
		);
	};

const isRateLimitedError = (error: unknown): boolean => {
	if (!(error instanceof ApiError)) return false;

	return (
		error.status === 429 ||
		error.backendMessage?.toLowerCase().includes('too many requests') === true ||
		error.message.toLowerCase().includes('too many requests')
	);
};

export default function AssistantScreen() {
	const { t } = useTranslation();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
	const bottomNavigationInset = getBottomNavigationInset(insets.bottom);

	const { contacts } = useContactsQuery();
	const isPremium = useSubscriptionStore((state) => state.isPremium);
	const askUsed = useSubscriptionStore((state) => state.askUsed);
	const askLimit = useSubscriptionStore((state) => state.askLimit);
	const canUseAsk = useSubscriptionStore((state) => state.canUseAsk);
	const syncQuotas = useSubscriptionStore((state) => state.syncQuotas);

	const [question, setQuestion] = useState('');
	const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [showQuotaPrompt, setShowQuotaPrompt] = useState(false);
	const [showPaywall, setShowPaywall] = useState(false);
	const [showTestProFirst, setShowTestProFirst] = useState(true);
	const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const inputRef = useRef<TextInput>(null);
	const scrollViewRef = useRef<ScrollView>(null);

	const historyEntries = useQuestionHistoryStore((state) => state.entries);
	const addHistoryEntry = useQuestionHistoryStore((state) => state.addEntry);

	const globalHistoryEntries = useMemo(
		() => filterQuestionEntriesForScope(historyEntries, null),
		[historyEntries]
	);
	const chatEntries = useMemo(
		() => [...globalHistoryEntries].reverse(),
		[globalHistoryEntries]
	);
	const hasChat = chatEntries.length > 0 || !!pendingQuestion;
	const totalMessages = chatEntries.length * 2 + (pendingQuestion ? 2 : 0);
	const quickPrompts = useMemo(
		() => [
			t('assistant.quickPrompts.startup'),
			t('assistant.quickPrompts.birthdaySoon'),
			t('assistant.quickPrompts.music'),
		],
		[t]
	);

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

	const showAssistantQuotaPrompt = useCallback(() => {
		setShowQuotaPrompt(true);
	}, []);

	const handleOpenPaywallFromQuotaPrompt = () => {
		setShowQuotaPrompt(false);
		setShowPaywall(true);
	};

	const scrollToEnd = useCallback((animated = true) => {
		requestAnimationFrame(() => {
			scrollViewRef.current?.scrollToEnd({ animated });
		});
	}, []);

	useEffect(() => {
		if (hasChat) {
			scrollToEnd(false);
		}
	}, [hasChat, scrollToEnd]);

	useEffect(() => {
		if (pendingQuestion || globalHistoryEntries.length > 0) {
			scrollToEnd();
		}
	}, [globalHistoryEntries.length, pendingQuestion, scrollToEnd]);

	const formatDuration = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const formatHistoryDate = useCallback(
		(dateString: string): string => {
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
		},
		[t]
	);

	const datedEntries = useMemo(() => {
		let previousDateLabel = '';
		return chatEntries.map((entry, index) => {
			const dateLabel = formatHistoryDate(entry.date);
			const showDateDivider = dateLabel !== previousDateLabel;
			previousDateLabel = dateLabel;
			return {
				entry,
				dateLabel,
				showDateDivider,
				isLast: index === chatEntries.length - 1,
			};
		});
	}, [chatEntries, formatHistoryDate]);

	const formatSourceDate = (dateString: string): string => {
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return '';

		return formatLocalizedDate(date, {
			day: 'numeric',
			month: 'short',
		});
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

		if (!useSubscriptionStore.getState().canUseAsk()) {
			showAssistantQuotaPrompt();
			return false;
		}

		try {
			const result = await consumeAskQuota();
			if (result.success) {
				await syncQuotas();
				return true;
			} else if (result.error === 'quota_exhausted') {
				await syncQuotas();
				showAssistantQuotaPrompt();
				return false;
			}
		} catch (error) {
			const apiMessage = error instanceof ApiError
				? `${error.status ?? 'unknown'} ${error.backendMessage ?? error.message}`
				: error instanceof Error
					? error.message
					: String(error);
			console.warn('[Assistant] Failed to use quota:', apiMessage);

			if (isQuotaExhaustedError(error)) {
				await syncQuotas();
				showAssistantQuotaPrompt();
				return false;
			}

			if (isRateLimitedError(error)) {
				showInfoToast(
					t('errors.tooManyRequests'),
					t('errors.tooManyRequestsDescription'),
					4000
				);
				return false;
			}

			showErrorToast(
				t('common.error'),
				t('errors.askQuestionFailed')
			);
			return false;
		}

		return true;
	};

	const handleSubmit = async (questionOverride?: string) => {
		const normalizedQuestion = normalizeQuestionText(questionOverride ?? question);
		const trimmedQuestion = normalizedQuestion.trim();
		if (!trimmedQuestion || isSubmitting) return;

		const canProceed = await checkAndUseAskQuota();
		if (!canProceed) return;

		setQuestion('');
		setPendingQuestion(trimmedQuestion);
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
				question: trimmedQuestion,
				contacts: allContactsWithNotes,
			}, {
				showErrorToast: false,
			});

			const relatedContact = response.relatedContactId
				? contacts.find((contact) => contact.id === response.relatedContactId)
				: null;

			const relatedContactName = relatedContact
				? `${relatedContact.firstName}${relatedContact.lastName ? ` ${relatedContact.lastName}` : ''}`
				: undefined;

			addHistoryEntry({
				question: trimmedQuestion,
				answerSummary: response.answer,
				sources: response.sources,
				relatedContactId: response.relatedContactId || undefined,
				relatedContactName,
				noInfoFound: response.noInfoFound,
			});
		} catch (error) {
			const apiMessage = error instanceof ApiError
				? `${error.status ?? 'unknown'} ${error.backendMessage ?? error.message}`
				: error instanceof Error
					? error.message
					: String(error);
			console.warn('[Assistant] Submit error:', apiMessage);

			if (isQuotaExhaustedError(error)) {
				await syncQuotas();
				showAssistantQuotaPrompt();
				return;
			}

			if (isRateLimitedError(error)) {
				await syncQuotas();
				const latestSubscription = useSubscriptionStore.getState();

				if (!latestSubscription.isPremium && !latestSubscription.isTestPro && !latestSubscription.canUseAsk()) {
					showAssistantQuotaPrompt();
					return;
				}

				showInfoToast(
					t('errors.tooManyRequests'),
					t('errors.tooManyRequestsDescription'),
					4000
				);
				return;
			}

			showErrorToast(
				t('common.error'),
				t('errors.askQuestionFailed')
			);
		} finally {
			setIsSubmitting(false);
			setPendingQuestion(null);
		}
	};

	const handleOpenContact = (contactId?: string | null) => {
		if (contactId) {
			router.push(`/contact/${contactId}`);
		}
	};

	const renderPromptChip = (prompt: string, index: number) => (
		<Pressable
			key={`${prompt}-${index}`}
			style={styles.promptChip}
			onPress={() => handleSubmit(prompt)}
			disabled={isSubmitting || isRecording || isTranscribing}>
			<Text style={styles.promptChipText} numberOfLines={1}>
				{prompt}
			</Text>
		</Pressable>
	);

	const renderSource = (entry: QuestionHistoryEntry, source: NonNullable<QuestionHistoryEntry['sources']>[number]) => {
		const relatedContact = contacts.find((contact) => contact.id === source.contactId);
		const sourceDate = formatSourceDate(source.noteDate);

		return (
			<Pressable
				key={`${entry.id}-${source.noteId}`}
				style={styles.sourceRow}
				onPress={() => handleOpenContact(source.contactId)}>
				<View style={styles.sourceIcon}>
					<FileText size={14} color={Colors.primary} strokeWidth={2.2} />
				</View>
				<View style={styles.sourceBody}>
					<Text style={styles.sourceTitle} numberOfLines={1}>
						{source.contactName}
					</Text>
					<Text style={styles.sourceMeta} numberOfLines={1}>
						{source.noteTitle}
						{sourceDate ? ` · ${sourceDate}` : ''}
					</Text>
					{source.relevantExcerpt && (
						<Text style={styles.sourceExcerpt} numberOfLines={2}>
							{source.relevantExcerpt}
						</Text>
					)}
				</View>
				{relatedContact && (
					<View style={styles.sourceContactMark}>
						<Text style={styles.sourceContactInitial} numberOfLines={1} adjustsFontSizeToFit>
							{relatedContact.firstName.slice(0, 1).toUpperCase()}
						</Text>
					</View>
				)}
			</Pressable>
		);
	};

	const renderAssistantCard = (entry: QuestionHistoryEntry) => {
		const sources = entry.sources ?? [];
		const visibleSources = sources.slice(0, MAX_VISIBLE_SOURCES);
		const hiddenSourceCount = Math.max(0, sources.length - visibleSources.length);
		const relatedContact = entry.relatedContactId
			? contacts.find((contact) => contact.id === entry.relatedContactId)
			: undefined;

		return (
			<View style={styles.assistantBlock}>
				<View style={styles.assistantDot} />
				<View style={styles.answerStack}>
					<View style={styles.answerCard}>
						{entry.noInfoFound && (
							<Text style={styles.answerStatus}>{t('assistant.chat.noInfoTitle')}</Text>
						)}
						<Text style={styles.answerText}>{entry.answerSummary}</Text>

						{entry.relatedContactId && entry.relatedContactName && (
							<Pressable
								style={styles.relatedContactButton}
								onPress={() => handleOpenContact(entry.relatedContactId)}>
								{relatedContact ? (
									<ContactAvatar
										firstName={relatedContact.firstName}
										lastName={relatedContact.lastName}
										gender={relatedContact.gender}
										avatarUrl={relatedContact.avatarUrl}
										size="tiny"
										cacheKey={relatedContact.updatedAt}
									/>
								) : null}
								<Text style={styles.relatedContactText} numberOfLines={1}>
									{entry.relatedContactName}
								</Text>
							</Pressable>
						)}

						{visibleSources.length > 0 && (
							<View style={styles.sourcesPanel}>
								<Text style={styles.sourcesTitle}>{t('assistant.chat.sourcesTitle')}</Text>
								{visibleSources.map((source) => renderSource(entry, source))}
								{hiddenSourceCount > 0 && (
									<Text style={styles.moreSourcesText}>
										{t('assistant.chat.moreSources', { count: hiddenSourceCount })}
									</Text>
								)}
							</View>
						)}
					</View>

				</View>
			</View>
		);
	};

	const canSubmit = question.trim().length > 0 && !isRecording && !isTranscribing && !isSubmitting;
	const headerSubtitle = hasChat
		? t('assistant.chat.messageCount', { count: totalMessages })
		: isPremium
			? t('assistant.chat.ready')
			: canUseAsk()
				? t('assistant.quotaRemaining', { used: askUsed, limit: askLimit })
				: t('assistant.quotaExhausted');

	return (
		<KeyboardAvoidingView
			style={{ flex: 1 }}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={0}>
			<View style={styles.container}>
				<View style={[styles.header, { paddingTop: insets.top + 14 }]}>
					<View style={styles.headerSide} />
					<View style={styles.headerTitleGroup}>
						<Text style={styles.screenTitle}>{t('assistant.title')}</Text>
						<Text style={styles.headerSubtitle} numberOfLines={1}>
							{headerSubtitle}
						</Text>
					</View>
					<View style={styles.headerSide} />
				</View>

				<ScrollView
					ref={scrollViewRef}
					style={styles.messages}
					contentContainerStyle={styles.messagesContent}
					keyboardShouldPersistTaps="handled"
					onContentSizeChange={() => scrollToEnd()}>
					{!hasChat ? (
						<Animated.View entering={FadeInDown.duration(260)} style={styles.emptyState}>
							<View style={styles.emptyOrb}>
								<Sparkles size={28} color={Colors.textInverse} strokeWidth={2.1} />
							</View>
							<Text style={styles.emptyTitle}>
								{t('assistant.emptyState.titleStart')}{' '}
								<Text style={styles.emptyTitleAccent}>
									{t('assistant.emptyState.titleAccent')}
								</Text>
								.
							</Text>
							<Text style={styles.emptySubtitle}>
								{t('assistant.emptyState.description')}
							</Text>
							<View style={styles.emptyPrompts}>
								{quickPrompts.map(renderPromptChip)}
							</View>
						</Animated.View>
					) : (
						<>
							{datedEntries.map(({ entry, dateLabel, showDateDivider }) => (
								<View key={entry.id} style={styles.turnGroup}>
									{showDateDivider && (
										<View style={styles.dayDivider}>
											<View style={styles.dayDividerLine} />
											<Text style={styles.dayDividerText}>{dateLabel}</Text>
											<View style={styles.dayDividerLine} />
										</View>
									)}

									<View style={styles.userBubbleRow}>
										<View style={styles.userBubble}>
											<Text style={styles.userBubbleText}>{entry.question}</Text>
										</View>
									</View>
									{renderAssistantCard(entry)}
								</View>
							))}

							{pendingQuestion && (
								<Animated.View entering={FadeInDown.duration(180)} style={styles.turnGroup}>
									{chatEntries.length === 0 && (
										<View style={styles.dayDivider}>
											<View style={styles.dayDividerLine} />
											<Text style={styles.dayDividerText}>{t('assistant.history.today')}</Text>
											<View style={styles.dayDividerLine} />
										</View>
									)}
									<View style={styles.userBubbleRow}>
										<View style={styles.userBubble}>
											<Text style={styles.userBubbleText}>{pendingQuestion}</Text>
										</View>
									</View>
									<View style={styles.assistantBlock}>
										<View style={styles.assistantDot} />
										<View style={styles.thinkingCard}>
											<ActivityIndicator size="small" color={Colors.primary} />
											<Text style={styles.thinkingText}>{t('assistant.chat.thinking')}</Text>
										</View>
									</View>
								</Animated.View>
							)}
						</>
					)}
				</ScrollView>

				<View
					style={[
						styles.composerArea,
						{
							paddingBottom: bottomNavigationInset + CUSTOM_TAB_BAR_BOTTOM_GAP + 84,
						},
					]}>
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

					{isRecording && (
						<Animated.View entering={FadeIn} exiting={FadeOut} style={styles.recordingStatus}>
							<View style={styles.recordingDot} />
							<Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
						</Animated.View>
					)}

					<View style={styles.inputShell}>
						<TextInput
							ref={inputRef}
							style={styles.input}
							placeholder={
								hasChat
									? t('assistant.chat.inputPlaceholderFollowUp')
									: t('assistant.chat.inputPlaceholderEmpty')
							}
							placeholderTextColor={Colors.textMuted}
							value={question}
							onChangeText={(value) => setQuestion(normalizeQuestionText(value))}
							multiline
							maxLength={500}
							editable={!isRecording && !isTranscribing}
							textAlignVertical="center"
						/>
						<Pressable
							style={[styles.iconButton, isRecording && styles.iconButtonActive]}
							onPress={toggleRecording}
							disabled={isTranscribing || isSubmitting}>
							<Mic
								size={18}
								color={isRecording ? Colors.textInverse : Colors.primary}
								strokeWidth={2.3}
							/>
						</Pressable>
						<Pressable
							style={[styles.sendIconButton, canSubmit && styles.sendIconButtonActive]}
							onPress={() => handleSubmit()}
							disabled={!canSubmit}>
							{isSubmitting ? (
								<ActivityIndicator size="small" color={Colors.textInverse} />
							) : (
								<Send
									size={18}
									color={canSubmit ? Colors.textInverse : Colors.primary}
									strokeWidth={2.4}
								/>
							)}
						</Pressable>
					</View>
				</View>
			</View>

			<Modal
				visible={showQuotaPrompt}
				transparent
				animationType="fade"
				onRequestClose={() => setShowQuotaPrompt(false)}>
				<Pressable style={styles.quotaPromptOverlay} onPress={() => setShowQuotaPrompt(false)}>
					<Pressable style={styles.quotaPromptCard} onPress={(event) => event.stopPropagation()}>
						<View style={styles.quotaPromptIcon}>
							<BotMessageSquare size={22} color={Colors.textInverse} strokeWidth={2.2} />
						</View>
						<Text style={styles.quotaPromptTitle}>
							{t('assistant.quotaPaywall.title', { limit: askLimit })}
						</Text>
						<Text style={styles.quotaPromptDescription}>
							{t('assistant.quotaPaywall.description')}
						</Text>
						<View style={styles.quotaPromptActions}>
							<Pressable
								style={styles.quotaPromptSecondaryButton}
								onPress={() => setShowQuotaPrompt(false)}>
								<Text style={styles.quotaPromptSecondaryText}>
									{t('common.cancel')}
								</Text>
							</Pressable>
							<Pressable
								style={styles.quotaPromptPrimaryButton}
								onPress={handleOpenPaywallFromQuotaPrompt}>
								<Text style={styles.quotaPromptPrimaryText}>
									{t('subscription.upgradeToPro')}
								</Text>
							</Pressable>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

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
		paddingHorizontal: 18,
		paddingBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerSide: {
		width: 42,
		alignItems: 'center',
	},
	headerTitleGroup: {
		flex: 1,
		alignItems: 'center',
		gap: 2,
	},
	screenTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 18,
		lineHeight: 24,
		color: Colors.textPrimary,
	},
	headerSubtitle: {
		fontFamily: Fonts.sans.semibold,
		fontSize: 12,
		lineHeight: 16,
		color: Colors.textMuted,
	},
	messages: {
		flex: 1,
	},
	messagesContent: {
		flexGrow: 1,
		paddingHorizontal: 18,
		paddingTop: 4,
		paddingBottom: 18,
	},
	emptyState: {
		flex: 1,
		minHeight: 430,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 18,
		gap: 12,
	},
	emptyOrb: {
		width: 62,
		height: 62,
		borderRadius: 31,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primary,
		marginBottom: 10,
	},
	emptyTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 28,
		lineHeight: 34,
		textAlign: 'center',
		color: Colors.textPrimary,
		maxWidth: 300,
	},
	emptyTitleAccent: {
		color: Colors.primary,
	},
	emptySubtitle: {
		fontFamily: Fonts.sans.medium,
		fontSize: 14,
		lineHeight: 21,
		textAlign: 'center',
		color: Colors.textMuted,
		marginBottom: 12,
	},
	emptyPrompts: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 8,
		maxWidth: 320,
	},
	turnGroup: {
		gap: 12,
	},
	dayDivider: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: 8,
		marginBottom: 6,
	},
	dayDividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: Colors.hairline,
	},
	dayDividerText: {
		fontFamily: Fonts.sans.bold,
		fontSize: 11,
		lineHeight: 14,
		color: Colors.textMuted,
	},
	userBubbleRow: {
		alignItems: 'flex-end',
	},
	userBubble: {
		maxWidth: '82%',
		backgroundColor: Colors.primary,
		borderRadius: 18,
		borderTopRightRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 11,
	},
	userBubbleText: {
		fontFamily: Fonts.sans.bold,
		fontSize: 14,
		lineHeight: 20,
		color: Colors.textInverse,
	},
	assistantBlock: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		marginBottom: 4,
	},
	assistantDot: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: Colors.primary,
		marginTop: 2,
	},
	answerStack: {
		flex: 1,
		gap: 10,
	},
	answerCard: {
		backgroundColor: Colors.surface,
		borderRadius: 18,
		borderTopLeftRadius: 8,
		padding: 14,
		borderWidth: 1,
		borderColor: Colors.hairline,
		gap: 12,
	},
	answerStatus: {
		fontFamily: Fonts.sans.semibold,
		fontSize: 13,
		lineHeight: 19,
		color: Colors.textSecondary,
	},
	answerText: {
		fontFamily: Fonts.sans.medium,
		fontSize: 15,
		lineHeight: 23,
		color: Colors.textPrimary,
	},
	relatedContactButton: {
		alignSelf: 'flex-start',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		maxWidth: '100%',
		paddingLeft: 4,
		paddingRight: 12,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: Colors.primaryLight,
	},
	relatedContactText: {
		flexShrink: 1,
		fontFamily: Fonts.sans.bold,
		fontSize: 12,
		lineHeight: 16,
		color: Colors.primaryDark,
	},
	sourcesPanel: {
		gap: 8,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: Colors.hairline,
	},
	sourcesTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 11,
		lineHeight: 14,
		color: Colors.textMuted,
	},
	sourceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 10,
		borderRadius: 12,
		backgroundColor: Colors.surfaceAlt,
	},
	sourceIcon: {
		width: 28,
		height: 28,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primaryLight,
	},
	sourceBody: {
		flex: 1,
		minWidth: 0,
	},
	sourceTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 12,
		lineHeight: 16,
		color: Colors.textPrimary,
	},
	sourceMeta: {
		fontFamily: Fonts.sans.semibold,
		fontSize: 11,
		lineHeight: 15,
		color: Colors.textMuted,
	},
	sourceExcerpt: {
		fontFamily: Fonts.sans.medium,
		fontSize: 11,
		lineHeight: 16,
		color: Colors.textSecondary,
		marginTop: 4,
	},
	sourceContactMark: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.hairline,
	},
	sourceContactInitial: {
		fontFamily: Fonts.sans.bold,
		fontSize: 12,
		color: Colors.primary,
	},
	moreSourcesText: {
		fontFamily: Fonts.sans.semibold,
		fontSize: 11,
		lineHeight: 15,
		color: Colors.textMuted,
	},
	thinkingCard: {
		flex: 1,
		minHeight: 54,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: Colors.surface,
		borderRadius: 18,
		borderTopLeftRadius: 8,
		paddingHorizontal: 14,
		borderWidth: 1,
		borderColor: Colors.hairline,
	},
	thinkingText: {
		fontFamily: Fonts.sans.semibold,
		fontSize: 13,
		lineHeight: 18,
		color: Colors.textSecondary,
	},
	quotaPromptOverlay: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 22,
		backgroundColor: 'rgba(29, 26, 46, 0.36)',
	},
	quotaPromptCard: {
		width: '100%',
		maxWidth: 360,
		alignItems: 'center',
		gap: 12,
		padding: 20,
		borderRadius: 18,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.hairline,
	},
	quotaPromptIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primary,
		marginBottom: 2,
	},
	quotaPromptTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 18,
		lineHeight: 24,
		textAlign: 'center',
		color: Colors.textPrimary,
	},
	quotaPromptDescription: {
		fontFamily: Fonts.sans.medium,
		fontSize: 14,
		lineHeight: 21,
		textAlign: 'center',
		color: Colors.textSecondary,
	},
	quotaPromptActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		width: '100%',
		marginTop: 4,
	},
	quotaPromptSecondaryButton: {
		flex: 1,
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 14,
		backgroundColor: Colors.surfaceAlt,
	},
	quotaPromptPrimaryButton: {
		flex: 1,
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 14,
		backgroundColor: Colors.primary,
	},
	quotaPromptSecondaryText: {
		fontFamily: Fonts.sans.bold,
		fontSize: 13,
		lineHeight: 17,
		color: Colors.textSecondary,
	},
	quotaPromptPrimaryText: {
		fontFamily: Fonts.sans.bold,
		fontSize: 13,
		lineHeight: 17,
		color: Colors.textInverse,
	},
	composerArea: {
		paddingHorizontal: 12,
		paddingTop: 8,
		backgroundColor: Colors.background,
		borderTopWidth: 1,
		borderTopColor: Colors.hairline,
		gap: 8,
	},
	transcribingContainer: {
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 14,
		backgroundColor: Colors.surface,
	},
	transcribingText: {
		fontFamily: Fonts.sans.semibold,
		fontSize: 12,
		lineHeight: 16,
		color: Colors.textSecondary,
	},
	recordingStatus: {
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 14,
		backgroundColor: Colors.accentLight,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.accent,
	},
	recordingText: {
		fontFamily: Fonts.sans.bold,
		fontSize: 12,
		lineHeight: 16,
		color: Colors.accent,
	},
	promptChip: {
		minHeight: 34,
		maxWidth: 230,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 13,
		borderRadius: 17,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.hairline,
	},
	promptChipText: {
		fontFamily: Fonts.sans.bold,
		fontSize: 12,
		lineHeight: 16,
		color: Colors.primary,
	},
	inputShell: {
		minHeight: 48,
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: 8,
		padding: 6,
		borderRadius: 24,
		backgroundColor: Colors.surface,
		borderWidth: 1,
		borderColor: Colors.hairline,
	},
	input: {
		flex: 1,
		minHeight: 38,
		maxHeight: 96,
		paddingHorizontal: 12,
		paddingTop: Platform.OS === 'ios' ? 10 : 7,
		paddingBottom: Platform.OS === 'ios' ? 9 : 7,
		fontFamily: Fonts.sans.semibold,
		fontSize: 14,
		lineHeight: 20,
		color: Colors.textPrimary,
	},
	iconButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primaryLight,
	},
	iconButtonActive: {
		backgroundColor: Colors.accent,
	},
	sendIconButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primaryLight,
	},
	sendIconButtonActive: {
		backgroundColor: Colors.primary,
	},
});
