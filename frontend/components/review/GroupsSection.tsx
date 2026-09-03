import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, X, Search, Check, Hash } from 'lucide-react-native';
import { Group } from '@/types';
import { Colors, BorderRadius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SelectedGroup = {
  name: string;
  isNew: boolean;
  existingId?: string;
};

type GroupsSectionProps = {
  state: {
    selectedGroups: SelectedGroup[];
    allGroups: Group[];
  };
  handlers: {
    onToggleGroup: (group: SelectedGroup) => void;
    onAddNewGroup: (name: string) => void;
  };
};

export function GroupsSection({ state, handlers }: GroupsSectionProps) {
  const { t } = useTranslation();
  const { selectedGroups, allGroups } = state;
  const { onToggleGroup, onAddNewGroup } = handlers;
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const openModal = () => {
    setSearchText('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setSearchText('');
    setModalVisible(false);
  };

  const availableGroupsForModal = allGroups.filter(
    (group) =>
      !selectedGroups.some(
        (selectedGroup) =>
          selectedGroup.existingId === group.id ||
          selectedGroup.name.toLowerCase() === group.name.toLowerCase()
      )
  );

  const filteredAvailableGroups = searchText.trim()
    ? availableGroupsForModal.filter((group) =>
        group.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : availableGroupsForModal;

  const canCreateNew =
    searchText.trim().length > 0 &&
    !allGroups.some(
      (group) => group.name.toLowerCase() === searchText.trim().toLowerCase()
    ) &&
    !selectedGroups.some(
      (group) => group.name.toLowerCase() === searchText.trim().toLowerCase()
    );

  const handleSelectExistingGroup = (group: Group) => {
    onAddNewGroup(group.name);
    setSearchText('');
  };

  const handleCreateNewGroup = () => {
    if (!searchText.trim()) return;
    onAddNewGroup(searchText.trim());
    setSearchText('');
  };

  const handleRemoveGroup = (group: SelectedGroup) => {
    onToggleGroup(group);
  };

  return (
    <View>
      {selectedGroups.length > 0 && (
        <View style={styles.chipsRow}>
          {selectedGroups.map((group) => (
            <Pressable
              key={group.name}
              style={styles.groupChip}
              onPress={() => handleRemoveGroup(group)}
            >
              <Text style={styles.groupChipText}>{group.name}</Text>
              {group.isNew && (
                <Text style={styles.groupChipNew}>{t('review.new')}</Text>
              )}
              <X size={14} color={Colors.primary} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.addGroupButton} onPress={openModal}>
        <Plus size={18} color={Colors.primary} />
        <Text style={styles.addGroupText}>{t('review.addGroup')}</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
            <View style={styles.modalHandleBar} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{t('review.groupsModalTitle')}</Text>
              <Pressable style={styles.modalDoneButton} onPress={closeModal}>
                <Text style={styles.modalDoneText}>{t('review.groupsModalDone')}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputRow}>
              <Search size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t('review.searchGroups')}
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (canCreateNew) {
                    handleCreateNewGroup();
                  }
                }}
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')} hitSlop={8}>
                  <X size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={[styles.modalScrollContent, { paddingBottom: insets.bottom + 20 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {selectedGroups.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {t('review.selectedGroups')}
                </Text>
                <View style={styles.modalChipsRow}>
                  {selectedGroups.map((group) => (
                    <Pressable
                      key={group.name}
                      style={styles.selectedGroupChip}
                      onPress={() => handleRemoveGroup(group)}
                    >
                      <Check size={14} color={Colors.primary} />
                      <Text style={styles.selectedGroupChipText}>
                        {group.name}
                      </Text>
                      {group.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>
                            {t('review.new')}
                          </Text>
                        </View>
                      )}
                      <X size={14} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {canCreateNew && (
              <Pressable
                style={styles.createNewGroupRow}
                onPress={handleCreateNewGroup}
              >
                <View style={styles.createNewGroupIcon}>
                  <Plus size={18} color={Colors.textInverse} />
                </View>
                <Text style={styles.createNewGroupText}>
                  {t('review.createGroup', { name: searchText.trim() })}
                </Text>
              </Pressable>
            )}

            {filteredAvailableGroups.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  {t('review.availableGroups')}
                </Text>
                <View style={styles.availableGroupsList}>
                  {filteredAvailableGroups.map((group) => (
                    <Pressable
                      key={group.id}
                      style={styles.availableGroupRow}
                      onPress={() => handleSelectExistingGroup(group)}
                    >
                      <Hash size={16} color={Colors.textMuted} />
                      <Text style={styles.availableGroupText}>
                        {group.name}
                      </Text>
                      <Plus size={18} color={Colors.primary} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {filteredAvailableGroups.length === 0 &&
              !canCreateNew &&
              searchText.trim().length > 0 && (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    {t('review.noGroupsFound')}
                  </Text>
                </View>
              )}

            {allGroups.length === 0 && !searchText.trim() && (
              <View style={styles.emptyStateContainer}>
                <Hash size={32} color={Colors.textMuted} />
                <Text style={styles.emptyStateTitle}>
                  {t('review.noGroupsYet')}
                </Text>
                <Text style={styles.emptyStateText}>
                  {t('review.typeToCreateGroup')}
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    gap: 6,
  },
  groupChipText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  groupChipNew: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 8,
  },
  addGroupText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  modalHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.hairline,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalDoneButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  modalDoneText: {
    color: Colors.textInverse,
    fontWeight: '600',
    fontSize: 15,
  },

  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },

  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedGroupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: 6,
  },
  selectedGroupChipText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  newBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  newBadgeText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  createNewGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  createNewGroupIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createNewGroupText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 15,
    flex: 1,
  },

  availableGroupsList: {
    gap: 4,
  },
  availableGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    gap: 12,
  },
  availableGroupText: {
    color: Colors.textPrimary,
    fontSize: 15,
    flex: 1,
  },

  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
