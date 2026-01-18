import { View, Text, Pressable, TextInput, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { forwardRef, useCallback, useState } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { Check, Pencil, Trash2, Plus, X } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import {
  useGroupsQuery,
  useGroupsForContact,
  useSetContactGroups,
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
} from '@/hooks/useGroupsQuery';
import { Group } from '@/types';

type GroupsManagementSheetProps = {
  contactId: string;
  contactFirstName: string;
};

export const GroupsManagementSheet = forwardRef<BottomSheetModal, GroupsManagementSheetProps>(
  ({ contactId, contactFirstName }, ref) => {
    const { t } = useTranslation();
    const { groups: allGroups, isLoading: isLoadingGroups } = useGroupsQuery();
    const { data: contactGroups = [], isLoading: isLoadingContactGroups } = useGroupsForContact(contactId);

    const isLoading = isLoadingGroups || isLoadingContactGroups;
    const setContactGroupsMutation = useSetContactGroups();
    const createGroupMutation = useCreateGroup();
    const deleteGroupMutation = useDeleteGroup();
    const updateGroupMutation = useUpdateGroup();

    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState('');

    const contactGroupIds = contactGroups.map((group) => group.id);

    const handleToggleGroup = async (groupId: string) => {
      const isInGroup = contactGroupIds.includes(groupId);
      const newGroupIds = isInGroup
        ? contactGroupIds.filter((id) => id !== groupId)
        : [...contactGroupIds, groupId];

      await setContactGroupsMutation.mutateAsync({
        contactId,
        groupIds: newGroupIds,
      });
    };

    const handleCreateGroup = async () => {
      if (!newGroupName.trim()) return;

      const existingGroup = allGroups.find(
        (group) => group.name.toLowerCase() === newGroupName.trim().toLowerCase()
      );

      if (existingGroup) {
        if (!contactGroupIds.includes(existingGroup.id)) {
          await setContactGroupsMutation.mutateAsync({
            contactId,
            groupIds: [...contactGroupIds, existingGroup.id],
          });
        }
      } else {
        const newGroup = await createGroupMutation.mutateAsync(newGroupName.trim());
        await setContactGroupsMutation.mutateAsync({
          contactId,
          groupIds: [...contactGroupIds, newGroup.id],
        });
      }

      setNewGroupName('');
    };

    const handleStartEditGroup = (group: Group) => {
      setEditingGroupId(group.id);
      setEditingGroupName(group.name);
    };

    const handleSaveEditGroup = async () => {
      if (!editingGroupId || !editingGroupName.trim()) return;

      await updateGroupMutation.mutateAsync({
        id: editingGroupId,
        name: editingGroupName.trim(),
      });

      setEditingGroupId(null);
      setEditingGroupName('');
    };

    const handleCancelEditGroup = () => {
      setEditingGroupId(null);
      setEditingGroupName('');
    };

    const handleDeleteGroup = (group: Group) => {
      Alert.alert(
        t('contact.groupsSheet.deleteGroupTitle'),
        t('contact.groupsSheet.deleteGroupMessage', { name: group.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await deleteGroupMutation.mutateAsync(group.id);
            },
          },
        ]
      );
    };

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['70%']}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.surface }}
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('contact.groupsSheet.title')}</Text>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Create new group - AT THE TOP */}
          <View style={styles.createSection}>
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder={t('contact.groupsSheet.newGroupPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                onSubmitEditing={handleCreateGroup}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.createButton, !newGroupName.trim() && styles.createButtonDisabled]}
                onPress={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                <Plus size={20} color={Colors.textInverse} />
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('contact.groupsSheet.selectGroups', { firstName: contactFirstName })}
              </Text>

              {allGroups.length === 0 ? (
                <Text style={styles.emptyText}>{t('contact.groupsSheet.noGroups')}</Text>
              ) : (
                <View style={styles.groupsList}>
                  {allGroups.map((group) => {
                    const isInContact = contactGroupIds.includes(group.id);
                    const isEditing = editingGroupId === group.id;

                    if (isEditing) {
                      return (
                        <View key={group.id} style={styles.groupRowEditing}>
                          <TextInput
                            style={styles.editInput}
                            value={editingGroupName}
                            onChangeText={setEditingGroupName}
                            autoFocus
                            selectTextOnFocus
                          />
                          <View style={styles.editActions}>
                            <Pressable style={styles.editActionButton} onPress={handleCancelEditGroup}>
                              <X size={20} color={Colors.textSecondary} />
                            </Pressable>
                            <Pressable style={styles.editActionButton} onPress={handleSaveEditGroup}>
                              <Check size={20} color={Colors.primary} />
                            </Pressable>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View key={group.id} style={styles.groupRow}>
                        <Pressable
                          style={styles.groupCheckRow}
                          onPress={() => handleToggleGroup(group.id)}
                        >
                          <View style={[styles.checkbox, isInContact && styles.checkboxChecked]}>
                            {isInContact && <Check size={14} color={Colors.textInverse} />}
                          </View>
                          <Text style={styles.groupName}>{group.name}</Text>
                        </Pressable>

                        <View style={styles.groupActions}>
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => handleStartEditGroup(group)}
                          >
                            <Pencil size={16} color={Colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => handleDeleteGroup(group)}
                          >
                            <Trash2 size={16} color={Colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

GroupsManagementSheet.displayName = 'GroupsManagementSheet';

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 60,
  },
  createSection: {
    marginBottom: 20,
  },
  createRow: {
    flexDirection: 'row',
    gap: 10,
  },
  createInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  groupsList: {
    gap: 6,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
  },
  groupRowEditing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  groupCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  groupName: {
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  editActions: {
    flexDirection: 'row',
    gap: 4,
  },
  editActionButton: {
    padding: 4,
  },
});
