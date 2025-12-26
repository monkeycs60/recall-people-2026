export const queryKeys = {
  contacts: {
    all: ['contacts'] as const,
    list: () => [...queryKeys.contacts.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.contacts.all, 'detail', id] as const,
    previews: () => [...queryKeys.contacts.all, 'previews'] as const,
  },
  groups: {
    all: ['groups'] as const,
    list: () => [...queryKeys.groups.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.groups.all, 'detail', id] as const,
    forContact: (contactId: string) => [...queryKeys.groups.all, 'forContact', contactId] as const,
    contactIds: (groupId: string) => [...queryKeys.groups.all, 'contactIds', groupId] as const,
  },
  facts: {
    all: ['facts'] as const,
    byContact: (contactId: string) => [...queryKeys.facts.all, 'byContact', contactId] as const,
  },
  hotTopics: {
    all: ['hotTopics'] as const,
    byContact: (contactId: string) => [...queryKeys.hotTopics.all, 'byContact', contactId] as const,
  },
  memories: {
    all: ['memories'] as const,
    byContact: (contactId: string) => [...queryKeys.memories.all, 'byContact', contactId] as const,
  },
  notes: {
    all: ['notes'] as const,
    byContact: (contactId: string) => [...queryKeys.notes.all, 'byContact', contactId] as const,
  },
};
