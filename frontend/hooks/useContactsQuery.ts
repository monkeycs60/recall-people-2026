import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { contactService } from '@/services/contact.service';
import { queryKeys } from '@/lib/query-keys';
import { Gender } from '@/types';

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
        lastContactAt: string;
      }>;
    }) => contactService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(variables.id),
      });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.removeQueries({ queryKey: queryKeys.contacts.detail(id) });
    },
  });
}
