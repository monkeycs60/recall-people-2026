import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { groupService } from '@/services/group.service';
import { queryKeys } from '@/lib/query-keys';
import {
  mergeGroupIntoGroupsCache,
  selectContactGroupsFromCache,
} from '@/lib/group-cache';
import { Group } from '@/types';

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
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
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

export function useGroupContactCounts() {
  return useQuery({
    queryKey: queryKeys.groups.contactCounts(),
    queryFn: () => groupService.getContactCountsByGroup(),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => groupService.create(name),
    onSuccess: (createdGroup) => {
      queryClient.setQueryData<Group[]>(
        queryKeys.groups.list(),
        (cachedGroups) => mergeGroupIntoGroupsCache(cachedGroups, createdGroup)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    },
  });
}

export function invalidateAllGroupContactIds(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      query.queryKey[0] === 'groups' && query.queryKey[1] === 'contactIds',
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => groupService.delete(id),
    onSuccess: (_, deletedGroupId) => {
      queryClient.setQueryData<Group[]>(
        queryKeys.groups.list(),
        (cachedGroups) => (cachedGroups ?? []).filter((group) => group.id !== deletedGroupId)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.contactIds(deletedGroupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.contactCounts() });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      groupService.update(id, name),
    onSuccess: (_, updatedGroup) => {
      const now = new Date().toISOString();
      queryClient.setQueryData<Group[]>(
        queryKeys.groups.list(),
        (cachedGroups) => {
          const cachedGroup = cachedGroups?.find((group) => group.id === updatedGroup.id);
          if (!cachedGroup) return cachedGroups ?? [];

          return mergeGroupIntoGroupsCache(cachedGroups, {
            ...cachedGroup,
            name: updatedGroup.name,
            updatedAt: now,
          });
        }
      );
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
      const cachedGroups = queryClient.getQueryData<Group[]>(queryKeys.groups.list());
      if (cachedGroups) {
        queryClient.setQueryData<Group[]>(
          queryKeys.groups.forContact(variables.contactId),
          selectContactGroupsFromCache(cachedGroups, variables.groupIds)
        );
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.groups.forContact(variables.contactId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.detail(variables.contactId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.contactCounts() });
      invalidateAllGroupContactIds(queryClient);
    },
  });
}
