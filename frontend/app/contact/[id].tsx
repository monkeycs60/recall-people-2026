import { View, Text, ScrollView, Pressable, TextInput, Platform, KeyboardAvoidingView, StyleSheet, BackHandler, Modal } from 'react-native';
import { OptionPickerSheet } from '@/components/ui/OptionPickerSheet';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useContactQuery,
  useCreateHotTopic,
  useResolveHotTopic,
  useReopenHotTopic,
  useDeleteHotTopic,
  useUpdateHotTopic,
  useUpdateHotTopicResolution,
  useDeleteNote,
  useUpdateNote,
  useRegenerateSummary,
  useRegenerateSuggestedQuestions,
} from '@/hooks/useContactQuery';
import { useUpdateContact, useDeleteContact } from '@/hooks/useContactsQuery';
import { useGroupsForContact, useGroupsQuery } from '@/hooks/useGroupsQuery';
import { SearchSourceType } from '@/types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ChevronLeft, Edit3, Plus, Trash2, MoreVertical, Calendar, Bell } from 'lucide-react-native';
import { notificationService } from '@/services/notification.service';
import { AISummary } from '@/components/contact/AISummary';
import type { InputMode } from '@/components/InputModeToggle';
import { SuggestedQuestions } from '@/components/contact/SuggestedQuestions';
import { HotTopicsList } from '@/components/contact/HotTopicsList';
import { NotesTimeline } from '@/components/contact/NotesTimeline';
import { ContactAvatar } from '@/components/contact/ContactAvatar';
import { ContactCard } from '@/components/contact/ContactCard';
import { DeleteContactDialog } from '@/components/contact/DeleteContactDialog';
import { PhoneEditModal } from '@/components/contact/PhoneEditModal';
import { EmailEditModal } from '@/components/contact/EmailEditModal';
import { BirthdayEditModal } from '@/components/contact/BirthdayEditModal';
import { GenderEditModal } from '@/components/contact/GenderEditModal';
import { AvatarEditModal } from '@/components/contact/AvatarEditModal';
import { NameEditModal } from '@/components/contact/NameEditModal';
import { GroupsManagementSheet } from '@/components/contact/GroupsManagementSheet';
import { Colors, Shadows, Fonts } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppStore } from '@/stores/app-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { useSettingsStore } from '@/stores/settings-store';
import { ContactDetailSkeleton } from '@/components/skeleton/ContactDetailSkeleton';
import { Paywall } from '@/components/Paywall';
import { REMINDER_FREQUENCY_PRESETS } from '@/lib/reminder-frequency';


