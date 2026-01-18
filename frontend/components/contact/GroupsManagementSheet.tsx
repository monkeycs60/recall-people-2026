import { View, Text, Pressable, Modal, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Pencil, Trash2, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  visible: boolean;
  onClose: () => void;
  contactId: string;
  contactFirstName: string;
};

export function GroupsManagementSheet({
  visible,
  onClose,
  contactId,
  contactFirstName,
}: GroupsManagementSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  const handleRemoveFromContact = async (groupId: string) => {
    const newGroupIds = contactGroupIds.filter((id) => id !== groupId);
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
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.sheetContainer, { paddingBottom: insets.bottom + 16 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <View style={styles.handle} />
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('contact.groupsSheet.title')}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : null}

            {!isLoading && contactGroups.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('contact.groupsSheet.currentGroups', { firstName: contactFirstName })}
                </Text>
                <View style={styles.chipsContainer}>
                  {contactGroups.map((group) => (
                    <Pressable
                      key={group.id}
                      style={styles.chip}
                      onPress={() => handleRemoveFromContact(group.id)}
                    >
                      <Text style={styles.chipText}>{group.name}</Text>
                      <X size={14} color={Colors.primary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {!isLoading && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('contact.groupsSheet.allGroups')}
              </Text>

              {allGroups.length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('contact.groupsSheet.noGroups')}
                </Text>
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
                            <Pressable
                              style={styles.editActionButton}
                              onPress={handleCancelEditGroup}
                            >
                              <X size={20} color={Colors.textSecondary} />
                            </Pressable>
                            <Pressable
                              style={styles.editActionButton}
                              onPress={handleSaveEditGroup}
                            >
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
                          <View
                            style={[
                              styles.checkbox,
                              isInContact && styles.checkboxChecked,
                            ]}
                          >
                            {isInContact && (
                              <Check size={14} color={Colors.textInverse} />
                            )}
                          </View>
                          <Text style={styles.groupName}>{group.name}</Text>
                        </Pressable>

                        <View style={styles.groupActions}>
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => handleStartEditGroup(group)}
                          >
                            <Pencil size={18} color={Colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => handleDeleteGroup(group)}
                          >
                            <Trash2 size={18} color={Colors.error} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            )}

            {!isLoading && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('contact.groupsSheet.createNew')}
              </Text>
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
                  style={[
                    styles.createButton,
                    !newGroupName.trim() && styles.createButtonDisabled,
                  ]}
                  onPress={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                >
                  <Plus size={20} color={Colors.textInverse} />
                </Pressable>
              </View>
            </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 400,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  groupsList: {
    gap: 8,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  groupRowEditing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  groupCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
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
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  groupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    padding: 4,
  },
  createRow: {
    flexDirection: 'row',
    gap: 12,
  },
  createInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.textMuted,
  },
});
