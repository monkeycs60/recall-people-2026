import { View, Text, StyleSheet } from 'react-native';
import { forwardRef, useState } from 'react';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EditSheetShell, sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors, Fonts } from '@/constants/theme';

type NameEditSheetProps = {
  initialFirstName: string;
  initialLastName?: string;
  onSave: (firstName: string, lastName: string | null) => void;
};

export const NameEditSheet = forwardRef<BottomSheetModal, NameEditSheetProps>(
  ({ initialFirstName, initialLastName, onSave }, ref) => {
    const { t } = useTranslation();
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName ?? '');

    const fullName = `${initialFirstName} ${initialLastName ?? ''}`.trim();

    return (
      <EditSheetShell
        ref={ref}
        title={t('contact.nameModal.title')}
        icon={<User size={18} color={Colors.primary} strokeWidth={2.3} />}
        config={{
          readValue: fullName || null,
          canSave: firstName.trim().length > 0,
          onStart: () => {
            setFirstName(initialFirstName);
            setLastName(initialLastName ?? '');
          },
          onSave: () => onSave(firstName.trim(), lastName.trim() || null),
        }}
      >
        <View style={styles.field}>
          <Text style={styles.label}>{t('contact.nameModal.firstName')}</Text>
          <BottomSheetTextInput
            style={sheetInputStyles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('contact.nameModal.firstNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            autoFocus
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('contact.nameModal.lastName')}</Text>
          <BottomSheetTextInput
            style={sheetInputStyles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('contact.nameModal.lastNamePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
          />
        </View>
      </EditSheetShell>
    );
  }
);

NameEditSheet.displayName = 'NameEditSheet';

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
});