export default function ContactDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;
  const highlightType = params.highlightType as SearchSourceType | undefined;
  const highlightId = params.highlightId as string | undefined;
  const { setPreselectedContactId, isAvatarGenerating } = useAppStore();
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const notSeenThresholdDays = useSettingsStore((state) => state.notSeenThresholdDays);

  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const { contact, isLoading, isWaitingForSummary, isWaitingForSuggestedQuestions, invalidate, refetch } = useContactQuery(contactId);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // TanStack Query mutations
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();
  const createHotTopicMutation = useCreateHotTopic();
  const resolveHotTopicMutation = useResolveHotTopic();
  const reopenHotTopicMutation = useReopenHotTopic();
  const deleteHotTopicMutation = useDeleteHotTopic();
  const updateHotTopicMutation = useUpdateHotTopic();
  const updateHotTopicResolutionMutation = useUpdateHotTopicResolution();
  const deleteNoteMutation = useDeleteNote();
  const updateNoteMutation = useUpdateNote();
  const regenerateSummaryMutation = useRegenerateSummary();
  const regenerateSuggestedQuestionsMutation = useRegenerateSuggestedQuestions();

  // Groups queries - data passed as props to sheet for instant opening
  const { groups: allGroups } = useGroupsQuery();
  const { data: contactGroups = [] } = useGroupsForContact(contactId);

  const [showNameModal, setShowNameModal] = useState(false);

  const groupsSheetRef = useRef<BottomSheetModal>(null);
  const reminderFrequencySheetRef = useRef<BottomSheetModal>(null);

  const handleOpenGroupsSheet = useCallback(() => {
    groupsSheetRef.current?.present();
  }, []);

  // Adding new items state
  const [isAddingHotTopic, setIsAddingHotTopic] = useState(false);
  const [newHotTopicTitle, setNewHotTopicTitle] = useState('');
  const [newHotTopicContext, setNewHotTopicContext] = useState('');
  const [newHotTopicReminderEnabled, setNewHotTopicReminderEnabled] = useState(false);
  const [newHotTopicReminderDate, setNewHotTopicReminderDate] = useState<Date | null>(null);
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (highlightType && highlightId && contact && !isLoading) {
      const timer = setTimeout(() => {
        const sectionKey = `${highlightType}-section`;
        const position = sectionPositions.current[sectionKey];
        if (position !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: position - 100, animated: true });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightType, highlightId, contact, isLoading]);

  useEffect(() => {
    const onBackPress = () => {
      router.dismissTo('/(tabs)');
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [router]);

  const handleDelete = async () => {
    if (contact) {
      await deleteContactMutation.mutateAsync(contact.id);
      router.replace('/(tabs)');
    }
  };

  const handleDeletePress = () => {
    setShowOptionsMenu(false);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteDialog(false);
    await handleDelete();
  };

  const handleSavePhone = async (value: string | null) => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: { phone: value || undefined },
    });
  };

  const handleSaveEmail = async (value: string | null) => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: { email: value || undefined },
    });
  };

  const handleSaveBirthday = async (day: number | null, month: number | null, year: number | null) => {
    // Pass null explicitly to delete birthday, or the value to update
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: {
        birthdayDay: day,
        birthdayMonth: month,
        birthdayYear: year,
      },
    });
  };

  const handleSaveGender = async (value: 'male' | 'female' | 'unknown') => {
    await updateContactMutation.mutateAsync({
      id: contactId,
      data: { gender: value },
    });
  };

  const handleSaveName = async (firstName: string, lastName: string | null) => {
    if (!contact) return;
    await updateContactMutation.mutateAsync({
      id: contact.id,
      data: {
        firstName,
        lastName: lastName || undefined,
      },
    });
  };

  const handleResolveHotTopic = async (id: string, resolution?: string) => {
    await resolveHotTopicMutation.mutateAsync({ id, resolution, contactId });
  };

  const handleReopenHotTopic = async (id: string) => {
    await reopenHotTopicMutation.mutateAsync({ id, contactId });
  };

  const handleDeleteHotTopic = async (id: string) => {
    await deleteHotTopicMutation.mutateAsync({ id, contactId });
  };

  const handleEditHotTopic = async (id: string, data: { title: string; context?: string }) => {
    await updateHotTopicMutation.mutateAsync({ id, data, contactId });
  };

  const handleUpdateResolution = async (id: string, resolution: string) => {
    await updateHotTopicResolutionMutation.mutateAsync({ id, resolution, contactId });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNoteMutation.mutateAsync(id);
  };

  const handleUpdateNote = async (id: string, data: { transcription: string }) => {
    await updateNoteMutation.mutateAsync({ id, data });
  };

  const handleAddNote = (mode: InputMode) => {
    setPreselectedContactId(contactId);
    router.push({
      pathname: '/record',
      params: { initialMode: mode },
    });
  };

  const handleAskAboutContact = () => {
    router.push({
      pathname: '/ask',
      params: { contactId },
    });
  };

  const handleEditAvatar = () => {
    setShowAvatarModal(true);
  };

  const handleSaveAvatar = () => {
    invalidate();
  };

  const defaultLabel = notSeenThresholdDays === 0
    ? t('contact.reminderNever')
    : t('settings.notSeenDays', { count: notSeenThresholdDays });

  const getReminderFrequencyLabel = (value: number | undefined): string => {
    if (value === undefined || value === null) return `${t('contact.reminderDefault')} (${defaultLabel})`;
    if (value === 7) return t('contact.reminderWeek');
    if (value === 14) return t('contact.reminderWeeks');
    if (value === 30) return t('contact.reminderMonth');
    if (value === 60) return t('contact.reminderTwoMonths');
    if (value === 90) return t('contact.reminderQuarter');
    if (value === 180) return t('contact.reminderSixMonths');
    if (value === 365) return t('contact.reminderYear');
    if (value === -1) return t('contact.reminderNever');
    return t('contact.reminderCustomDays', { count: value });
  };

  const reminderFrequencyOptions: Array<{ label: string; value: number | null }> = [
    { label: `${t('contact.reminderDefault')} (${defaultLabel})`, value: null },
    ...REMINDER_FREQUENCY_PRESETS.map((value) => ({
      label: getReminderFrequencyLabel(value),
      value,
    })),
    { label: t('contact.reminderNever'), value: -1 },
  ];

  const handleReminderFrequencyPress = () => {
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    reminderFrequencySheetRef.current?.present();
  };

  const handleReminderFrequencySelect = (value: number | null) => {
    updateContactMutation.mutate({
      id: contactId,
      data: { reminderFrequencyDays: value },
    });
  };

  const handleRegenerateSummary = () => {
    regenerateSummaryMutation.mutate({ contactId });
  };

  const handleRegenerateSuggestedQuestions = () => {
    regenerateSuggestedQuestionsMutation.mutate({ contactId });
  };

  // Add new items handlers
  const handleAddHotTopic = async () => {
    if (!newHotTopicTitle.trim()) return;

    const eventDate = newHotTopicReminderEnabled && newHotTopicReminderDate
      ? newHotTopicReminderDate.toISOString()
      : undefined;

    const savedHotTopic = await createHotTopicMutation.mutateAsync({
      contactId,
      title: newHotTopicTitle.trim(),
      context: newHotTopicContext.trim() || undefined,
      eventDate,
    });

    if (eventDate && contact) {
      await notificationService.scheduleEventReminder(
        savedHotTopic.id,
        eventDate,
        newHotTopicTitle.trim(),
        contact.firstName
      );
    }

    setNewHotTopicTitle('');
    setNewHotTopicContext('');
    setNewHotTopicReminderEnabled(false);
    setNewHotTopicReminderDate(null);
    setIsAddingHotTopic(false);
  };

  const handleReminderDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowReminderDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      setNewHotTopicReminderDate(selectedDate);
    }

    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowReminderDatePicker(false);
    }
  };

  const formatReminderDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatRelativeDate = (date: Date): string => {
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '';
    if (diffDays === 0) return t('review.today');
    if (diffDays === 1) return t('review.tomorrow');
    if (diffDays < 7) return t('review.inDays', { count: diffDays });
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return t('review.inWeeks', { count: weeks });
    }
    const months = Math.floor(diffDays / 30);
    return t('review.inMonths', { count: months });
  };

  if (isLoading) {
    return <ContactDetailSkeleton />;
  }

  if (!contact) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const hasNotes = contact.notes.length > 0;
  const hasSummaryContent = hasNotes || Boolean(contact.aiSummary) || isWaitingForSummary;
  const hasSuggestedQuestionsContent =
    hasNotes || Boolean(contact.suggestedQuestions?.length) || isWaitingForSuggestedQuestions;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: Colors.background }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Header with Gradient */}
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={[Colors.primaryLight, Colors.background]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.heroSection}
          >
            <View style={{ paddingTop: insets.top }} />

            {/* Top bar: back + actions */}
            <View style={styles.heroTopBar}>
              <Pressable style={styles.heroBackButton} onPress={() => router.back()}>
                <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
              </Pressable>
              <View style={styles.heroActions}>
                <Pressable style={styles.heroActionButton} onPress={() => setShowNameModal(true)}>
                  <Edit3 size={14} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={styles.heroActionButton}
                  onPress={() => setShowOptionsMenu(!showOptionsMenu)}
                >
                  <MoreVertical size={14} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {showOptionsMenu && (
              <View style={styles.optionsMenu}>
                <Pressable style={styles.optionsMenuItem} onPress={handleDeletePress}>
                  <Trash2 size={18} color={Colors.error} />
                  <Text style={styles.optionsMenuItemTextDanger}>
                    {t('contact.menu.delete')}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Avatar + Info row */}
            <View style={styles.heroContent}>
              <ContactAvatar
                firstName={contact.firstName}
                lastName={contact.lastName}
                gender={contact.gender}
                avatarUrl={contact.avatarUrl}
                size="large"
                onPress={handleEditAvatar}
                showEditBadge
                cacheKey={contact.updatedAt}
                isGenerating={isAvatarGenerating(contactId)}
              />
              <View style={styles.heroTextColumn}>
                {contact.lastContactAt && (
                  <Text style={styles.heroEyebrow}>
                    {t('contact.lastContact').toUpperCase()} {new Date(contact.lastContactAt).toLocaleDateString()}
                  </Text>
                )}
                <Text style={styles.contactName}>
                  {contact.firstName} {contact.lastName || ''}
                </Text>
                <View style={styles.groupChipsContainer}>
                  {contactGroups.length > 0 ? (
                    contactGroups.map((group) => (
                      <Pressable key={group.id} style={styles.groupChip} onPress={handleOpenGroupsSheet}>
                        <Text style={styles.groupChipText}>{group.name}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <Pressable style={styles.addGroupButton} onPress={handleOpenGroupsSheet}>
                      <Plus size={12} color={Colors.primary} />
                      <Text style={styles.addGroupText}>{t('contact.addGroup')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>

            {/* Two CTAs */}
            <View style={styles.heroCTARow}>
              <Pressable style={styles.heroNewNoteButton} onPress={() => handleAddNote('voice' as InputMode)}>
                <Text style={styles.heroNewNoteText}>{t('contact.addNoteButton.label')}</Text>
              </Pressable>
              <Pressable style={styles.askButton} onPress={handleAskAboutContact}>
                <Text style={styles.askButtonText}>
                  {t('contact.askAbout', { firstName: contact.firstName })}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* AI Summary (L'essentiel) - Most important info first */}
        {hasSummaryContent && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
            <AISummary
              summary={contact.aiSummary}
              isLoading={isWaitingForSummary}
              isRegenerating={regenerateSummaryMutation.isPending}
              firstName={contact.firstName}
              onRegenerate={hasNotes ? handleRegenerateSummary : undefined}
            />
          </Animated.View>
        )}

        {/* Hot Topics Section (Actualités) - Things to follow up on */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('contact.sections.news')}</Text>
            <Pressable onPress={() => setIsAddingHotTopic(true)}>
              <Plus size={20} color={Colors.primary} />
            </Pressable>
          </View>

          {isAddingHotTopic && (
            <View style={styles.addCard}>
              <Text style={styles.inputLabel}>{t('contact.addHotTopic.titleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={newHotTopicTitle}
                onChangeText={setNewHotTopicTitle}
                placeholder={t('contact.addHotTopic.titlePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('contact.addHotTopic.contextLabel')}</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={newHotTopicContext}
                onChangeText={setNewHotTopicContext}
                placeholder={t('contact.addHotTopic.contextPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
              <View style={styles.reminderRow}>
                <Pressable
                  style={styles.reminderCheckbox}
                  onPress={() => setNewHotTopicReminderEnabled(!newHotTopicReminderEnabled)}
                >
                  <View
                    style={[
                      styles.smallCheckbox,
                      newHotTopicReminderEnabled && styles.smallCheckboxSelected
                    ]}
                  >
                    {newHotTopicReminderEnabled && (
                      <Text style={styles.smallCheckmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.reminderLabel}>{t('review.reminder')}</Text>
                </Pressable>

                {newHotTopicReminderEnabled && (
                  <>
                    <Pressable
                      style={styles.datePickerButton}
                      onPress={() => setShowReminderDatePicker(true)}
                    >
                      <Calendar size={16} color={Colors.info} />
                      <Text style={newHotTopicReminderDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                        {newHotTopicReminderDate ? formatReminderDate(newHotTopicReminderDate) : t('review.selectDate')}
                      </Text>
                    </Pressable>
                    {newHotTopicReminderDate && (
                      <Text style={styles.relativeDateText}>
                        {formatRelativeDate(newHotTopicReminderDate)}
                      </Text>
                    )}
                  </>
                )}
              </View>
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAddingHotTopic(false);
                    setNewHotTopicTitle('');
                    setNewHotTopicContext('');
                    setNewHotTopicReminderEnabled(false);
                    setNewHotTopicReminderDate(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleAddHotTopic}>
                  <Text style={styles.saveButtonText}>{t('common.add')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          <HotTopicsList
            hotTopics={contact.hotTopics}
            onResolve={handleResolveHotTopic}
            onReopen={handleReopenHotTopic}
            onDelete={handleDeleteHotTopic}
            onEdit={handleEditHotTopic}
            onUpdateResolution={handleUpdateResolution}
          />
        </Animated.View>

        {/* Suggested Questions - Conversation starters / Ask AI */}
        {hasSuggestedQuestionsContent && (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
            <SuggestedQuestions
              suggestedQuestions={contact.suggestedQuestions}
              isLoading={isWaitingForSuggestedQuestions}
              isRegenerating={regenerateSuggestedQuestionsMutation.isPending}
              firstName={contact.firstName}
              onRegenerate={contact.hotTopics.length > 0 ? handleRegenerateSuggestedQuestions : undefined}
            />
          </Animated.View>
        )}

        {/* Notes Timeline - History of interactions */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(300)}
          style={styles.section}
          onLayout={(e) => {
            sectionPositions.current['note-section'] = e.nativeEvent.layout.y;
          }}
        >
          <NotesTimeline
            notes={contact.notes}
            onDelete={handleDeleteNote}
            onUpdate={handleUpdateNote}
            highlightId={highlightType === 'note' ? highlightId : undefined}
          />
        </Animated.View>

        {/* Contact Card (Phone, Email, Birthday) - Reference info at bottom */}
        <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.section}>
          <ContactCard
            phone={contact.phone}
            email={contact.email}
            birthdayDay={contact.birthdayDay}
            birthdayMonth={contact.birthdayMonth}
            birthdayYear={contact.birthdayYear}
            gender={contact.gender}
            onEditPhone={() => setShowPhoneModal(true)}
            onEditEmail={() => setShowEmailModal(true)}
            onEditBirthday={() => setShowBirthdayModal(true)}
            onEditGender={() => setShowGenderModal(true)}
          />

          {/* Per-contact reminder frequency (premium) */}
          <Pressable style={styles.reminderFrequencyRow} onPress={handleReminderFrequencyPress}>
            <Bell size={18} color={Colors.primary} />
            <View style={styles.reminderFrequencyContent}>
              <Text style={styles.reminderFrequencyLabel}>{t('contact.reminderFrequency')}</Text>
              <Text style={styles.reminderFrequencyValue}>
                {getReminderFrequencyLabel(contact.reminderFrequencyDays)}
              </Text>
            </View>
            {!isPremium && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

      </ScrollView>

      <DeleteContactDialog
        visible={showDeleteDialog}
        contactName={`${contact.firstName} ${contact.lastName || ''}`.trim()}
        contactFirstName={contact.firstName}
        contactLastName={contact.lastName}
        avatarUrl={contact.avatarUrl}
        gender={contact.gender}
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
      />

      {showPhoneModal && (
        <PhoneEditModal
          visible={showPhoneModal}
          initialValue={contact?.phone}
          onSave={handleSavePhone}
          onClose={() => setShowPhoneModal(false)}
        />
      )}

      {showEmailModal && (
        <EmailEditModal
          visible={showEmailModal}
          initialValue={contact?.email}
          onSave={handleSaveEmail}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showBirthdayModal && (
        <BirthdayEditModal
          visible={showBirthdayModal}
          initialDay={contact?.birthdayDay}
          initialMonth={contact?.birthdayMonth}
          initialYear={contact?.birthdayYear}
          onSave={handleSaveBirthday}
          onClose={() => setShowBirthdayModal(false)}
        />
      )}

      {showGenderModal && (
        <GenderEditModal
          visible={showGenderModal}
          initialValue={contact?.gender}
          onSave={handleSaveGender}
          onClose={() => setShowGenderModal(false)}
        />
      )}

      {showAvatarModal && (
        <AvatarEditModal
          visible={showAvatarModal}
          contactId={contactId}
          firstName={contact?.firstName || ''}
          currentAvatarUrl={contact?.avatarUrl}
          onSave={handleSaveAvatar}
          onClose={() => setShowAvatarModal(false)}
        />
      )}

      {showNameModal && (
        <NameEditModal
          visible={showNameModal}
          initialFirstName={contact?.firstName || ''}
          initialLastName={contact?.lastName}
          onSave={handleSaveName}
          onClose={() => setShowNameModal(false)}
        />
      )}

      <GroupsManagementSheet
        ref={groupsSheetRef}
        contactId={contactId}
        contactFirstName={contact.firstName}
        allGroups={allGroups}
        contactGroups={contactGroups}
      />

      <OptionPickerSheet
        ref={reminderFrequencySheetRef}
        title={t('contact.reminderFrequency')}
        options={reminderFrequencyOptions}
        selectedValue={contact.reminderFrequencyDays}
        onSelect={handleReminderFrequencySelect}
      />

      {Platform.OS === 'android' && showReminderDatePicker && (
        <DateTimePicker
          value={newHotTopicReminderDate || new Date()}
          mode="date"
          display="default"
          onChange={handleReminderDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={showReminderDatePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerModalHeader}>
                <Pressable onPress={() => setShowReminderDatePicker(false)}>
                  <Text style={styles.datePickerModalCancel}>{t('common.cancel')}</Text>
                </Pressable>
                <Text style={styles.datePickerModalTitle}>{t('review.selectDate')}</Text>
                <Pressable onPress={() => setShowReminderDatePicker(false)}>
                  <Text style={styles.datePickerModalDone}>{t('common.confirm')}</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={newHotTopicReminderDate || new Date()}
                mode="date"
                display="spinner"
                onChange={handleReminderDateChange}
                minimumDate={new Date()}
                style={styles.iosDatePicker}
              />
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall
          reason="proactive_reminders"
          onClose={() => setShowPaywall(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  heroTextColumn: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  heroCTARow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroNewNoteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.fab,
  },
  heroNewNoteText: {
    color: Colors.textInverse,
    fontSize: 13.5,
    fontWeight: '600',
  },
  optionsMenu: {
    position: 'absolute',
    top: 90,
    right: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    minWidth: 200,
    zIndex: 20,
    ...Shadows.floating,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  optionsMenuItemTextDanger: {
    fontSize: 15,
    color: Colors.error,
    fontWeight: '500',
  },
  contactName: {
    fontFamily: Fonts.sans.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.hairline,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  groupChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  groupChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  groupChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  addGroupText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  askButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  askButtonText: {
    color: Colors.primary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 4,
  },
  addCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 16,
    ...Shadows.card,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.hairline,
  },
  emptyStateText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  reminderCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCheckboxSelected: {
    backgroundColor: Colors.info,
    borderColor: Colors.info,
  },
  smallCheckmark: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  reminderLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.info,
    gap: 6,
  },
  datePickerText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  relativeDateText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: '500',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  datePickerModalCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  datePickerModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  datePickerModalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  iosDatePicker: {
    height: 200,
  },
  reminderFrequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  reminderFrequencyContent: {
    flex: 1,
  },
  reminderFrequencyLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  reminderFrequencyValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  proBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
