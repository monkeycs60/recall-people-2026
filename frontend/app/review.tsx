import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ExtractionResult, HotTopic, ResolvedTopic, ExtractedMemory } from '@/types';
import { useCreateContact, useUpdateContact } from '@/hooks/useContactsQuery';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useNotes } from '@/hooks/useNotes';
import { hotTopicService } from '@/services/hot-topic.service';
import { notificationService } from '@/services/notification.service';
import { contactService } from '@/services/contact.service';
import { groupService } from '@/services/group.service';
import { generateSuggestedQuestions, generateSummary, generateAvatarFromHints, extractInfo } from '@/lib/api';
import { noteService } from '@/services/note.service';
import { useAppStore } from '@/stores/app-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { queryKeys } from '@/lib/query-keys';
import { Colors, Fonts, Shadows } from '@/constants/theme';
import { Archive, Edit3, FileText, Info, Lightbulb, Phone, Users, Zap } from 'lucide-react-native';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { TranscriptionSection } from '@/components/review/TranscriptionSection';
import { ContactInfoSection } from '@/components/review/ContactInfoSection';
import { FactsSection } from '@/components/review/FactsSection';
import { HotTopicsSection } from '@/components/review/HotTopicsSection';
import { MemoriesSection } from '@/components/review/MemoriesSection';
import { ResolvedTopicsSection } from '@/components/review/ResolvedTopicsSection';
import { GroupsSection } from '@/components/review/GroupsSection';
import { getLocaleDateStringLocale } from '@/utils/dateLocale';
import { Paywall } from '@/components/Paywall';

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const { contacts: allContacts } = useContactsQuery();
  const { groups: allGroups } = useGroupsQuery();
  const { createNote } = useNotes();
  const { setRecordingState, addPendingAvatarGeneration, removePendingAvatarGeneration } = useAppStore();

  const extraction: ExtractionResult = JSON.parse(params.extraction as string);
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;
  const contactId = params.contactId as string;

  const [selectedFacts, setSelectedFacts] = useState<number[]>(
    extraction.facts?.map((_, index) => index) || []
  );
  const [editableFacts, setEditableFacts] = useState(
    extraction.facts?.map((fact) => ({ ...fact })) || []
  );
  const [editingFactIndex, setEditingFactIndex] = useState<number | null>(null);

  const [selectedHotTopics, setSelectedHotTopics] = useState<number[]>(
    extraction.hotTopics?.map((_, index) => index) || []
  );
  const [editableHotTopics, setEditableHotTopics] = useState(
    extraction.hotTopics?.map((topic) => ({ ...topic })) || []
  );
  const [editingHotTopicIndex, setEditingHotTopicIndex] = useState<number | null>(null);

  const [selectedMemories, setSelectedMemories] = useState<number[]>(
    extraction.memories?.map((_, index) => index) || []
  );
  const [editableMemories, setEditableMemories] = useState<ExtractedMemory[]>(
    extraction.memories?.map((memory) => ({ ...memory })) || []
  );
  const [editingMemoryIndex, setEditingMemoryIndex] = useState<number | null>(null);

  const [hotTopicDates, setHotTopicDates] = useState<Record<number, { enabled: boolean; date: string }>>(() => {
    const initial: Record<number, { enabled: boolean; date: string }> = {};
    extraction.hotTopics?.forEach((topic, index) => {
      initial[index] = {
        enabled: true,
        date: topic.suggestedDate || '',
      };
    });
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [existingHotTopics, setExistingHotTopics] = useState<HotTopic[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);

  const [resolvedTopicsState, setResolvedTopicsState] = useState<ResolvedTopic[]>(
    extraction.resolvedTopics || []
  );
  const [editingResolutionId, setEditingResolutionId] = useState<string | null>(null);

  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState(transcription);
  const [isReExtracting, setIsReExtracting] = useState(false);

  const [selectedGroups, setSelectedGroups] = useState<Array<{
    name: string;
    isNew: boolean;
    existingId?: string;
  }>>(extraction.suggestedGroups || []);

  const [editableContactInfo, setEditableContactInfo] = useState<{
    phone: string | null;
    email: string | null;
    birthday: { day: number; month: number; year?: number } | null;
  }>({
    phone: extraction.contactInfo?.phone || null,
    email: extraction.contactInfo?.email || null,
    birthday: extraction.contactInfo?.birthday || null,
  });

  const [editingContactInfoField, setEditingContactInfoField] = useState<'phone' | 'email' | 'birthday' | null>(null);

  const [datePickerIndex, setDatePickerIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(() => {
    const first = extraction.contactIdentified.firstName;
    const last = extraction.contactIdentified.lastName;
    const nickname = extraction.contactIdentified.suggestedNickname;

    if (last) {
      return `${first} ${last}`;
    }
    if (nickname) {
      return nickname;
    }
    return first;
  });

  useEffect(() => {
    const loadHotTopics = async () => {
      if (contactId !== 'new') {
        const topics = await hotTopicService.getByContact(contactId);
        setExistingHotTopics(topics.filter((topic) => topic.status === 'active'));
      }
    };
    loadHotTopics();
  }, [contactId]);

  const resolvedTopicsWithData = existingHotTopics
    .filter((topic) => resolvedTopicsState.some((resolved) => resolved.id === topic.id))
    .map((topic) => ({
      ...topic,
      proposedResolution: resolvedTopicsState.find((resolved) => resolved.id === topic.id)?.resolution || '',
    }));

  const hasContactInfo = !!(editableContactInfo.phone || editableContactInfo.email || editableContactInfo.birthday);
  const contactInfoCount = [editableContactInfo.phone, editableContactInfo.email, editableContactInfo.birthday].filter(Boolean).length;
  const hasResolvedTopics = resolvedTopicsWithData.length > 0 || (extraction.resolvedTopics?.length ?? 0) > 0;

  const toggleResolvedTopic = (topicId: string) => {
    setResolvedTopicsState((prev) => {
      const exists = prev.some((resolved) => resolved.id === topicId || resolved.existingTopicId === topicId);
      if (exists) {
        return prev.filter((resolved) => resolved.id !== topicId && resolved.existingTopicId !== topicId);
      } else {
        const originalResolution = extraction.resolvedTopics?.find((resolved) => resolved.id === topicId || resolved.existingTopicId === topicId)?.resolution || '';
        return [...prev, { id: topicId, existingTopicId: topicId, resolution: originalResolution }];
      }
    });
  };

  const updateResolution = (topicId: string, resolution: string) => {
    setResolvedTopicsState((prev) =>
      prev.map((resolved) =>
        resolved.id === topicId ? { ...resolved, resolution } : resolved
      )
    );
  };

  const toggleFact = (index: number) => {
    setSelectedFacts((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleHotTopic = (index: number) => {
    setSelectedHotTopics((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateFact = (index: number, field: 'factKey' | 'factValue', value: string) => {
    setEditableFacts((prev) =>
      prev.map((fact, factIndex) =>
        factIndex === index ? { ...fact, [field]: value } : fact
      )
    );
  };

  const updateHotTopic = (index: number, field: 'title' | 'context', value: string) => {
    setEditableHotTopics((prev) =>
      prev.map((topic, topicIndex) =>
        topicIndex === index ? { ...topic, [field]: value } : topic
      )
    );
  };

  const toggleMemory = (index: number) => {
    setSelectedMemories((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateMemory = (index: number, field: 'description' | 'eventDate', value: string) => {
    setEditableMemories((prev) =>
      prev.map((memory, memoryIndex) =>
        memoryIndex === index ? { ...memory, [field]: value } : memory
      )
    );
  };

  const toggleHotTopicDate = (index: number) => {
    setHotTopicDates((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        enabled: !prev[index]?.enabled,
      },
    }));
  };

  const updateHotTopicDate = (index: number, date: string) => {
    setHotTopicDates((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        date,
      },
    }));
  };

  const formatRelativeDate = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return dateStr;

    const dayNum = parseInt(match[1]);
    const monthNum = parseInt(match[2]);
    const yearNum = parseInt(match[3]);
    const eventDate = new Date(yearNum, monthNum - 1, dayNum);
    const today = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return dateStr;
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

  const parseDateStringToDate = (dateStr: string): Date => {
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const dayNum = parseInt(match[1]);
      const monthNum = parseInt(match[2]);
      const yearNum = parseInt(match[3]);
      return new Date(yearNum, monthNum - 1, dayNum);
    }
    return new Date();
  };

  const formatDateToString = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate && datePickerIndex !== null) {
      const formattedDate = formatDateToString(selectedDate);
      updateHotTopicDate(datePickerIndex, formattedDate);
    }

    if (Platform.OS === 'android') {
      setDatePickerIndex(null);
    }
  };

  const openDatePicker = (index: number) => {
    setDatePickerIndex(index);
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
    setDatePickerIndex(null);
  };

  const toggleGroup = (group: { name: string; isNew: boolean; existingId?: string }) => {
    setSelectedGroups((prev) => {
      const exists = prev.some((g) => g.name.toLowerCase() === group.name.toLowerCase());
      if (exists) {
        return prev.filter((g) => g.name.toLowerCase() !== group.name.toLowerCase());
      }
      return [...prev, group];
    });
  };

  const addNewGroup = (name: string) => {
    const existing = allGroups.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const group = existing
      ? { name: existing.name, isNew: false, existingId: existing.id }
      : { name: name.trim(), isNew: true };

    if (!selectedGroups.some((g) => g.name.toLowerCase() === group.name.toLowerCase())) {
      setSelectedGroups((prev) => [...prev, group]);
    }
  };

  const handleTranscriptionEdit = async () => {
    if (editedTranscription.trim() === transcription.trim()) {
      setIsEditingTranscription(false);
      return;
    }

    setIsReExtracting(true);

    try {
      const currentContactData = contactId !== 'new' ? {
        id: contactId,
        firstName: extraction.contactIdentified.firstName,
        lastName: extraction.contactIdentified.lastName,
        facts: editableFacts.map(fact => ({
          factType: fact.factType,
          factKey: fact.factKey,
          factValue: fact.factValue,
        })),
        hotTopics: existingHotTopics.map(topic => ({
          id: topic.id,
          title: topic.title,
          context: topic.context || '',
        })),
      } : undefined;

      const { extraction: newExtraction } = await extractInfo({
        transcription: editedTranscription,
        existingContacts: [],
        currentContact: currentContactData,
      });

      setEditableHotTopics(newExtraction.hotTopics?.map((topic) => ({ ...topic })) || []);
      setSelectedHotTopics(newExtraction.hotTopics?.map((_, index) => index) || []);

      const newHotTopicDates: Record<number, { enabled: boolean; date: string }> = {};
      newExtraction.hotTopics?.forEach((topic, index) => {
        newHotTopicDates[index] = {
          enabled: true,
          date: topic.suggestedDate || '',
        };
      });
      setHotTopicDates(newHotTopicDates);

      if (newExtraction.contactInfo) {
        setEditableContactInfo({
          phone: newExtraction.contactInfo.phone || null,
          email: newExtraction.contactInfo.email || null,
          birthday: newExtraction.contactInfo.birthday || null,
        });
      }

      setResolvedTopicsState(newExtraction.resolvedTopics || []);

      setIsEditingTranscription(false);
    } catch (error) {
      console.error('Re-extraction failed:', error);
    } finally {
      setIsReExtracting(false);
    }
  };

  const handleSave = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      let finalContactId = contactId;

      if (contactId === 'new') {
        const canCreate = useSubscriptionStore.getState().canCreateContact(allContacts.length);
        if (!canCreate) {
          setShowPaywall(true);
          isSavingRef.current = false;
          setIsSaving(false);
          return;
        }

        const nameParts = editedName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

        const newContact = await createContactMutation.mutateAsync({
          firstName,
          lastName,
          nickname: undefined,
          gender: extraction.contactIdentified.gender,
        });
        finalContactId = newContact.id;

        if (selectedGroups.length > 0) {
          const groupIds: string[] = [];
          for (const group of selectedGroups) {
            if (group.existingId) {
              groupIds.push(group.existingId);
            } else {
              const newGroup = await groupService.create(group.name);
              groupIds.push(newGroup.id);
            }
          }
          await groupService.setContactGroups(finalContactId, groupIds);
        }
      }

      const contactInfoUpdate: Partial<{
        phone: string;
        email: string;
        birthdayDay: number;
        birthdayMonth: number;
        birthdayYear: number;
      }> = {};

      if (editableContactInfo.phone) {
        contactInfoUpdate.phone = editableContactInfo.phone;
      }
      if (editableContactInfo.email) {
        contactInfoUpdate.email = editableContactInfo.email;
      }
      if (editableContactInfo.birthday) {
        contactInfoUpdate.birthdayDay = editableContactInfo.birthday.day;
        contactInfoUpdate.birthdayMonth = editableContactInfo.birthday.month;
        if (editableContactInfo.birthday.year) {
          contactInfoUpdate.birthdayYear = editableContactInfo.birthday.year;
        }
      }

      if (Object.keys(contactInfoUpdate).length > 0) {
        await contactService.update(finalContactId, contactInfoUpdate);
      }

      const note = await createNote({
        contactId: finalContactId,
        title: extraction.noteTitle,
        audioUri,
        transcription: editedTranscription,
      });

      if (editableHotTopics.length > 0) {
        for (const index of selectedHotTopics) {
          const topic = editableHotTopics[index];
          const dateInfo = hotTopicDates[index];

          let eventDate: string | undefined;
          if (dateInfo?.enabled && dateInfo?.date) {
            eventDate = hotTopicService.parseExtractedDate(dateInfo.date) || undefined;
          }

          const savedHotTopic = await hotTopicService.create({
            contactId: finalContactId,
            title: topic.title,
            context: topic.context || undefined,
            eventDate,
            sourceNoteId: note.id,
          });

          if (eventDate) {
            const contactName = contactId === 'new'
              ? editedName.trim().split(' ')[0]
              : extraction.contactIdentified.firstName;
            await notificationService.scheduleEventReminder(
              savedHotTopic.id,
              eventDate,
              topic.title,
              contactName
            );
          }
        }
      }

      if (resolvedTopicsState.length > 0) {
        for (const resolved of resolvedTopicsState) {
          await hotTopicService.resolve(resolved.id, resolved.resolution || undefined);
        }
      }

      await updateContactMutation.mutateAsync({
        id: finalContactId,
        data: { lastContactAt: new Date().toISOString() },
      });

      await queryClient.refetchQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(finalContactId) });

      const contactName = contactId === 'new'
        ? editedName.trim()
        : `${extraction.contactIdentified.firstName} ${extraction.contactIdentified.lastName || ''}`.trim();

      noteService.getByContact(finalContactId)
        .then((notes) => {
          const sortedNotes = [...notes]
            .filter((noteItem) => !!noteItem.transcription)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          const transcriptions = sortedNotes.map((noteItem) => {
            const date = new Date(noteItem.createdAt);
            const dateLocale = getLocaleDateStringLocale();
            const formattedDate = date.toLocaleDateString(dateLocale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            const formattedTime = date.toLocaleTimeString(dateLocale, {
              hour: '2-digit',
              minute: '2-digit',
            });
            return `[${formattedDate} à ${formattedTime}]\n${noteItem.transcription}`;
          });

          if (transcriptions.length > 0) {
            return generateSummary({ contactName, transcriptions });
          }
          return null;
        })
        .then(async (summary) => {
          if (summary) {
            await contactService.update(finalContactId, { aiSummary: summary });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
          }
        })
        .catch((error) => {
          console.error('Summary generation failed:', error);
        });

      const contactDetails = await contactService.getById(finalContactId);
      if (contactDetails) {
        const requestData = {
          contact: {
            firstName: contactDetails.firstName,
            lastName: contactDetails.lastName,
          },
          facts: contactDetails.facts.map((fact) => ({
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
          })),
          hotTopics: contactDetails.hotTopics
            .filter((topic) => topic.status === 'active')
            .map((topic) => ({
              title: topic.title,
              context: topic.context || '',
              status: topic.status,
            })),
        };

        generateSuggestedQuestions(requestData)
          .then(async (suggestedQuestions) => {
            await contactService.update(finalContactId, { suggestedQuestions });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
          })
          .catch(() => {});
      }

      const shouldGenerateAvatar = !contactDetails?.avatarUrl;
      if (shouldGenerateAvatar) {
        const gender = extraction.contactIdentified.gender || 'unknown';
        const avatarHints = extraction.contactIdentified.avatarHints || {
          physical: null,
          personality: null,
          interest: null,
          context: null,
        };

        addPendingAvatarGeneration(finalContactId);

        generateAvatarFromHints({
          contactId: finalContactId,
          gender,
          avatarHints,
        })
          .then(async (result) => {
            await contactService.update(finalContactId, { avatarUrl: result.avatarUrl });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
            console.log('[Avatar Auto] Successfully generated avatar for', finalContactId);
          })
          .catch((error) => {
            console.warn('[Avatar Auto] Generation failed (silent):', error);
          })
          .finally(() => {
            removePendingAvatarGeneration(finalContactId);
          });
      }

      setRecordingState('idle');
      router.dismissTo(`/contact/${finalContactId}`);
    } catch (error) {
      console.error('Failed to save:', error);
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screenContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {isEditingName ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={styles.editNameInput}
              value={editedName}
              onChangeText={setEditedName}
              autoFocus
              placeholder={t('review.namePlaceholder')}
              placeholderTextColor={Colors.textMuted}
            />
            <Pressable style={styles.editNameConfirm} onPress={() => setIsEditingName(false)}>
              <Text style={styles.editNameConfirmText}>OK</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.contactNameRow}
            onPress={() => contactId === 'new' && setIsEditingName(true)}
          >
            <Text style={styles.contactName}>{editedName}</Text>
            {contactId === 'new' && <Edit3 size={18} color={Colors.textMuted} style={{ marginLeft: 8 }} />}
          </Pressable>
        )}

        <Text style={styles.subtitle}>
          {contactId === 'new' ? t('review.newContact') : t('review.update')}
        </Text>

        <CollapsibleSection
          title={t('review.transcription')}
          defaultExpanded={false}
          icon={<FileText size={18} color={Colors.textSecondary} />}
        >
          <TranscriptionSection
            transcription={transcription}
            editedTranscription={editedTranscription}
            isEditing={isEditingTranscription}
            isReExtracting={isReExtracting}
            onEditStart={() => setIsEditingTranscription(true)}
            onEditCancel={() => {
              setEditedTranscription(transcription);
              setIsEditingTranscription(false);
            }}
            onChangeText={setEditedTranscription}
            onConfirm={handleTranscriptionEdit}
          />
        </CollapsibleSection>

        {hasContactInfo && (
          <CollapsibleSection
            title={t('contact.contactInfoReview.title')}
            defaultExpanded={true}
            badge={t('review.newItems', { count: contactInfoCount })}
            badgeColor={Colors.primary}
            icon={<Phone size={18} color={Colors.primary} />}
          >
            <ContactInfoSection
              contactInfo={editableContactInfo}
              editingField={editingContactInfoField}
              onEditField={setEditingContactInfoField}
              onUpdateContactInfo={setEditableContactInfo}
            />
          </CollapsibleSection>
        )}

        {editableFacts.length > 0 && (
          <CollapsibleSection
            title={t('review.extractedInfo')}
            defaultExpanded={true}
            badge={t('review.newItems', { count: editableFacts.length })}
            badgeColor={Colors.primary}
            icon={<Info size={18} color={Colors.primary} />}
          >
            <FactsSection
              facts={editableFacts}
              selectedFacts={selectedFacts}
              editingFactIndex={editingFactIndex}
              onToggleFact={toggleFact}
              onUpdateFact={updateFact}
              onSetEditingIndex={setEditingFactIndex}
            />
          </CollapsibleSection>
        )}

        {contactId === 'new' && (
          <CollapsibleSection
            title={t('review.groups')}
            defaultExpanded={true}
            icon={<Users size={18} color={Colors.primary} />}
          >
            <GroupsSection
              state={{
                selectedGroups,
                allGroups,
              }}
              handlers={{
                onToggleGroup: toggleGroup,
                onAddNewGroup: addNewGroup,
              }}
            />
          </CollapsibleSection>
        )}

        {hasResolvedTopics && (
          <CollapsibleSection
            title={t('review.topicsToArchive')}
            defaultExpanded={false}
            badge={t('review.toConfirm', { count: resolvedTopicsWithData.length })}
            badgeColor={Colors.success}
            icon={<Archive size={18} color={Colors.success} />}
          >
            <ResolvedTopicsSection
              state={{
                resolvedTopicsWithData,
                resolvedTopicsState,
                editingResolutionId,
              }}
              handlers={{
                onToggleResolved: toggleResolvedTopic,
                onUpdateResolution: updateResolution,
                onSetEditingResolutionId: setEditingResolutionId,
              }}
            />
          </CollapsibleSection>
        )}

        {editableHotTopics.length > 0 && (
          <CollapsibleSection
            title={t('review.news')}
            defaultExpanded={true}
            badge={t('review.newItems', { count: editableHotTopics.length })}
            badgeColor={Colors.primary}
            icon={<Zap size={18} color={Colors.warning} />}
          >
            <HotTopicsSection
              state={{
                hotTopics: editableHotTopics,
                selectedHotTopics,
                editingHotTopicIndex,
                hotTopicDates,
              }}
              handlers={{
                onToggleHotTopic: toggleHotTopic,
                onUpdateHotTopic: updateHotTopic,
                onSetEditingIndex: setEditingHotTopicIndex,
                onToggleDate: toggleHotTopicDate,
                onOpenDatePicker: openDatePicker,
                formatRelativeDate,
              }}
            />
          </CollapsibleSection>
        )}

        {editableMemories.length > 0 && (
          <CollapsibleSection
            title={t('review.memories')}
            defaultExpanded={true}
            badge={t('review.newItems', { count: editableMemories.length })}
            badgeColor={Colors.primary}
            icon={<Lightbulb size={18} color={Colors.primary} />}
          >
            <MemoriesSection
              memories={editableMemories}
              selectedMemories={selectedMemories}
              editingMemoryIndex={editingMemoryIndex}
              onToggleMemory={toggleMemory}
              onUpdateMemory={updateMemory}
              onSetEditingIndex={setEditingMemoryIndex}
            />
          </CollapsibleSection>
        )}

        {Platform.OS === 'android' && showDatePicker && datePickerIndex !== null && (
          <DateTimePicker
            value={hotTopicDates[datePickerIndex]?.date
              ? parseDateStringToDate(hotTopicDates[datePickerIndex].date)
              : new Date()
            }
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.datePickerModalOverlay}>
              <View style={styles.datePickerModalContent}>
                <View style={styles.datePickerModalHeader}>
                  <Pressable onPress={closeDatePicker}>
                    <Text style={styles.datePickerModalCancel}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Text style={styles.datePickerModalTitle}>{t('review.selectDate')}</Text>
                  <Pressable onPress={closeDatePicker}>
                    <Text style={styles.datePickerModalDone}>{t('common.confirm')}</Text>
                  </Pressable>
                </View>
                {datePickerIndex !== null && (
                  <DateTimePicker
                    value={hotTopicDates[datePickerIndex]?.date
                      ? parseDateStringToDate(hotTopicDates[datePickerIndex].date)
                      : new Date()
                    }
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    style={styles.iosDatePicker}
                  />
                )}
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>

      <View style={[styles.floatingSaveContainer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? t('review.saving') : t('review.save')}
          </Text>
        </Pressable>
      </View>

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall onClose={() => setShowPaywall(false)} reason="contact_limit" />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  contactName: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  editNameInput: {
    flex: 1,
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  editNameConfirm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
  },
  editNameConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  floatingSaveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    ...Shadows.fab,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.sans.bold,
    fontSize: 16,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(29, 26, 46, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  datePickerModalCancel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  datePickerModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  datePickerModalDone: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  iosDatePicker: {
    height: 200,
  },
});
