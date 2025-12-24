import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contactService } from '@/services/contact.service';
import { ContactWithDetails } from '@/types';

export const contactKeys = {
  all: ['contacts'] as const,
  detail: (id: string) => ['contacts', id] as const,
};

export function useContactQuery(contactId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: contactKeys.detail(contactId || ''),
    queryFn: () => contactService.getById(contactId!),
    enabled: !!contactId,
    refetchInterval: (query) => {
      const contact = query.state.data;
      if (!contact) return false;

      const hasFacts = contact.facts.length > 0;
      const hasHotTopics = contact.hotTopics.length > 0;
      const hasNoSummary = !contact.aiSummary;

      // Poll every 1.5s if contact has data but no summary yet
      if (hasNoSummary && (hasFacts || hasHotTopics)) {
        return 1500;
      }

      return false;
    },
  });

  const isWaitingForSummary =
    query.data &&
    !query.data.aiSummary &&
    (query.data.facts.length > 0 || query.data.hotTopics.length > 0);

  const invalidate = () => {
    if (contactId) {
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(contactId) });
    }
  };

  return {
    contact: query.data ?? null,
    isLoading: query.isLoading,
    isWaitingForSummary: Boolean(isWaitingForSummary),
    refetch: query.refetch,
    invalidate,
  };
}
