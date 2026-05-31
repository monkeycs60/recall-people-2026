type ScopedQuestionEntry = {
  scopeContactId?: string | null;
};

type ContactPromptSource = {
  suggestedQuestions?: { text?: string | null }[] | null;
};

export type ContactAssistantAvatarFrame = 'contact' | 'icon';

export function getContactAssistantAvatarFrame(hasContact: boolean): ContactAssistantAvatarFrame {
  return hasContact ? 'contact' : 'icon';
}

export function filterQuestionEntriesForScope<T extends ScopedQuestionEntry>(
  entries: T[],
  scopeContactId: string | null | undefined
): T[] {
  if (!scopeContactId) {
    return entries.filter((entry) => !entry.scopeContactId);
  }

  return entries.filter((entry) => entry.scopeContactId === scopeContactId);
}

export function buildContactAssistantPrompts(
  contact: ContactPromptSource,
  fallbackPrompts: string[]
): string[] {
  const suggestedPrompts = contact.suggestedQuestions
    ?.map((question) => question.text?.trim())
    .filter((text): text is string => Boolean(text));

  if (suggestedPrompts && suggestedPrompts.length > 0) {
    return suggestedPrompts;
  }

  return fallbackPrompts;
}
