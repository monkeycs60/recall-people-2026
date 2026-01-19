import {
	View,
	Text,
	FlatList,
	Pressable,
	RefreshControl,
	TextInput,
	ScrollView,
	StyleSheet,
	Image,
} from 'react-native';
import { useState, useRef, useCallback, useMemo } from 'react';
import { Sparkle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useContactPreviewsQuery } from '@/hooks/useContactPreviewsQuery';
import { Contact, HotTopic } from '@/types';
import {
	Search,
	ChevronRight,
	Flame,
	Calendar,
	Plus,
	UserPlus,
	Settings,
	Mic,
} from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { getContactDisplayName } from '@/utils/contactDisplayName';
import { ContactListSkeleton } from '@/components/skeleton/ContactListSkeleton';
import { CreateContactModal } from '@/components/contact/CreateContactModal';
import { queryKeys } from '@/lib/query-keys';
import { contactService } from '@/services/contact.service';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { format, parseISO, isFuture, isPast, differenceInDays } from 'date-fns';

const EMPTY_CONTACTS_ILLUSTRATION = require('@/assets/ai-assets/empty-contacts.png');

const prefetchContactDetails = (
	queryClient: QueryClient,
	contactId: string
) => {
	queryClient.prefetchQuery({
		queryKey: queryKeys.contacts.detail(contactId),
		queryFn: () => contactService.getById(contactId),
		staleTime: 5 * 60 * 1000,
	});
};

function getTopHotTopics(hotTopics: HotTopic[], maxCount: number = 2): { topics: HotTopic[]; remainingCount: number } {
	if (!hotTopics || hotTopics.length === 0) return { topics: [], remainingCount: 0 };

	const activeTopics = hotTopics.filter((topic) => topic.status === 'active');

	const sortedTopics = activeTopics.sort((topicA, topicB) => {
		if (topicA.eventDate && topicB.eventDate) {
			const dateA = parseISO(topicA.eventDate);
			const dateB = parseISO(topicB.eventDate);
			return dateA.getTime() - dateB.getTime();
		}
		if (topicA.eventDate) return -1;
		if (topicB.eventDate) return 1;
		return 0;
	});

	const topics = sortedTopics.slice(0, maxCount);
	const remainingCount = Math.max(0, sortedTopics.length - maxCount);

	return { topics, remainingCount };
}

function formatHotTopicDate(dateString: string): string {
	try {
		const date = parseISO(dateString);
		return format(date, 'd MMM', { locale: fr });
	} catch {
		return '';
	}
}

function isWithinOneMonth(dateString: string | undefined): boolean {
	if (!dateString) return true;
	try {
		const date = parseISO(dateString);
		const now = new Date();
		const daysUntil = differenceInDays(date, now);
		return daysUntil <= 30;
	} catch {
		return true;
	}
}

function formatLastContactTime(lastContactAt: string | undefined): string {
	if (!lastContactAt) return '';

	try {
		const distance = formatDistanceToNow(parseISO(lastContactAt), {
			addSuffix: false,
			locale: fr,
		});
		return `Il y a ${distance}`;
	} catch {
		return '';
	}
}

