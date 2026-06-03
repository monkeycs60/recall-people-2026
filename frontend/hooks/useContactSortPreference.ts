import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { contactSortPreferenceService } from '@/services/contact-sort-preference.service';
import {
  CONTACT_SORT_DEFAULT_MODE,
  type ContactSortMode,
} from '@/utils/contactSort';

export function useContactSortPreference() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.preferences.contactSortMode(),
    queryFn: () => contactSortPreferenceService.get(),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (mode: ContactSortMode) => contactSortPreferenceService.set(mode),
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.preferences.contactSortMode() });
      const previous = queryClient.getQueryData<ContactSortMode>(queryKeys.preferences.contactSortMode());
      queryClient.setQueryData(queryKeys.preferences.contactSortMode(), mode);
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.preferences.contactSortMode(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.contactSortMode() });
    },
  });

  return {
    sortMode: query.data ?? CONTACT_SORT_DEFAULT_MODE,
    isLoading: query.isLoading,
    setSortMode: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
