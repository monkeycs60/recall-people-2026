import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { contactService } from '@/services/contact.service';
import { reminderService } from '@/services/reminder.service';
import { queryKeys } from '@/lib/query-keys';
import { Contact, Gender } from '@/types';

export function useContactsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.contacts.list(),
    queryFn: () => contactService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutes - données fraîches plus longtemps
    placeholderData: keepPreviousData, // Garde les anciennes données pendant le refetch
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
  };

  // isInitialLoading = true seulement au tout premier chargement (pas de cache)
  const isInitialLoading = query.isLoading && !query.isFetching;

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    isInitialLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    isPlaceholderData: query.isPlaceholderData,
    refetch: query.refetch,
    invalidate,
  };
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      firstName: string;
      lastName?: string;
      nickname?: string;
      gender?: Gender;
    }) => contactService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        firstName: string;
        lastName: string;
        nickname: string;
        avatarUrl: string;
        gender: Gender;
        phone: string;
        email: string;
        birthdayDay: number | null;
        birthdayMonth: number | null;
        birthdayYear: number | null;
        highlights: string[];
        meetingContext: string | null;
        loves: string[];
        reminderFrequencyDays: number | null;
        lastContactAt: string;
      }>;
    }) => contactService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.detail(id) });
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.list() });

      const previousDetail = queryClient.getQueryData<Contact>(queryKeys.contacts.detail(id));
      const previousList = queryClient.getQueryData<Contact[]>(queryKeys.contacts.list());

      queryClient.setQueryData<Contact>(queryKeys.contacts.detail(id), (current) =>
        current ? ({ ...current, ...data } as Contact) : current
      );
      queryClient.setQueryData<Contact[]>(queryKeys.contacts.list(), (current) =>
        (current ?? []).map((contact) =>
          contact.id === id ? ({ ...contact, ...data } as Contact) : contact
        )
      );

      return { previousDetail, previousList };
    },
    onError: (_error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.contacts.detail(variables.id), context.previousDetail);
      }
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.contacts.list(), context.previousList);
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(variables.id),
      });

      if (Object.prototype.hasOwnProperty.call(variables.data, 'reminderFrequencyDays')) {
        await reminderService.rescheduleNotSeenReminderForContact(variables.id);
      }
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.list() });
      const previousList = queryClient.getQueryData<Contact[]>(queryKeys.contacts.list());
      queryClient.setQueryData<Contact[]>(queryKeys.contacts.list(), (current) =>
        (current ?? []).filter((contact) => contact.id !== id)
      );
      return { previousList };
    },
    onError: (_error, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.contacts.list(), context.previousList);
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.removeQueries({ queryKey: queryKeys.contacts.detail(id) });
    },
  });
}
