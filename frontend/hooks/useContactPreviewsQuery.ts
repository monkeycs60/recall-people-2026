import { useQueries, useQueryClient } from '@tanstack/react-query';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { queryKeys } from '@/lib/query-keys';
import { Contact, Fact, HotTopic } from '@/types';

type ContactPreview = {
  facts: Fact[];
  hotTopic: HotTopic | null;
};

export function useContactPreviewsQuery(contacts: Contact[]) {
  const queryClient = useQueryClient();

  const factsQueries = useQueries({
    queries: contacts.map((contact) => ({
      queryKey: queryKeys.facts.byContact(contact.id),
      queryFn: () => factService.getByContact(contact.id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  const hotTopicsQueries = useQueries({
    queries: contacts.map((contact) => ({
      queryKey: queryKeys.hotTopics.byContact(contact.id),
      queryFn: () => hotTopicService.getByContact(contact.id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    })),
  });

  const isLoading = factsQueries.some((query) => query.isLoading) || hotTopicsQueries.some((query) => query.isLoading);

  const previews = new Map<string, ContactPreview>();

  contacts.forEach((contact, index) => {
    const facts = factsQueries[index]?.data ?? [];
    const hotTopics = hotTopicsQueries[index]?.data ?? [];

    previews.set(contact.id, {
      facts: facts.slice(0, 2),
      hotTopic: hotTopics.find((hotTopic) => hotTopic.status === 'active') ?? null,
    });
  });

  const invalidateForContact = (contactId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.facts.byContact(contactId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(contactId) });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.facts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
  };

  return {
    previews,
    isLoading,
    invalidateForContact,
    invalidateAll,
  };
}
