import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react-native';
import { Group } from '@/types';
import { Colors, BorderRadius } from '@/constants/theme';

type SelectedGroup = {
  name: string;
  isNew: boolean;
  existingId?: string;
};

type GroupsSectionState = {
  selectedGroups: SelectedGroup[];
  isAddingGroup: boolean;
  newGroupSearch: string;
  filteredGroupsForSearch: Group[];
  allGroups: Group[];
};

type GroupsSectionHandlers = {
  onToggleGroup: (group: SelectedGroup) => void;
  onAddNewGroup: (name: string) => void;
  onSetIsAddingGroup: (value: boolean) => void;
  onSetNewGroupSearch: (value: string) => void;
};

type GroupsSectionProps = {
  state: GroupsSectionState;
  handlers: GroupsSectionHandlers;
};

export function GroupsSection({ state, handlers }: GroupsSectionProps) {
  const { t } = useTranslation();
  const { selectedGroups, isAddingGroup, newGroupSearch, filteredGroupsForSearch, allGroups } = state;
  const { onToggleGroup, onAddNewGroup, onSetIsAddingGroup, onSetNewGroupSearch } = handlers;

  return (
    <View>
      <View style={styles.chipsRow}>
        {selectedGroups.map((group) => (
          <Pressable key={group.name} style={styles.groupChip} onPress={() => onToggleGroup(group)}>
            <Text style={styles.groupChipText}>{group.name}</Text>
            {group.isNew && <Text style={styles.groupChipNew}>{t('review.new')}</Text>}
            <X size={14} color={Colors.primary} />
          </Pressable>
        ))}
      </View>

      {isAddingGroup ? (
        <View style={styles.card}>
          <TextInput
            style={styles.textInput}
            value={newGroupSearch}
            onChangeText={onSetNewGroupSearch}
            placeholder={t('review.groupNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />

          {filteredGroupsForSearch.length > 0 && (
            <View style={styles.searchResults}>
              {filteredGroupsForSearch.map((group) => (
                <Pressable
                  key={group.id}
                  style={styles.searchResultItem}
                  onPress={() => onAddNewGroup(group.name)}
                >
                  <Text style={styles.searchResultText}>{group.name}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {newGroupSearch.trim() &&
            !filteredGroupsForSearch.some(
              (group) => group.name.toLowerCase() === newGroupSearch.toLowerCase()
            ) &&
            !allGroups.some(
              (group) => group.name.toLowerCase() === newGroupSearch.toLowerCase()
            ) && (
              <Pressable style={styles.createGroupButton} onPress={() => onAddNewGroup(newGroupSearch)}>
                <Text style={styles.createGroupText}>
                  {t('review.createGroup', { name: newGroupSearch.trim() })}
                </Text>
              </Pressable>
            )}

          <Pressable
            style={styles.cancelButton}
            onPress={() => {
              onSetIsAddingGroup(false);
              onSetNewGroupSearch('');
            }}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.addGroupButton} onPress={() => onSetIsAddingGroup(true)}>
          <Plus size={18} color={Colors.primary} />
          <Text style={styles.addGroupText}>{t('review.addGroup')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  groupChipText: {
    color: Colors.textPrimary,
    marginRight: 4,
    fontWeight: '600',
  },
  groupChipNew: {
    color: Colors.primary,
    fontSize: 12,
    marginRight: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: Colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },
  searchResults: {
    marginBottom: 8,
  },
  searchResultItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    marginBottom: 4,
  },
  searchResultText: {
    color: Colors.textPrimary,
  },
  createGroupButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    marginBottom: 8,
  },
  createGroupText: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addGroupText: {
    color: Colors.primary,
    marginLeft: 8,
  },
});
