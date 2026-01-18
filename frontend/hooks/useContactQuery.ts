import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '@/services/contact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { noteService } from '@/services/note.service';
import { queryKeys } from '@/lib/query-keys';

export function useContactQuery(contactId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.contacts.detail(contactId || ''),
    queryFn: () => contactService.getById(contactId!),
    enabled: !!contactId,
    refetchInterval: (query) => {
      const contact = query.state.data;
      if (!contact) return false;

      const hasHotTopics = contact.hotTopics.length > 0;
      const hasNotes = contact.notes.length > 0;
      const hasData = hasHotTopics || hasNotes;
      const hasNoSummary = !contact.aiSummary;
      const hasNoSuggestedQuestions = !contact.suggestedQuestions || contact.suggestedQuestions.length === 0;

      // Only poll if there's recent activity (note added within last 2 minutes)
      // This prevents infinite polling for contacts where summary generation already failed/completed
      const mostRecentNote = contact.notes[0];
      const isRecentActivity = mostRecentNote &&
        (Date.now() - new Date(mostRecentNote.createdAt).getTime()) < 2 * 60 * 1000;

      // Poll every 1.5s if contact has recent data but no summary or suggested questions yet
      if (hasData && isRecentActivity && (hasNoSummary || hasNoSuggestedQuestions)) {
        return 1500;
      }

      return false;
    },
  });

  const hasData = query.data && (query.data.hotTopics.length > 0 || query.data.notes.length > 0);

  // Only show loading state if there's recent activity (within 2 minutes)
  // Otherwise show empty state for contacts where generation already failed/completed
  const mostRecentNote = query.data?.notes[0];
  const isRecentActivity = mostRecentNote &&
    (Date.now() - new Date(mostRecentNote.createdAt).getTime()) < 2 * 60 * 1000;

  const isWaitingForSummary = hasData && isRecentActivity && !query.data?.aiSummary;

  const isWaitingForSuggestedQuestions =
    hasData && isRecentActivity && (!query.data?.suggestedQuestions || query.data.suggestedQuestions.length === 0);

  const invalidate = () => {
    if (contactId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(contactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list() });
    }
  };

  return {
    contact: query.data ?? null,
    isLoading: query.isLoading,
    isWaitingForSummary: Boolean(isWaitingForSummary),
    isWaitingForSuggestedQuestions: Boolean(isWaitingForSuggestedQuestions),
    refetch: query.refetch,
    invalidate,
  };
}

export function useResolveHotTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution?: string }) =>
      hotTopicService.resolve(id, resolution),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useReopenHotTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hotTopicService.reopen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useDeleteHotTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => hotTopicService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateHotTopic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { title?: string; context?: string };
    }) => hotTopicService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateHotTopicResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      hotTopicService.updateResolution(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => noteService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}
