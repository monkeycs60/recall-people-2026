import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { queryKeys } from '@/lib/query-keys';
import { Contact, Fact, HotTopic } from '@/types';

type ContactPreview = {
  facts: Fact[];
  hotTopics: HotTopic[];
};

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function filterHotTopicsForCard(hotTopics: HotTopic[]): HotTopic[] {
  const now = Date.now();
  const twoWeeksFromNow = now + TWO_WEEKS_MS;

  // Separate birthday and non-birthday topics
  const birthdayTopics = hotTopics.filter((topic) => topic.birthdayContactId);
  const regularTopics = hotTopics.filter((topic) => !topic.birthdayContactId);

  // For birthdays: only show if within next 2 weeks, and only the closest one
  let upcomingBirthday: HotTopic | null = null;
  for (const topic of birthdayTopics) {
    if (topic.eventDate) {
      const eventTime = new Date(topic.eventDate).getTime();
      if (eventTime >= now && eventTime <= twoWeeksFromNow) {
        if (!upcomingBirthday || eventTime < new Date(upcomingBirthday.eventDate!).getTime()) {
          upcomingBirthday = topic;
        }
      }
    }
  }

  // Combine: regular topics + upcoming birthday (if any)
  const result = regularTopics.filter((topic) => topic.status === 'active');
  if (upcomingBirthday) {
    result.push(upcomingBirthday);
  }

  return result.slice(0, 2);
}

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
    const filteredHotTopics = filterHotTopicsForCard(hotTopics);

    previews.set(contact.id, {
      facts: facts.slice(0, 2),
      hotTopics: filteredHotTopics,
    });
  });

  const invalidateForContact = useCallback((contactId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.facts.byContact(contactId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(contactId) });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.facts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.all });
  }, [queryClient]);

  const refetchAll = useCallback(() => {
    return Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeys.facts.all }),
      queryClient.refetchQueries({ queryKey: queryKeys.hotTopics.all }),
    ]);
  }, [queryClient]);

  return {
    previews,
    isLoading,
    invalidateForContact,
    invalidateAll,
    refetchAll,
  };
}
