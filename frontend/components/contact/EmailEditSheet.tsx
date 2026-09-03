import { Text, StyleSheet } from 'react-native';
import { forwardRef, useState } from 'react';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Mail } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EditSheetShell, sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors, Fonts } from '@/constants/theme';

type EmailEditSheetProps = {
  initialValue?: string;
  onSave: (value: string | null) => void;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailEditSheet = forwardRef<BottomSheetModal, EmailEditSheetProps>(
  ({ initialValue, onSave }, ref) => {
    const { t } = useTranslation();
    const [value, setValue] = useState(initialValue ?? '');

    const trimmed = value.trim();
    const isInvalid = trimmed.length > 0 && !EMAIL_REGEX.test(trimmed);

    return (
      <EditSheetShell
        ref={ref}
        title={t('contact.emailModal.title')}
        icon={<Mail size={18} color={Colors.primary} strokeWidth={2.3} />}
        config={{
          readValue: initialValue ?? null,
          canSave: !isInvalid,
          onStart: () => setValue(initialValue ?? ''),
          onSave: () => onSave(trimmed || null),
          onDelete: initialValue ? () => onSave(null) : undefined,
        }}
      >
        <BottomSheetTextInput
          style={sheetInputStyles.input}
          value={value}
          onChangeText={setValue}
          placeholder={t('contact.emailModal.placeholder')}
          placeholderTextColor={Colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {isInvalid && <Text style={styles.errorText}>{t('contact.emailModal.invalidFormat')}</Text>}
      </EditSheetShell>
    );
  }
);

EmailEditSheet.displayName = 'EmailEditSheet';

const styles = StyleSheet.create({
  errorText: {
    fontFamily: Fonts.sans.medium,
    color: Colors.error,
    fontSize: 13,
    marginTop: 8,
  },
});
