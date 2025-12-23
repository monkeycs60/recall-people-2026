import { create } from 'zustand';
import { Group } from '@/types';
import { groupService } from '@/services/group.service';

type GroupsState = {
  groups: Group[];
  isLoading: boolean;
  selectedGroupId: string | null;
};

type GroupsActions = {
  loadGroups: () => Promise<void>;
  setSelectedGroup: (groupId: string | null) => void;
  createGroup: (name: string) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
};

export const useGroupsStore = create<GroupsState & GroupsActions>((set, get) => ({
  groups: [],
  isLoading: false,
  selectedGroupId: null,

  loadGroups: async () => {
    set({ isLoading: true });
    const groups = await groupService.getAll();
    set({ groups, isLoading: false });
  },

  setSelectedGroup: (groupId) => {
    set({ selectedGroupId: groupId });
  },

  createGroup: async (name) => {
    const group = await groupService.create(name);
    await get().loadGroups();
    return group;
  },

  deleteGroup: async (id) => {
    await groupService.delete(id);
    const { selectedGroupId } = get();
    if (selectedGroupId === id) {
      set({ selectedGroupId: null });
    }
    await get().loadGroups();
  },
}));
