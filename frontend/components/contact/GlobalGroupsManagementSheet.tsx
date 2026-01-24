import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { forwardRef, useCallback, useState } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Plus, X, Check, Users } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import {
  useCreateGroup,
  useDeleteGroup,
  useUpdateGroup,
  useGroupsQuery,
} from '@/hooks/useGroupsQuery';
import { Group } from '@/types';

export const GlobalGroupsManagementSheet = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const { t } = useTranslation();
    const { groups: allGroups, refetch: refetchGroups } = useGroupsQuery();
    const createGroupMutation = useCreateGroup();
    const deleteGroupMutation = useDeleteGroup();
    const updateGroupMutation = useUpdateGroup();

    const [newGroupName, setNewGroupName] = useState('');
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editingGroupName, setEditingGroupName] = useState('');

    const handleCreateGroup = async () => {
      const trimmedName = newGroupName.trim();
      if (!trimmedName) return;

      const existingGroup = allGroups.find(
        (group) => group.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (existingGroup) {
        Alert.alert(
          t('contact.groupsSheet.groupExists'),
          t('contact.groupsSheet.groupExistsMessage', { name: existingGroup.name })
        );
        return;
      }

      try {
        await createGroupMutation.mutateAsync(trimmedName);
        setNewGroupName('');
        await refetchGroups();
      } catch (error) {
        console.error('Error creating group:', error);
        Alert.alert(t('common.error'), String(error));
      }
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
      await refetchGroups();
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
              await refetchGroups();
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
        snapPoints={['60%']}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.surface }}
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('contact.groupsSheet.manageGroupsTitle')}</Text>
        </View>

        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.createSection}>
            <View style={styles.createRow}>
              <BottomSheetTextInput
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('contact.groupsSheet.allGroupsTitle')}
            </Text>

            {allGroups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>{t('contact.groupsSheet.noGroupsYet')}</Text>
                <Text style={styles.emptySubtext}>{t('contact.groupsSheet.createFirstGroup')}</Text>
              </View>
            ) : (
              <View style={styles.groupsList}>
                {allGroups.map((group) => {
                  const isEditing = editingGroupId === group.id;

                  if (isEditing) {
                    return (
                      <View key={group.id} style={styles.groupRowEditing}>
                        <BottomSheetTextInput
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
                      <Text style={styles.groupName}>{group.name}</Text>
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
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

GlobalGroupsManagementSheet.displayName = 'GlobalGroupsManagementSheet';

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
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    marginTop: 8,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 13,
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
    paddingVertical: 12,
    paddingLeft: 14,
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
