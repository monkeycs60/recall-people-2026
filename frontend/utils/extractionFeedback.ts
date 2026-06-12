import type {
  ExtractedFact,
  ExtractedHotTopicV1,
  ExtractedMemory,
  ExtractionResult,
  ResolvedTopic,
} from '@/types';

export type SectionFeedback = {
  extracted: number;
  kept: number;
  edited: number;
};

export type ExtractionFeedback = {
  facts: SectionFeedback;
  hotTopics: SectionFeedback & {
    datesChanged: number;
    remindersDisabled: number;
  };
  memories: SectionFeedback;
  resolvedTopics: {
    extracted: number;
    kept: number;
    resolutionsEdited: number;
  };
  loves: {
    extracted: number;
    kept: number;
    added: number;
  };
  groups: {
    suggested: number;
    kept: number;
    added: number;
  };
  contactInfoEdited: boolean;
  nameEdited: boolean;
  transcriptionEdited: boolean;
};

export type ReviewContactInfoState = {
  phone: string | null;
  email: string | null;
  birthday: { day: number; month: number; year?: number } | null;
};

export type ReviewFinalState = {
  facts: ExtractedFact[];
  selectedFactIndexes: number[];
  hotTopics: ExtractedHotTopicV1[];
  selectedHotTopicIndexes: number[];
  hotTopicDates: Record<number, { enabled: boolean; date: string }>;
  memories: ExtractedMemory[];
  selectedMemoryIndexes: number[];
  resolvedTopics: ResolvedTopic[];
  loves: string[];
  groups: { name: string; isNew: boolean; existingId?: string }[];
  contactInfo: ReviewContactInfoState;
  name: string;
  transcription: string;
};

export function deriveInitialContactName(contactIdentified: {
  firstName: string;
  lastName?: string;
  suggestedNickname?: string;
}): string {
  const { firstName, lastName, suggestedNickname } = contactIdentified;
  if (lastName) {
    return `${firstName} ${lastName}`;
  }
  if (suggestedNickname) {
    return suggestedNickname;
  }
  return firstName;
}

const normalizeLabel = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

const countEditedAmongKept = <Item>(
  originalItems: Item[],
  finalItems: Item[],
  keptIndexes: number[],
  isEdited: (original: Item, final: Item) => boolean
): number =>
  keptIndexes.filter((index) => {
    const original = originalItems[index];
    const final = finalItems[index];
    return !!original && !!final && isEdited(original, final);
  }).length;

const compareBirthday = (
  extracted: { day: number; month: number; year?: number | null } | null | undefined,
  final: { day: number; month: number; year?: number } | null
): boolean => {
  if (!extracted && !final) return true;
  if (!extracted || !final) return false;
  return (
    extracted.day === final.day &&
    extracted.month === final.month &&
    (extracted.year ?? null) === (final.year ?? null)
  );
};

export function computeExtractionFeedback(
  extraction: ExtractionResult,
  finalState: ReviewFinalState,
  originalTranscription: string
): ExtractionFeedback {
  const extractedFacts = extraction.facts || [];
  const extractedHotTopics = extraction.hotTopics || [];
  const extractedMemories = extraction.memories || [];
  const extractedResolvedTopics = extraction.resolvedTopics || [];
  const extractedLoves = extraction.loves || [];
  const suggestedGroups = extraction.suggestedGroups || [];

  const factsEdited = countEditedAmongKept(
    extractedFacts,
    finalState.facts,
    finalState.selectedFactIndexes,
    (original, final) =>
      original.factType !== final.factType ||
      original.factKey !== final.factKey ||
      original.factValue !== final.factValue
  );

  const hotTopicsEdited = countEditedAmongKept(
    extractedHotTopics,
    finalState.hotTopics,
    finalState.selectedHotTopicIndexes,
    (original, final) =>
      original.title !== final.title || (original.context || '') !== (final.context || '')
  );

  const datesChanged = finalState.selectedHotTopicIndexes.filter((index) => {
    const dateInfo = finalState.hotTopicDates[index];
    if (!dateInfo) return false;
    const suggestedDate = extractedHotTopics[index]?.suggestedDate || '';
    return dateInfo.date !== suggestedDate;
  }).length;

  const remindersDisabled = finalState.selectedHotTopicIndexes.filter(
    (index) => finalState.hotTopicDates[index]?.enabled === false
  ).length;

  const memoriesEdited = countEditedAmongKept(
    extractedMemories,
    finalState.memories,
    finalState.selectedMemoryIndexes,
    (original, final) =>
      original.description !== final.description ||
      (original.eventDate || '') !== (final.eventDate || '')
  );

  const resolutionsEdited = finalState.resolvedTopics.filter((finalTopic) => {
    const original = extractedResolvedTopics.find(
      (extractedTopic) =>
        extractedTopic.id === finalTopic.id ||
        extractedTopic.existingTopicId === finalTopic.existingTopicId
    );
    return !!original && original.resolution !== finalTopic.resolution;
  }).length;

  const extractedLoveKeys = new Set(extractedLoves.map(normalizeLabel));
  const finalLoveKeys = finalState.loves.map(normalizeLabel);
  const lovesKept = finalLoveKeys.filter((loveKey) => extractedLoveKeys.has(loveKey)).length;
  const lovesAdded = finalLoveKeys.length - lovesKept;

  const suggestedGroupKeys = new Set(
    suggestedGroups.map((group) => normalizeLabel(group.name))
  );
  const finalGroupKeys = finalState.groups.map((group) => normalizeLabel(group.name));
  const groupsKept = finalGroupKeys.filter((groupKey) => suggestedGroupKeys.has(groupKey)).length;
  const groupsAdded = finalGroupKeys.length - groupsKept;

  const contactInfoEdited =
    (extraction.contactInfo?.phone || null) !== finalState.contactInfo.phone ||
    (extraction.contactInfo?.email || null) !== finalState.contactInfo.email ||
    !compareBirthday(extraction.contactInfo?.birthday, finalState.contactInfo.birthday);

  const initialName = deriveInitialContactName(extraction.contactIdentified);

  return {
    facts: {
      extracted: extractedFacts.length,
      kept: finalState.selectedFactIndexes.length,
      edited: factsEdited,
    },
    hotTopics: {
      extracted: extractedHotTopics.length,
      kept: finalState.selectedHotTopicIndexes.length,
      edited: hotTopicsEdited,
      datesChanged,
      remindersDisabled,
    },
    memories: {
      extracted: extractedMemories.length,
      kept: finalState.selectedMemoryIndexes.length,
      edited: memoriesEdited,
    },
    resolvedTopics: {
      extracted: extractedResolvedTopics.length,
      kept: finalState.resolvedTopics.length,
      resolutionsEdited,
    },
    loves: {
      extracted: extractedLoves.length,
      kept: lovesKept,
      added: lovesAdded,
    },
    groups: {
      suggested: suggestedGroups.length,
      kept: groupsKept,
      added: groupsAdded,
    },
    contactInfoEdited,
    nameEdited: finalState.name.trim() !== initialName.trim(),
    transcriptionEdited: finalState.transcription.trim() !== originalTranscription.trim(),
  };
}
