import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { queryKeys } from '@/lib/query-keys';

export function useGroupsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.groups.list(),
    queryFn: () => groupService.getAll(),
    staleTime: 1000 * 60 * 10, // 10 minutes - groups change rarely
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  };

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    invalidate,
  };
}

export function useGroupsForContact(contactId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groups.forContact(contactId || ''),
    queryFn: () => groupService.getGroupsForContact(contactId!),
    enabled: !!contactId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useContactIdsForGroup(groupId: string | null) {
  return useQuery({
    queryKey: queryKeys.groups.contactIds(groupId || ''),
    queryFn: () => groupService.getContactIdsForGroup(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => groupService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => groupService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      groupService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function useSetContactGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      groupIds,
    }: {
      contactId: string;
      groupIds: string[];
    }) => groupService.setContactGroups(contactId, groupIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.forContact(variables.contactId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(variables.contactId),
      });
    },
  });
}
