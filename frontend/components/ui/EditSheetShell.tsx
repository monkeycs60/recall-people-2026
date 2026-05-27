import { View, Text, Pressable, StyleSheet } from 'react-native';
import { forwardRef, useCallback, useMemo, useState, type ReactNode } from 'react';
import { BottomSheetModal, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Edit3, Plus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';

type FieldEditConfig = {
  snapPoint: string;
  editSnapPoint?: string;
  readValue: string | null;
  readContent?: ReactNode;
  canSave: boolean;
  onStart: () => void;
  onSave: () => void;
  onDelete?: () => void;
};

type EditSheetShellProps = {
  title: string;
  icon: ReactNode;
  config: FieldEditConfig;
  children: ReactNode;
};

export const EditSheetShell = forwardRef<BottomSheetModal, EditSheetShellProps>(
  ({ title, icon, config, children }, ref) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);

    const snapPoints = useMemo(
      () => (config.editSnapPoint ? [config.snapPoint, config.editSnapPoint] : [config.snapPoint]),
      [config.snapPoint, config.editSnapPoint]
    );

    const snapTo = (index: number) => {
      if (config.editSnapPoint && ref && 'current' in ref && ref.current) {
        ref.current.snapToIndex(index);
      }
    };

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const dismiss = () => {
      if (ref && 'current' in ref && ref.current) {
        ref.current.dismiss();
      }
    };

    const handleEditStart = () => {
      config.onStart();
      setIsEditing(true);
      snapTo(1);
    };

    const handleCancel = () => {
      setIsEditing(false);
      snapTo(0);
    };

    const handleSave = () => {
      if (!config.canSave) return;
      config.onSave();
      dismiss();
    };

    const handleDelete = () => {
      config.onDelete?.();
      dismiss();
    };

    const hasValue = Boolean(config.readValue && config.readValue.trim().length > 0);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => setIsEditing(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>{icon}</View>
            <Text style={styles.title}>{title}</Text>
          </View>

          {isEditing ? (
            children
          ) : (
            hasValue &&
            (config.readContent ?? <Text style={styles.readValue}>{config.readValue}</Text>)
          )}

          {isEditing ? (
            <View style={styles.footer}>
              {config.onDelete && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  accessibilityLabel={t('common.delete')}
                >
                  <Trash2 size={20} color={Colors.error} />
                </Pressable>
              )}
              <View style={styles.spacer} />
              <Pressable style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.saveButton, !config.canSave && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!config.canSave}
              >
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.editButton} onPress={handleEditStart}>
              {hasValue ? (
                <Edit3 size={16} color={Colors.textInverse} strokeWidth={2.4} />
              ) : (
                <Plus size={18} color={Colors.textInverse} strokeWidth={2.4} />
              )}
              <Text style={styles.editButtonText}>
                {hasValue ? t('common.edit') : t('common.add')}
              </Text>
            </Pressable>
          )}
        </View>
      </BottomSheetModal>
    );
  }
);

EditSheetShell.displayName = 'EditSheetShell';

export const sheetInputStyles = StyleSheet.create({
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 108,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
});

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
  },
  handle: {
    backgroundColor: Colors.hairline,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  readValue: {
    fontFamily: Fonts.sans.medium,
    fontSize: 17,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  editButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.textInverse,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  deleteButton: {
    padding: 10,
  },
  spacer: {
    flex: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.hairline,
  },
  cancelButtonText: {
    fontFamily: Fonts.sans.bold,
    color: Colors.primary,
    fontSize: 15,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: Fonts.sans.bold,
    color: Colors.textInverse,
    fontSize: 15,
  },
});