export default function ContactsScreen() {
	const { t } = useTranslation();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const queryClient = useQueryClient();

	const { contacts, isLoading, refetch, isPlaceholderData } = useContactsQuery();
	const { previews: contactPreviews, refetchAll: refetchPreviews } = useContactPreviewsQuery(contacts);

	const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
	const [isPullRefreshing, setIsPullRefreshing] = useState(false);
	const [filterText, setFilterText] = useState('');

	useFocusEffect(
		useCallback(() => {
			refetch();
			refetchPreviews();
		}, [refetch, refetchPreviews])
	);

	const handleCreateContact = async (firstName: string, lastName: string) => {
		const newContact = await contactService.create({
			firstName,
			lastName: lastName || undefined,
		});
		queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
		setIsCreateModalVisible(false);
		router.push(`/contact/${newContact.id}`);
	};

	const viewabilityConfig = useRef({
		itemVisiblePercentThreshold: 50,
		minimumViewTime: 300,
	}).current;

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: Array<{ item: Contact }> }) => {
			viewableItems.forEach(({ item }) => {
				prefetchContactDetails(queryClient, item.id);
			});
		},
		[queryClient]
	);

	const hasAnimatedRef = useRef(false);
	const shouldAnimate = !hasAnimatedRef.current && !isPlaceholderData;
	if (contacts.length > 0 && !isPlaceholderData) {
		hasAnimatedRef.current = true;
	}

	const recentContacts = useMemo(() => {
		return contacts
			.filter((contact) => contact.lastContactAt)
			.sort((contactA, contactB) => {
				const dateA = new Date(contactA.lastContactAt!).getTime();
				const dateB = new Date(contactB.lastContactAt!).getTime();
				return dateB - dateA;
			})
			.slice(0, 6);
	}, [contacts]);

	const allContacts = useMemo(() => {
		let filteredContacts = contacts;

		if (filterText.trim()) {
			const searchTerm = filterText.toLowerCase();
			filteredContacts = contacts.filter((contact) =>
				contact.firstName.toLowerCase().includes(searchTerm) ||
				(contact.lastName?.toLowerCase().includes(searchTerm))
			);
		}

		return filteredContacts.sort((contactA, contactB) => {
			const dateA = contactA.lastContactAt ? new Date(contactA.lastContactAt).getTime() : 0;
			const dateB = contactB.lastContactAt ? new Date(contactB.lastContactAt).getTime() : 0;
			return dateB - dateA;
		});
	}, [contacts, filterText]);

	const handleRefresh = async () => {
		setIsPullRefreshing(true);
		await Promise.all([refetch(), refetchPreviews()]);
		setIsPullRefreshing(false);
	};

	const renderRecentContact = ({ item }: { item: Contact }) => (
		<Pressable
			style={styles.recentContactItem}
			onPress={() => router.push(`/contact/${item.id}`)}>
			<ContactAvatar
				firstName={item.firstName}
				lastName={item.lastName}
				gender={item.gender}
				avatarUrl={item.avatarUrl}
				size='small'
				cacheKey={item.updatedAt}
				recyclingKey={item.id}
			/>
			<Text style={styles.recentContactName} numberOfLines={1}>
				{item.firstName}
			</Text>
		</Pressable>
	);

	const renderContact = ({ item, index }: { item: Contact; index: number }) => {
		const preview = contactPreviews.get(item.id);
		const hotTopics = preview?.hotTopics || [];
		const { topics: topHotTopics, remainingCount } = getTopHotTopics(hotTopics, 2);
		const lastContactText = formatLastContactTime(item.lastContactAt);

		const content = (
			<Pressable
				style={styles.contactCard}
				onPress={() => router.push(`/contact/${item.id}`)}>
				<View style={styles.avatarContainer}>
					<ContactAvatar
						firstName={item.firstName}
						lastName={item.lastName}
						gender={item.gender}
						avatarUrl={item.avatarUrl}
						size='medium'
						cacheKey={item.updatedAt}
						recyclingKey={item.id}
					/>
				</View>

				<View style={styles.contactInfo}>
					<View style={styles.contactHeader}>
						<Text style={styles.contactName}>
							{getContactDisplayName(item)}
						</Text>
						{lastContactText && (
							<Text style={styles.lastContactTime}>{lastContactText}</Text>
						)}
					</View>

					{topHotTopics.length > 0 && (
						<View style={styles.hotTopicsContainer}>
							{topHotTopics.map((topic) => {
								const isUrgent = isWithinOneMonth(topic.eventDate);
								const IconComponent = isUrgent ? Flame : Calendar;
								return (
									<View key={topic.id} style={styles.hotTopicRow}>
										<IconComponent size={14} color={Colors.warning} />
										<Text style={styles.hotTopicText} numberOfLines={1}>
											{topic.title}
										</Text>
										{topic.eventDate && (
											<Text style={styles.hotTopicDate}>
												({formatHotTopicDate(topic.eventDate)})
											</Text>
										)}
									</View>
								);
							})}
							{remainingCount > 0 && (
								<Text style={styles.hotTopicMore}>+{remainingCount} autre{remainingCount > 1 ? 's' : ''}</Text>
							)}
						</View>
					)}
				</View>

				<ChevronRight size={20} color={Colors.textMuted} />
			</Pressable>
		);

		if (shouldAnimate) {
			return (
				<Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
					{content}
				</Animated.View>
			);
		}

		return content;
	};

	return (
		<View style={styles.container}>
			<View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
				<View style={styles.headerRow}>
					<Text style={styles.screenTitle}>Recall People</Text>
					<Pressable
						style={styles.settingsButton}
						onPress={() => router.push('/(tabs)/profile')}>
						<Settings size={24} color={Colors.textSecondary} />
					</Pressable>
				</View>
			</View>

			{isLoading ? (
				<ContactListSkeleton count={6} />
			) : contacts.length === 0 ? (
				<View style={styles.emptyStateContainer}>
					<Image
						source={EMPTY_CONTACTS_ILLUSTRATION}
						style={styles.emptyStateIllustration}
						resizeMode='contain'
					/>
					<Text style={styles.emptyStateTitle}>
						{t('contacts.noContacts')}
					</Text>
					<Text style={styles.emptyStateDescription}>
						{t('contacts.noContactsDescription')}
					</Text>
					<Pressable
						style={styles.emptyStateButton}
						onPress={() => router.push('/record')}>
						<Mic size={18} color={Colors.textInverse} />
						<Text style={styles.emptyStateButtonText}>
							{t('contacts.createFirstNote')}
						</Text>
					</Pressable>
				</View>
			) : (
				<>
					{recentContacts.length > 0 && (
						<View style={styles.section}>
							<Text style={styles.sectionTitle}>Contacts récents</Text>
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								contentContainerStyle={styles.recentContactsList}>
								<Pressable
									style={styles.addContactCard}
									onPress={() => setIsCreateModalVisible(true)}>
									<View style={styles.addContactIconContainer}>
										<Plus size={18} color={Colors.primary} />
									</View>
									<Text style={styles.addContactLabel}>Ajouter</Text>
								</Pressable>
								{recentContacts.map((contact) => (
									<View key={contact.id}>
										{renderRecentContact({ item: contact })}
									</View>
								))}
							</ScrollView>
						</View>
					)}

					<View style={styles.allContactsSection}>
						<View style={styles.sectionTitleRow}>
							<Text style={styles.sectionTitle}>Tous les contacts</Text>
							{recentContacts.length === 0 && (
								<Pressable
									style={styles.addContactInlineButton}
									onPress={() => setIsCreateModalVisible(true)}>
									<UserPlus size={16} color={Colors.primary} />
									<Text style={styles.addContactInlineText}>
										{t('contacts.addContact')}
									</Text>
								</Pressable>
							)}
						</View>
						<View style={styles.filterInputWrapper}>
							<Search size={16} color={Colors.textMuted} />
							<TextInput
								style={styles.filterInput}
								placeholder={t('contacts.filterPlaceholder')}
								placeholderTextColor={Colors.textMuted}
								value={filterText}
								onChangeText={setFilterText}
							/>
						</View>
						<Pressable
							style={styles.askHint}
							onPress={() => router.push('/(tabs)/search')}>
							<Sparkle size={14} color={Colors.primary} />
							<Text style={styles.askHintText}>{t('contacts.askHint')}</Text>
						</Pressable>
					</View>

					<FlatList
						data={allContacts}
						renderItem={renderContact}
						keyExtractor={(item) => item.id}
						contentContainerStyle={{
							paddingBottom: 140,
							paddingHorizontal: 24,
						}}
						onViewableItemsChanged={onViewableItemsChanged}
						viewabilityConfig={viewabilityConfig}
						refreshControl={
							<RefreshControl
								refreshing={isPullRefreshing}
								onRefresh={handleRefresh}
								tintColor={Colors.primary}
							/>
						}
					/>
				</>
			)}

			<CreateContactModal
				visible={isCreateModalVisible}
				onClose={() => setIsCreateModalVisible(false)}
				onCreate={handleCreateContact}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	screenTitle: {
		fontFamily: 'PlayfairDisplay_700Bold',
		fontSize: 28,
		color: Colors.textPrimary,
	},
	settingsButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	filterInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: Colors.border,
		gap: 8,
	},
	filterInput: {
		flex: 1,
		fontSize: 15,
		color: Colors.textPrimary,
	},
	askHint: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 10,
		paddingLeft: 4,
	},
	askHintText: {
		fontSize: 14,
		color: Colors.primary,
		fontWeight: '500',
	},
	section: {
		paddingHorizontal: 24,
		marginBottom: 16,
	},
	allContactsSection: {
		paddingHorizontal: 24,
		marginBottom: 10,
	},
	sectionTitleRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: Colors.textPrimary,
	},
	addContactInlineButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: Colors.primaryLight,
	},
	addContactInlineText: {
		fontSize: 14,
		fontWeight: '500',
		color: Colors.primary,
	},
	recentContactsList: {
		gap: 12,
		paddingRight: 24,
	},
	recentContactItem: {
		alignItems: 'center',
		width: 58,
	},
	recentContactName: {
		fontSize: 11,
		color: Colors.textSecondary,
		marginTop: 6,
		textAlign: 'center',
		fontWeight: '500',
	},
	addContactCard: {
		alignItems: 'center',
		justifyContent: 'center',
		width: 58,
	},
	addContactIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.surface,
		borderWidth: 2,
		borderColor: Colors.border,
		borderStyle: 'dashed',
		alignItems: 'center',
		justifyContent: 'center',
	},
	addContactLabel: {
		fontSize: 11,
		color: Colors.textSecondary,
		marginTop: 6,
		textAlign: 'center',
		fontWeight: '500',
	},
	contactCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.surface,
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	avatarContainer: {
		marginRight: 14,
	},
	contactInfo: {
		flex: 1,
	},
	contactHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	contactName: {
		fontSize: 17,
		fontWeight: '600',
		color: Colors.textPrimary,
		flex: 1,
	},
	lastContactTime: {
		fontSize: 13,
		color: Colors.textMuted,
		marginLeft: 8,
	},
	hotTopicsContainer: {
		marginTop: 4,
		gap: 2,
	},
	hotTopicRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	hotTopicText: {
		fontSize: 13,
		color: Colors.warning,
		fontWeight: '500',
		flex: 1,
	},
	hotTopicDate: {
		fontSize: 12,
		color: Colors.textMuted,
		fontWeight: '400',
	},
	hotTopicMore: {
		fontSize: 12,
		color: Colors.textMuted,
		fontWeight: '500',
		marginLeft: 20,
	},
	emptyStateContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
		paddingBottom: 100,
	},
	emptyStateIllustration: {
		width: 180,
		height: 140,
		marginBottom: 24,
	},
	emptyStateTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: Colors.textPrimary,
		textAlign: 'center',
		marginBottom: 12,
		lineHeight: 26,
	},
	emptyStateDescription: {
		fontSize: 15,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 22,
	},
	emptyStateButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 24,
		backgroundColor: Colors.primary,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
	},
	emptyStateButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.textInverse,
	},
});
