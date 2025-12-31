import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { ExtractionResult, HotTopic, ResolvedTopic, ExtractedMemory } from '@/types';
import { useCreateContact, useUpdateContact } from '@/hooks/useContactsQuery';
import { useGroupsQuery } from '@/hooks/useGroupsQuery';
import { useNotes } from '@/hooks/useNotes';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { memoryService } from '@/services/memory.service';
import { notificationService } from '@/services/notification.service';
import { contactService } from '@/services/contact.service';
import { groupService } from '@/services/group.service';
import { generateIceBreakers } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { queryKeys } from '@/lib/query-keys';
import { Colors } from '@/constants/theme';
import { Archive, Edit3, Plus, X } from 'lucide-react-native';

function formatBirthdayDisplay(day: number, month: number, monthNames: string[], year?: number): string {
  const monthName = monthNames[month - 1] || month.toString();
  if (year) {
    return `${day} ${monthName} ${year}`;
  }
  return `${day} ${monthName}`;
}

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const { groups: allGroups } = useGroupsQuery();
  const { createNote } = useNotes();
  const { setRecordingState } = useAppStore();

  const extraction: ExtractionResult = JSON.parse(params.extraction as string);
  const audioUri = params.audioUri as string;
  const transcription = params.transcription as string;
  const contactId = params.contactId as string;

  const [selectedFacts, setSelectedFacts] = useState<number[]>(
    extraction.facts.map((_, index) => index)
  );
  const [editableFacts, setEditableFacts] = useState(
    extraction.facts.map((fact) => ({ ...fact }))
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
        enabled: !!topic.suggestedDate,
        date: topic.suggestedDate || '',
      };
    });
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [existingHotTopics, setExistingHotTopics] = useState<HotTopic[]>([]);

  const [resolvedTopicsState, setResolvedTopicsState] = useState<ResolvedTopic[]>(
    extraction.resolvedTopics || []
  );
  const [editingResolutionId, setEditingResolutionId] = useState<string | null>(null);

  const [selectedGroups, setSelectedGroups] = useState<Array<{
    name: string;
    isNew: boolean;
    existingId?: string;
  }>>(extraction.suggestedGroups || []);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupSearch, setNewGroupSearch] = useState('');

  const [acceptedContactInfo, setAcceptedContactInfo] = useState<{
    phone: boolean;
    email: boolean;
    birthday: boolean;
  }>({
    phone: !!extraction.contactInfo?.phone,
    email: !!extraction.contactInfo?.email,
    birthday: !!extraction.contactInfo?.birthday,
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

  const toggleResolvedTopic = (topicId: string) => {
    setResolvedTopicsState((prev) => {
      const exists = prev.some((resolved) => resolved.id === topicId);
      if (exists) {
        return prev.filter((resolved) => resolved.id !== topicId);
      } else {
        const originalResolution = extraction.resolvedTopics?.find((resolved) => resolved.id === topicId)?.resolution || '';
        return [...prev, { id: topicId, resolution: originalResolution }];
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
    setNewGroupSearch('');
    setIsAddingGroup(false);
  };

  const availableGroups = allGroups.filter((g) =>
    !selectedGroups.some((sg) => sg.existingId === g.id || sg.name.toLowerCase() === g.name.toLowerCase())
  );

  const filteredGroupsForSearch = newGroupSearch.trim()
    ? availableGroups.filter((g) =>
        g.name.toLowerCase().includes(newGroupSearch.toLowerCase())
      )
    : availableGroups.slice(0, 5);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let finalContactId = contactId;

      if (contactId === 'new') {
        const newContact = await createContactMutation.mutateAsync({
          firstName: extraction.contactIdentified.firstName,
          lastName: extraction.contactIdentified.lastName,
          nickname: extraction.contactIdentified.suggestedNickname,
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

      if (extraction.contactInfo) {
        const contactInfoUpdate: Partial<{
          phone: string;
          email: string;
          birthdayDay: number;
          birthdayMonth: number;
          birthdayYear: number;
        }> = {};

        if (acceptedContactInfo.phone && extraction.contactInfo.phone) {
          contactInfoUpdate.phone = extraction.contactInfo.phone;
        }
        if (acceptedContactInfo.email && extraction.contactInfo.email) {
          contactInfoUpdate.email = extraction.contactInfo.email;
        }
        if (acceptedContactInfo.birthday && extraction.contactInfo.birthday) {
          contactInfoUpdate.birthdayDay = extraction.contactInfo.birthday.day;
          contactInfoUpdate.birthdayMonth = extraction.contactInfo.birthday.month;
          if (extraction.contactInfo.birthday.year) {
            contactInfoUpdate.birthdayYear = extraction.contactInfo.birthday.year;
          }
        }

        if (Object.keys(contactInfoUpdate).length > 0) {
          await contactService.update(finalContactId, contactInfoUpdate);
        }
      }

      const note = await createNote({
        contactId: finalContactId,
        title: extraction.noteTitle,
        audioUri,
        transcription,
        summary: extraction.note.summary,
      });

      const cumulativeTypes = [
        'hobby', 'sport', 'children', 'language', 'pet',
        'shared_ref', 'trait', 'gift_idea', 'gift_given'
      ];

      for (const index of selectedFacts) {
        const fact = editableFacts[index];
        const isCumulative = cumulativeTypes.includes(fact.factType);

        if (isCumulative) {
          const existingWithSameValue = await factService.findByTypeAndValue(
            finalContactId,
            fact.factType,
            fact.factValue
          );

          if (existingWithSameValue) {
            continue;
          }

          await factService.create({
            contactId: finalContactId,
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
            sourceNoteId: note.id,
          });
        } else {
          const existingFact = await factService.findByTypeAndKey(
            finalContactId,
            fact.factType,
            fact.factKey
          );

          if (existingFact) {
            if (existingFact.factValue.toLowerCase() === fact.factValue.toLowerCase()) {
              continue;
            }
            await factService.updateWithHistory(existingFact.id, fact.factValue);
          } else {
            await factService.create({
              contactId: finalContactId,
              factType: fact.factType,
              factKey: fact.factKey,
              factValue: fact.factValue,
              sourceNoteId: note.id,
            });
          }
        }
      }

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
            const contactName = extraction.contactIdentified.firstName;
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

      if (editableMemories.length > 0) {
        for (const index of selectedMemories) {
          const memory = editableMemories[index];
          await memoryService.create({
            contactId: finalContactId,
            description: memory.description,
            eventDate: memory.eventDate || undefined,
            isShared: memory.isShared,
            sourceNoteId: note.id,
          });
        }
      }

      await updateContactMutation.mutateAsync({
        id: finalContactId,
        data: { lastContactAt: new Date().toISOString() },
      });

      // Save summary from extraction:
      // - For new contacts: always save if summary text exists
      // - For existing contacts: only save if marked as changed (relevant new info)
      const isNewContact = contactId === 'new';
      const summaryText = extraction.summary?.text;
      const summaryChanged = extraction.summary?.changed;
      if (summaryText && (isNewContact || summaryChanged)) {
        await contactService.update(finalContactId, { aiSummary: summaryText });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.facts.byContact(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories.byContact(finalContactId) });

      // Generate ice breakers in background
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

        generateIceBreakers(requestData)
          .then(async (iceBreakers) => {
            await contactService.update(finalContactId, { iceBreakers });
          })
          .catch(() => {});
      }

      setRecordingState('idle');
      router.replace(`/contact/${finalContactId}`);
    } catch (error) {
      console.error('Failed to save:', error);
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <Text style={styles.contactName}>
        {extraction.contactIdentified.firstName} {extraction.contactIdentified.lastName || extraction.contactIdentified.suggestedNickname || ''}
      </Text>

      <Text style={styles.subtitle}>
        {contactId === 'new' ? t('review.newContact') : t('review.update')}
      </Text>

      {extraction.contactInfo && (extraction.contactInfo.phone || extraction.contactInfo.email || extraction.contactInfo.birthday) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('contact.contactInfoReview.title')}</Text>

          {extraction.contactInfo.phone && (
            <View style={styles.contactInfoRow}>
              <View style={styles.contactInfoContent}>
                <Text style={styles.contactInfoLabel}>{t('contact.contactInfoReview.phone')}</Text>
                <Text style={styles.contactInfoValue}>{extraction.contactInfo.phone}</Text>
              </View>
              <View style={styles.contactInfoActions}>
                <Pressable
                  style={[styles.actionButton, acceptedContactInfo.phone && styles.actionButtonActive]}
                  onPress={() => setAcceptedContactInfo(prev => ({ ...prev, phone: true }))}
                >
                  <Text style={[styles.actionButtonText, acceptedContactInfo.phone && styles.actionButtonTextActive]}>
                    {t('contact.contactInfoReview.accept')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, !acceptedContactInfo.phone && styles.actionButtonActive]}
                  onPress={() => setAcceptedContactInfo(prev => ({ ...prev, phone: false }))}
                >
                  <Text style={[styles.actionButtonText, !acceptedContactInfo.phone && styles.actionButtonTextActive]}>
                    {t('contact.contactInfoReview.ignore')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {extraction.contactInfo.email && (
            <View style={styles.contactInfoRow}>
              <View style={styles.contactInfoContent}>
                <Text style={styles.contactInfoLabel}>{t('contact.contactInfoReview.email')}</Text>
                <Text style={styles.contactInfoValue}>{extraction.contactInfo.email}</Text>
              </View>
              <View style={styles.contactInfoActions}>
                <Pressable
                  style={[styles.actionButton, acceptedContactInfo.email && styles.actionButtonActive]}
                  onPress={() => setAcceptedContactInfo(prev => ({ ...prev, email: true }))}
                >
                  <Text style={[styles.actionButtonText, acceptedContactInfo.email && styles.actionButtonTextActive]}>
                    {t('contact.contactInfoReview.accept')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, !acceptedContactInfo.email && styles.actionButtonActive]}
                  onPress={() => setAcceptedContactInfo(prev => ({ ...prev, email: false }))}
                >
                  <Text style={[styles.actionButtonText, !acceptedContactInfo.email && styles.actionButtonTextActive]}>
                    {t('contact.contactInfoReview.ignore')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {extraction.contactInfo.birthday && (
            <View style={styles.contactInfoRow}>
              <View style={styles.contactInfoContent}>
                <Text style={styles.contactInfoLabel}>{t('contact.contactInfoReview.birthday')}</Text>
                <Text style={styles.contactInfoValue}>
                  {formatBirthdayDisplay(
                    extraction.contactInfo.birthday.day,
                    extraction.contactInfo.birthday.month,
                    t('contact.birthdayModal.months', { returnObjects: true }) as string[],
                    extraction.contactInfo.birthday.year
                  )}
                </Text>
              </View>
              <View style={styles.contactInfoActions}>
                <Pressable
                  style={[styles.actionButton, acceptedContactInfo.birthday && styles.actionButtonActive]}
                  onPress={() => setAcceptedContactInfo(prev => ({ ...prev, birthday: true }))}
                >
                  <Text style={[styles.actionButtonText, acceptedContactInfo.birthday && styles.actionButtonTextActive]}>
                    {t('contact.contactInfoReview.accept')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, !acceptedContactInfo.birthday && styles.actionButtonActive]}
                  onPress={() => setAcceptedContactInfo(prev => ({ ...prev, birthday: false }))}
                >
                  <Text style={[styles.actionButtonText, !acceptedContactInfo.birthday && styles.actionButtonTextActive]}>
                    {t('contact.contactInfoReview.ignore')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {editableFacts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('review.extractedInfo')}
          </Text>

          {editableFacts.map((fact, index) => {
            const isEditing = editingFactIndex === index;

            if (isEditing) {
              return (
                <View key={index} style={styles.card}>
                  <Text style={styles.factLabel}>{fact.factKey}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={fact.factValue}
                    onChangeText={(value) => updateFact(index, 'factValue', value)}
                    placeholder={t('review.valuePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Pressable
                    style={styles.confirmButton}
                    onPress={() => setEditingFactIndex(null)}
                  >
                    <Text style={styles.confirmButtonText}>OK</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View key={index} style={styles.cardRowStandalone}>
                <Pressable onPress={() => toggleFact(index)}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedFacts.includes(index) && styles.checkboxSelected
                    ]}
                  >
                    {selectedFacts.includes(index) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </Pressable>

                <Pressable style={styles.cardContent} onPress={() => setEditingFactIndex(index)}>
                  <View style={styles.factRow}>
                    <Text style={styles.factLabel}>{fact.factKey}</Text>
                    <Edit3 size={14} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.factValue}>{fact.factValue}</Text>
                  {fact.action === 'update' && fact.previousValue && (
                    <Text style={styles.previousValue}>
                      {t('review.previousValue', { value: fact.previousValue })}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {contactId === 'new' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('review.groups')}
          </Text>

          <View style={styles.chipsRow}>
            {selectedGroups.map((group) => (
              <Pressable
                key={group.name}
                style={styles.groupChip}
                onPress={() => toggleGroup(group)}
              >
                <Text style={styles.groupChipText}>{group.name}</Text>
                {group.isNew && (
                  <Text style={styles.groupChipNew}>{t('review.new')}</Text>
                )}
                <X size={14} color={Colors.primary} />
              </Pressable>
            ))}
          </View>

          {isAddingGroup ? (
            <View style={styles.card}>
              <TextInput
                style={styles.textInput}
                value={newGroupSearch}
                onChangeText={setNewGroupSearch}
                placeholder={t('review.groupNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />

              {filteredGroupsForSearch.length > 0 && (
                <View style={styles.searchResults}>
                  {filteredGroupsForSearch.map((group) => (
                    <Pressable
                      key={group.id}
                      style={styles.searchResultItem}
                      onPress={() => addNewGroup(group.name)}
                    >
                      <Text style={styles.searchResultText}>{group.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {newGroupSearch.trim() && !filteredGroupsForSearch.some(
                (g) => g.name.toLowerCase() === newGroupSearch.toLowerCase()
              ) && !allGroups.some(
                (g) => g.name.toLowerCase() === newGroupSearch.toLowerCase()
              ) && (
                <Pressable
                  style={styles.createGroupButton}
                  onPress={() => addNewGroup(newGroupSearch)}
                >
                  <Text style={styles.createGroupText}>
                    {t('review.createGroup', { name: newGroupSearch.trim() })}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setIsAddingGroup(false);
                  setNewGroupSearch('');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.addGroupButton}
              onPress={() => setIsAddingGroup(true)}
            >
              <Plus size={18} color={Colors.primary} />
              <Text style={styles.addGroupText}>{t('review.addGroup')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {(resolvedTopicsWithData.length > 0 || (extraction.resolvedTopics?.length ?? 0) > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Archive size={20} color={Colors.success} />
            <Text style={styles.sectionTitleWithIcon}>
              {t('review.topicsToArchive')}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('review.topicsToArchiveDescription')}
          </Text>

          {existingHotTopics
            .filter((topic) => extraction.resolvedTopics?.some((resolved) => resolved.id === topic.id))
            .map((topic) => {
              const isSelected = resolvedTopicsState.some((resolved) => resolved.id === topic.id);
              const currentResolution = resolvedTopicsState.find((resolved) => resolved.id === topic.id)?.resolution || '';
              const isEditing = editingResolutionId === topic.id;

              return (
                <View key={topic.id} style={styles.resolvedCard}>
                  <Pressable
                    style={styles.cardRowStart}
                    onPress={() => toggleResolvedTopic(topic.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSuccess
                      ]}
                    >
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.factValue}>{topic.title}</Text>
                      {topic.context && (
                        <Text style={styles.contextText}>{topic.context}</Text>
                      )}
                    </View>
                  </Pressable>

                  {isSelected && (
                    <View style={styles.resolutionContainer}>
                      <Text style={styles.resolutionLabel}>{t('review.resolutionLabel')}</Text>
                      {isEditing ? (
                        <View>
                          <TextInput
                            style={styles.textInputSmall}
                            value={currentResolution}
                            onChangeText={(value) => updateResolution(topic.id, value)}
                            placeholder={t('review.resolutionPlaceholder')}
                            placeholderTextColor={Colors.textMuted}
                            multiline
                            autoFocus
                          />
                          <Pressable
                            style={styles.confirmButtonSuccess}
                            onPress={() => setEditingResolutionId(null)}
                          >
                            <Text style={styles.confirmButtonSuccessText}>{t('common.confirm')}</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={styles.resolutionRow}
                          onPress={() => setEditingResolutionId(topic.id)}
                        >
                          <Text style={styles.resolutionText}>
                            {currentResolution || t('review.addResolution')}
                          </Text>
                          <Edit3 size={14} color={Colors.success} />
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      )}

      {editableHotTopics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('review.news')}</Text>

          {editableHotTopics.map((topic, index) => {
            const isEditing = editingHotTopicIndex === index;

            if (isEditing) {
              return (
                <View key={index} style={styles.card}>
                  <TextInput
                    style={[styles.textInput, styles.textInputBold]}
                    value={topic.title}
                    onChangeText={(value) => updateHotTopic(index, 'title', value)}
                    placeholder={t('review.titlePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={topic.context || ''}
                    onChangeText={(value) => updateHotTopic(index, 'context', value)}
                    placeholder={t('review.contextPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                  <Pressable
                    style={styles.confirmButton}
                    onPress={() => setEditingHotTopicIndex(null)}
                  >
                    <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              );
            }

            const dateInfo = hotTopicDates[index];

            return (
              <View key={index} style={styles.card}>
                <View style={styles.cardRow}>
                  <Pressable onPress={() => toggleHotTopic(index)}>
                    <View
                      style={[
                        styles.checkbox,
                        selectedHotTopics.includes(index) && styles.checkboxSelected
                      ]}
                    >
                      {selectedHotTopics.includes(index) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </Pressable>

                  <View style={styles.orangeDot} />

                  <Pressable style={styles.cardContent} onPress={() => setEditingHotTopicIndex(index)}>
                    <View style={styles.factRow}>
                      <Text style={styles.factValue}>{topic.title}</Text>
                      <Edit3 size={14} color={Colors.textMuted} />
                    </View>
                    {topic.context && (
                      <Text style={styles.contextText}>{topic.context}</Text>
                    )}
                  </Pressable>
                </View>

                <View style={styles.reminderRow}>
                  <Pressable
                    style={styles.reminderCheckbox}
                    onPress={() => toggleHotTopicDate(index)}
                  >
                    <View
                      style={[
                        styles.smallCheckbox,
                        dateInfo?.enabled && styles.smallCheckboxSelected
                      ]}
                    >
                      {dateInfo?.enabled && (
                        <Text style={styles.smallCheckmark}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.reminderLabel}>{t('review.reminder')}</Text>
                  </Pressable>

                  {dateInfo?.enabled && (
                    <>
                      <TextInput
                        style={styles.dateInput}
                        value={dateInfo.date}
                        onChangeText={(value) => updateHotTopicDate(index, value)}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor={Colors.textMuted}
                      />
                      {dateInfo.date && (
                        <Text style={styles.relativeDateText}>
                          {formatRelativeDate(dateInfo.date)}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {editableMemories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('review.memories')}</Text>

          {editableMemories.map((memory, index) => {
            const isEditing = editingMemoryIndex === index;

            if (isEditing) {
              return (
                <View key={index} style={styles.card}>
                  <TextInput
                    style={styles.textInput}
                    value={memory.description}
                    onChangeText={(value) => updateMemory(index, 'description', value)}
                    placeholder={t('review.descriptionPlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                  <TextInput
                    style={styles.textInput}
                    value={memory.eventDate || ''}
                    onChangeText={(value) => updateMemory(index, 'eventDate', value)}
                    placeholder={t('review.datePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Pressable
                    style={styles.confirmButton}
                    onPress={() => setEditingMemoryIndex(null)}
                  >
                    <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View key={index} style={styles.cardRowStandalone}>
                <Pressable onPress={() => toggleMemory(index)}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedMemories.includes(index) && styles.checkboxSelected
                    ]}
                  >
                    {selectedMemories.includes(index) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </Pressable>

                <View style={[styles.memoryDot, memory.isShared ? styles.blueDot : styles.purpleDot]} />

                <Pressable style={styles.cardContent} onPress={() => setEditingMemoryIndex(index)}>
                  <View style={styles.factRow}>
                    <Text style={styles.factValue}>{memory.description}</Text>
                    <Edit3 size={14} color={Colors.textMuted} />
                  </View>
                  <View style={styles.memoryMeta}>
                    {memory.eventDate && (
                      <Text style={styles.memoryDate}>{memory.eventDate}</Text>
                    )}
                    <Text style={styles.memoryType}>
                      {memory.isShared ? t('review.together') : t('review.solo')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? t('review.saving') : t('review.save')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  contactName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWithIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardRowStandalone: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardRowStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardContent: {
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHover,
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
  },
  checkboxSuccess: {
    backgroundColor: Colors.success,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 12,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginBottom: 8,
  },
  factValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  previousValue: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 4,
  },
  contextText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  textInputSmall: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  textInputBold: {
    fontWeight: '500',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  confirmButtonSuccess: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.success}20`,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  confirmButtonSuccessText: {
    color: Colors.success,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  groupChipText: {
    color: Colors.primary,
    marginRight: 4,
  },
  groupChipNew: {
    color: Colors.primary,
    opacity: 0.6,
    fontSize: 12,
    marginRight: 4,
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addGroupText: {
    color: Colors.primary,
    marginLeft: 8,
  },
  searchResults: {
    marginBottom: 8,
  },
  searchResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceHover,
    borderRadius: 8,
    marginBottom: 4,
  },
  searchResultText: {
    color: Colors.textPrimary,
  },
  createGroupButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  createGroupText: {
    color: Colors.primary,
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
  },
  resolvedCard: {
    backgroundColor: `${Colors.success}10`,
    borderWidth: 1,
    borderColor: `${Colors.success}30`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resolutionContainer: {
    marginTop: 12,
    marginLeft: 32,
  },
  resolutionLabel: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  resolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resolutionText: {
    color: Colors.success,
    fontSize: 14,
    flex: 1,
  },
  orangeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
    marginTop: 6,
    marginRight: 12,
  },
  memoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 12,
  },
  blueDot: {
    backgroundColor: '#3B82F6',
  },
  purpleDot: {
    backgroundColor: '#8B5CF6',
  },
  memoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memoryDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  memoryType: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkboxInfo: {
    backgroundColor: Colors.info,
  },
  calendarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.info,
    marginTop: 6,
    marginRight: 12,
  },
  eventDate: {
    fontSize: 14,
    color: Colors.info,
    marginTop: 4,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontWeight: '600',
    fontSize: 18,
  },
  contactInfoRow: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  contactInfoContent: {
    marginBottom: 8,
  },
  contactInfoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  contactInfoValue: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  contactInfoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionButtonTextActive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
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
    borderColor: Colors.border,
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
  dateInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 120,
  },
  relativeDateText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: '500',
  },
});
