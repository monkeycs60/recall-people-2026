import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Contact, ExtractionResult, HotTopic } from '@/types';
import { Plus, FileText } from 'lucide-react-native';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { hotTopicService } from '@/services/hot-topic.service';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '@/utils/dateLocale';

type ContactHotTopicsMap = Map<string, HotTopic[]>;

function formatLastContactDistance(
	lastContactAt: string | undefined,
	_language: string
): string {
	if (!lastContactAt) return '';
	try {
		return formatDistanceToNow(new Date(lastContactAt), {
			addSuffix: true,
			locale: getDateLocale(),
		});
	} catch {
		return '';
	}
}

export default function DisambiguationScreen() {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const params = useLocalSearchParams();
	const insets = useSafeAreaInsets();

	const extraction: ExtractionResult = JSON.parse(params.extraction as string);
	const possibleContacts: Contact[] = JSON.parse(params.possibleContacts as string);
	const audioUri = params.audioUri as string;
	const transcription = params.transcription as string;

	const [contactHotTopics, setContactHotTopics] = useState<ContactHotTopicsMap>(new Map());
	const hasLoadedRef = useRef(false);

	useFocusEffect(
		useCallback(() => {
			if (hasLoadedRef.current) return;
			hasLoadedRef.current = true;

			const loadHotTopics = async () => {
				const topicsMap: ContactHotTopicsMap = new Map();
				for (const contact of possibleContacts) {
					const topics = await hotTopicService.getByContact(contact.id);
					const activeTopics = topics.filter((topic) => topic.status === 'active');
					topicsMap.set(contact.id, activeTopics.slice(0, 2));
				}
				setContactHotTopics(topicsMap);
			};

			loadHotTopics();
		}, [possibleContacts])
	);

	const handleSelectContact = (contactId: string) => {
		router.replace({
			pathname: '/review',
			params: {
				contactId,
				audioUri,
				transcription,
				extraction: JSON.stringify(extraction),
			},
		});
	};

	const handleCreateNew = () => {
		router.replace({
			pathname: '/review',
			params: {
				contactId: 'new',
				audioUri,
				transcription,
				extraction: JSON.stringify(extraction),
			},
		});
	};

	const firstName = extraction.contactIdentified.firstName;
	const suggestedNickname = extraction.contactIdentified.suggestedNickname;

	const hotTopics = extraction.newHotTopics || extraction.hotTopics || [];
	const facts = extraction.facts || [];
	const contactInfo = extraction.contactInfo;
	const hasContextData =
		facts.length > 0 || hotTopics.length > 0 || contactInfo?.phone || contactInfo?.email;

	return (
		<ScrollView
			style={styles.scrollView}
			contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
		>
			<Text style={styles.title}>
				{t('disambiguation.title', { firstName })}
			</Text>

			<Text style={styles.subtitle}>
				{t('disambiguation.subtitle', { firstName, count: possibleContacts.length })}
			</Text>

			{hasContextData && (
				<View style={styles.contextCard}>
					<View style={styles.contextHeader}>
						<FileText size={16} color={Colors.primary} />
						<Text style={styles.contextLabel}>
							{t('disambiguation.contextLabel')}
						</Text>
					</View>

					{facts.slice(0, 3).map((fact, factIndex) => (
						<Text key={`fact-${factIndex}`} style={styles.contextItem}>
							{fact.factKey}: {fact.factValue}
						</Text>
					))}

					{hotTopics.slice(0, 2).map((topic, topicIndex) => (
						<Text key={`topic-${topicIndex}`} style={styles.contextItem}>
							{topic.title}
						</Text>
					))}

					{contactInfo?.phone && (
						<Text style={styles.contextItem}>{contactInfo.phone}</Text>
					)}
					{contactInfo?.email && (
						<Text style={styles.contextItem}>{contactInfo.email}</Text>
					)}
				</View>
			)}

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>
					{t('disambiguation.existingContacts')}
				</Text>

				{possibleContacts.map((contact) => {
					const topics = contactHotTopics.get(contact.id) || [];
					const lastContactText = formatLastContactDistance(
						contact.lastContactAt,
						i18n.language
					);

					return (
						<Pressable
							key={contact.id}
							style={styles.contactCard}
							onPress={() => handleSelectContact(contact.id)}
						>
							<View style={styles.avatarContainer}>
								<ContactAvatar
									firstName={contact.firstName}
									lastName={contact.lastName}
									gender={contact.gender}
									avatarUrl={contact.avatarUrl}
									size="medium"
									cacheKey={contact.updatedAt}
									recyclingKey={contact.id}
								/>
							</View>

							<View style={styles.contactInfo}>
								<Text style={styles.contactName}>
									{getContactDisplayName(contact)}
								</Text>
								{lastContactText !== '' && (
									<Text style={styles.lastContactText}>
										{lastContactText}
									</Text>
								)}
								{topics.length > 0 && (
									<View style={styles.topicsContainer}>
										{topics.map((topic) => (
											<View key={topic.id} style={styles.topicRow}>
												<View style={styles.topicDot} />
												<Text style={styles.topicText} numberOfLines={1}>
													{topic.title}
												</Text>
											</View>
										))}
									</View>
								)}
							</View>
						</Pressable>
					);
				})}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>
					{t('disambiguation.newContact')}
				</Text>

				<Pressable style={styles.createNewCard} onPress={handleCreateNew}>
					<View style={styles.createNewRow}>
						<Plus size={20} color={Colors.primary} />
						<Text style={styles.createNewText}>
							{t('disambiguation.createNew', { name: suggestedNickname || firstName })}
						</Text>
					</View>

					{suggestedNickname && (
						<Text style={styles.nicknameHint}>
							{t('disambiguation.suggestedNickname', { nickname: suggestedNickname })}
						</Text>
					)}
				</Pressable>
			</View>

			<Pressable style={styles.dontKnowButton} onPress={handleCreateNew}>
				<Text style={styles.dontKnowText}>
					{t('disambiguation.dontKnow')}
				</Text>
			</Pressable>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		backgroundColor: Colors.background,
		paddingHorizontal: 24,
		paddingTop: 16,
	},
	title: {
		fontFamily: Fonts.sans.bold,
		fontSize: 24,
		letterSpacing: -0.5,
		color: Colors.textPrimary,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 15,
		color: Colors.textSecondary,
		marginBottom: 20,
		lineHeight: 22,
	},
	contextCard: {
		backgroundColor: Colors.primaryLight,
		borderRadius: 18,
		padding: 16,
		marginBottom: 20,
	},
	contextHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 12,
	},
	contextLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: Colors.primary,
	},
	contextItem: {
		fontSize: 14,
		color: Colors.textSecondary,
		marginBottom: 4,
		lineHeight: 20,
	},
	section: {
		marginBottom: 20,
	},
	sectionTitle: {
		fontFamily: Fonts.sans.bold,
		fontSize: 18,
		letterSpacing: -0.3,
		color: Colors.textPrimary,
		marginBottom: 12,
	},
	contactCard: {
		backgroundColor: Colors.surface,
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
		...Shadows.card,
	},
	avatarContainer: {
		marginRight: 14,
	},
	contactInfo: {
		flex: 1,
	},
	contactName: {
		fontSize: 17,
		fontWeight: '600',
		color: Colors.textPrimary,
	},
	lastContactText: {
		fontSize: 12,
		color: Colors.textMuted,
		marginTop: 2,
	},
	topicsContainer: {
		marginTop: 6,
		gap: 3,
	},
	topicRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	topicDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: Colors.calendar,
	},
	topicText: {
		fontSize: 13,
		color: Colors.calendar,
		fontWeight: '500',
		flex: 1,
	},
	createNewCard: {
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: Colors.primary,
		padding: 16,
		borderRadius: 16,
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
	createNewRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	createNewText: {
		color: Colors.primary,
		fontWeight: '600',
		marginLeft: 8,
		fontSize: 15,
	},
	nicknameHint: {
		color: Colors.textMuted,
		fontSize: 13,
		textAlign: 'center',
	},
	dontKnowButton: {
		alignItems: 'center',
		paddingVertical: 16,
		marginBottom: 20,
	},
	dontKnowText: {
		fontSize: 14,
		color: Colors.textMuted,
	},
});
