import { View, Text, ScrollView, Pressable, TextInput, Alert, Platform, KeyboardAvoidingView, StyleSheet, BackHandler } from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  useContactQuery,
  useResolveHotTopic,
  useReopenHotTopic,
  useDeleteHotTopic,
  useUpdateHotTopic,
  useUpdateHotTopicResolution,
  useDeleteNote,
} from '@/hooks/useContactQuery';
import { useUpdateContact, useDeleteContact } from '@/hooks/useContactsQuery';
import { useGroupsForContact } from '@/hooks/useGroupsQuery';
import { SearchSourceType } from '@/types';
import { hotTopicService } from '@/services/hot-topic.service';
import { Edit3, Plus, Trash2, MoreVertical, MessageCircleQuestion } from 'lucide-react-native';
import { AISummary } from '@/components/contact/AISummary';
import { AddNoteButton } from '@/components/AddNoteButton';
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
import { GroupsManagementSheet } from '@/components/contact/GroupsManagementSheet';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useAppStore } from '@/stores/app-store';
import { ContactDetailSkeleton } from '@/components/skeleton/ContactDetailSkeleton';


export default function ContactDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;
  const highlightType = params.highlightType as SearchSourceType | undefined;
  const highlightId = params.highlightId as string | undefined;
  const { setPreselectedContactId, isAvatarGenerating } = useAppStore();

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
  const resolveHotTopicMutation = useResolveHotTopic();
  const reopenHotTopicMutation = useReopenHotTopic();
  const deleteHotTopicMutation = useDeleteHotTopic();
  const updateHotTopicMutation = useUpdateHotTopic();
  const updateHotTopicResolutionMutation = useUpdateHotTopicResolution();
  const deleteNoteMutation = useDeleteNote();

  // Groups queries
  const { data: contactGroups = [] } = useGroupsForContact(contactId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');

  // Groups state
  const [showGroupsSheet, setShowGroupsSheet] = useState(false);

  // Adding new items state
  const [isAddingHotTopic, setIsAddingHotTopic] = useState(false);
  const [newHotTopicTitle, setNewHotTopicTitle] = useState('');
  const [newHotTopicContext, setNewHotTopicContext] = useState('');

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Sync contact data with local state
  useEffect(() => {
    if (contact) {
      setEditedFirstName(contact.firstName);
      setEditedLastName(contact.lastName || '');
    }
  }, [contact]);

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

  const handleSaveName = async () => {
    if (!contact || !editedFirstName.trim()) return;
    await updateContactMutation.mutateAsync({
      id: contact.id,
      data: {
        firstName: editedFirstName.trim(),
        lastName: editedLastName.trim() || undefined,
      },
    });
    setIsEditingName(false);
  };

  const handleResolveHotTopic = async (id: string, resolution?: string) => {
    await resolveHotTopicMutation.mutateAsync({ id, resolution });
  };

  const handleReopenHotTopic = async (id: string) => {
    await reopenHotTopicMutation.mutateAsync(id);
  };

  const handleDeleteHotTopic = async (id: string) => {
    await deleteHotTopicMutation.mutateAsync(id);
  };

  const handleEditHotTopic = async (id: string, data: { title: string; context?: string }) => {
    await updateHotTopicMutation.mutateAsync({ id, data });
  };

  const handleUpdateResolution = async (id: string, resolution: string) => {
    await updateHotTopicResolutionMutation.mutateAsync({ id, resolution });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNoteMutation.mutateAsync(id);
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

  const handleSaveAvatar = (avatarUrl: string | null) => {
    invalidate();
  };

  // Add new items handlers
  const handleAddHotTopic = async () => {
    if (!newHotTopicTitle.trim()) return;
    await hotTopicService.create({
      contactId,
      title: newHotTopicTitle.trim(),
      context: newHotTopicContext.trim() || undefined,
    });
    setNewHotTopicTitle('');
    setNewHotTopicContext('');
    setIsAddingHotTopic(false);
    invalidate();
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
        {/* Hero Header with Avatar */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
          {/* Options menu button */}
          <View style={styles.menuButtonContainer}>
            <Pressable
              style={styles.menuButton}
              onPress={() => setShowOptionsMenu(!showOptionsMenu)}
            >
              <MoreVertical size={24} color={Colors.textSecondary} />
            </Pressable>
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
          </View>

          <View style={styles.avatarContainer}>
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
          </View>

          {isEditingName ? (
            <View style={styles.editNameCard}>
              <Text style={styles.inputLabel}>{t('contact.name.firstName')}</Text>
              <TextInput
                style={styles.input}
                value={editedFirstName}
                onChangeText={setEditedFirstName}
                placeholder={t('contact.name.firstNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>{t('contact.name.lastName')}</Text>
              <TextInput
                style={styles.input}
                value={editedLastName}
                onChangeText={setEditedLastName}
                placeholder={t('contact.name.lastNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditingName(false);
                    setEditedFirstName(contact.firstName);
                    setEditedLastName(contact.lastName || '');
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSaveName}>
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.nameRow} onPress={() => setIsEditingName(true)}>
              <Text style={styles.contactName}>
                {contact.firstName} {contact.lastName || contact.nickname || ''}
              </Text>
              <Edit3 size={18} color={Colors.textMuted} />
            </Pressable>
          )}

          {/* Groups display */}
          {!isEditingName && (
            contactGroups.length > 0 ? (
              <Pressable style={styles.groupChipsContainer} onPress={() => setShowGroupsSheet(true)}>
                {contactGroups.map((group) => (
                  <View key={group.id} style={styles.groupChip}>
                    <Text style={styles.groupChipText}>{group.name}</Text>
                  </View>
                ))}
                <View style={styles.editGroupsIcon}>
                  <Edit3 size={14} color={Colors.textMuted} />
                </View>
              </Pressable>
            ) : (
              <Pressable style={styles.addGroupButton} onPress={() => setShowGroupsSheet(true)}>
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.addGroupText}>{t('contact.addGroup')}</Text>
              </Pressable>
            )
          )}

          {contact.lastContactAt && !isEditingName && (
            <Text style={styles.lastContactText}>
              {t('contact.lastContact')} : {new Date(contact.lastContactAt).toLocaleDateString()}
            </Text>
          )}

          {/* Add note button */}
          {!isEditingName && (
            <AddNoteButton
              firstName={contact.firstName}
              onAddNote={handleAddNote}
            />
          )}

          {/* Ask about contact button */}
          {!isEditingName && (
            <Pressable style={styles.askButton} onPress={handleAskAboutContact}>
              <MessageCircleQuestion size={18} color={Colors.primary} />
              <Text style={styles.askButtonText}>
                {t('contact.askAbout', { firstName: contact.firstName })}
              </Text>
            </Pressable>
          )}
        </Animated.View>

        {/* AI Summary (L'essentiel) - Most important info first */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
          <AISummary summary={contact.aiSummary} isLoading={isWaitingForSummary} firstName={contact.firstName} />
        </Animated.View>

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
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsAddingHotTopic(false);
                    setNewHotTopicTitle('');
                    setNewHotTopicContext('');
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
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.section}>
          <SuggestedQuestions suggestedQuestions={contact.suggestedQuestions} isLoading={isWaitingForSuggestedQuestions} firstName={contact.firstName} />
        </Animated.View>

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
        </Animated.View>

      </ScrollView>

      <DeleteContactDialog
        visible={showDeleteDialog}
        contactName={`${contact.firstName} ${contact.lastName || ''}`.trim()}
        contactFirstName={contact.firstName}
        contactLastName={contact.lastName}
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

      <GroupsManagementSheet
        visible={showGroupsSheet}
        onClose={() => setShowGroupsSheet(false)}
        contactId={contactId}
        contactFirstName={contact.firstName}
      />
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  menuButtonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  menuButton: {
    padding: 8,
  },
  optionsMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
  avatarContainer: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  editNameCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginTop: 8,
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
    borderColor: Colors.border,
    borderRadius: 12,
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
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderRadius: 12,
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
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  groupChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  groupChipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  editGroupsIcon: {
    backgroundColor: Colors.surface,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
  lastContactText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  askButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addNoteButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
    color: Colors.textPrimary,
  },
  addCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
  },
  emptyStateText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
  },
});
