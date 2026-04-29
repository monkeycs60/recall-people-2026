import { Group } from '@/types';

type BuildGroupChipsParams = {
  allGroups: Group[];
  contactCountByGroupId: Record<string, number>;
  allGroupLabel: string;
  totalContactsCount: number;
};

export type GroupChip = {
  id: string | null;
  name: string;
  count: number;
};

const compareGroupsByName = (firstGroup: Group, secondGroup: Group) =>
  firstGroup.name.localeCompare(secondGroup.name, undefined, { sensitivity: 'base' });

export const mergeGroupIntoGroupsCache = (
  cachedGroups: Group[] | undefined,
  groupToMerge: Group
): Group[] => {
  const groupsWithoutMergedGroup = (cachedGroups ?? []).filter(
    (group) => group.id !== groupToMerge.id
  );

  return [...groupsWithoutMergedGroup, groupToMerge].sort(compareGroupsByName);
};

export const selectContactGroupsFromCache = (
  cachedGroups: Group[] | undefined,
  groupIds: string[]
): Group[] => {
  const selectedGroupIds = new Set(groupIds);

  return (cachedGroups ?? []).filter((group) => selectedGroupIds.has(group.id));
};

export const buildGroupChips = ({
  allGroups,
  contactCountByGroupId,
  allGroupLabel,
  totalContactsCount,
}: BuildGroupChipsParams): GroupChip[] => [
  { id: null, name: allGroupLabel, count: totalContactsCount },
  ...allGroups.map((group) => ({
    id: group.id,
    name: group.name,
    count: contactCountByGroupId[group.id] ?? 0,
  })),
];
