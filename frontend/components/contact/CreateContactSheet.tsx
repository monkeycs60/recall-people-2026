import { View, Text, Pressable, StyleSheet, Keyboard as RNKeyboard } from 'react-native';
import { forwardRef, useCallback, useState } from 'react';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { ArrowRight, Keyboard, Mic, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sheetKeyboardProps, useSheetMaxHeight } from '@/components/ui/sheetConfig';
import { Colors, Fonts } from '@/constants/theme';
import type { Contact } from '@/types';

type CreateContactSheetProps = {
  onCreate: (firstName: string, lastName: string) => Promise<Contact | null>;
  onRecordVoice: (contact: Contact) => void;
  onRecordType: (contact: Contact) => void;
  onSkip: (contact: Contact) => void;
};

export const CreateContactSheet = forwardRef<BottomSheetModal, CreateContactSheetProps>(
  ({ onCreate, onRecordVoice, onRecordType, onSkip }, ref) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const maxHeight = useSheetMaxHeight();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [createdContact, setCreatedContact] = useState<Contact | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const isValid = firstName.trim().length > 0 && !isCreating;

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const dismiss = () => {
      if (ref && typeof ref !== 'function') {
        ref.current?.dismiss();
      }
    };

    const reset = () => {
      setFirstName('');
      setLastName('');
      setCreatedContact(null);
      setIsCreating(false);
    };

    const handleCreate = async () => {
      if (!isValid) return;

      setIsCreating(true);
      try {
        const contact = await onCreate(firstName.trim(), lastName.trim());
        if (contact) {
          setCreatedContact(contact);
          RNKeyboard.dismiss();
        }
      } finally {
        setIsCreating(false);
      }
    };

    const handleRecordVoice = () => {
      if (!createdContact) return;
      dismiss();
      onRecordVoice(createdContact);
    };

    const handleRecordType = () => {
      if (!createdContact) return;
      dismiss();
      onRecordType(createdContact);
    };

    const handleSkip = () => {
      if (!createdContact) return;
      dismiss();
      onSkip(createdContact);
    };

    const createdName = createdContact
      ? `${createdContact.firstName} ${createdContact.lastName ?? ''}`.trim()
      : '';

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        maxDynamicContentSize={maxHeight}
        {...sheetKeyboardProps}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onDismiss={reset}
      >
        <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom + 28 }]}>
          {createdContact ? (
            <View style={styles.nextStepContent}>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <UserPlus size={18} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <View style={styles.headerTextColumn}>
                  <Text style={styles.title}>{t('contacts.createModal.addFirstNoteTitle')}</Text>
                  <Text style={styles.subtitle}>
                    {t('contacts.createModal.addFirstNoteDescription', { name: createdName })}
                  </Text>
                </View>
              </View>

              <View style={styles.actionList}>
                <Pressable style={styles.primaryAction} onPress={handleRecordVoice}>
                  <View style={styles.primaryActionIcon}>
                    <Mic size={20} color={Colors.textInverse} strokeWidth={2.6} />
                  </View>
                  <View style={styles.actionTextColumn}>
                    <Text style={styles.primaryActionTitle}>{t('contacts.createModal.recordVoice')}</Text>
                    <Text style={styles.primaryActionSubtitle}>{t('record.modeVoice')}</Text>
                  </View>
                  <ArrowRight size={18} color={Colors.textInverse} strokeWidth={2.5} />
                </Pressable>

                <Pressable style={styles.secondaryAction} onPress={handleRecordType}>
                  <View style={styles.secondaryActionIcon}>
                    <Keyboard size={19} color={Colors.primary} strokeWidth={2.5} />
                  </View>
                  <View style={styles.actionTextColumn}>
                    <Text style={styles.secondaryActionTitle}>{t('contacts.createModal.recordType')}</Text>
                    <Text style={styles.secondaryActionSubtitle}>{t('record.modeType')}</Text>
                  </View>
                  <ArrowRight size={18} color={Colors.textSecondary} strokeWidth={2.4} />
                </Pressable>
              </View>

              <Pressable style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>{t('contacts.createModal.skip')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <UserPlus size={18} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.title}>{t('contacts.createModal.title')}</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('contact.name.firstName')} *</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('contact.name.firstNamePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect
                  spellCheck
                  returnKeyType="next"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>{t('contact.name.lastName')}</Text>
                <BottomSheetTextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('contact.name.lastNamePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect
                  spellCheck
                  returnKeyType="done"
                  onSubmitEditing={handleCreate}
                />
              </View>

              <View style={styles.footer}>
                <Pressable style={styles.cancelButton} onPress={dismiss} disabled={isCreating}>
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.createButton, !isValid && styles.createButtonDisabled]}
                  onPress={handleCreate}
                  disabled={!isValid}
                >
                  <Text style={styles.createButtonText}>{t('contacts.createModal.create')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

CreateContactSheet.displayName = 'CreateContactSheet';

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
  headerTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    letterSpacing: 0,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.hairline,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: Fonts.sans.medium,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.hairline,
    backgroundColor: Colors.surface,
  },
  cancelButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.primary,
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  createButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  createButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.textInverse,
  },
  nextStepContent: {
    gap: 4,
  },
  actionList: {
    gap: 10,
  },
  primaryAction: {
    minHeight: 74,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
  },
  primaryActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    minHeight: 70,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  secondaryActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  primaryActionTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 16,
    color: Colors.textInverse,
  },
  primaryActionSubtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  secondaryActionTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  secondaryActionSubtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  skipButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
