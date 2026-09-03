import { forwardRef, useState } from 'react';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Phone } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EditSheetShell, sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors } from '@/constants/theme';

type PhoneEditSheetProps = {
  initialValue?: string;
  onSave: (value: string | null) => void;
};

export const PhoneEditSheet = forwardRef<BottomSheetModal, PhoneEditSheetProps>(
  ({ initialValue, onSave }, ref) => {
    const { t } = useTranslation();
    const [value, setValue] = useState(initialValue ?? '');

    return (
      <EditSheetShell
        ref={ref}
        title={t('contact.phoneModal.title')}
        icon={<Phone size={18} color={Colors.primary} strokeWidth={2.3} />}
        config={{
          readValue: initialValue ?? null,
          canSave: true,
          onStart: () => setValue(initialValue ?? ''),
          onSave: () => onSave(value.trim() || null),
          onDelete: initialValue ? () => onSave(null) : undefined,
        }}
      >
        <BottomSheetTextInput
          style={sheetInputStyles.input}
          value={value}
          onChangeText={setValue}
          placeholder={t('contact.phoneModal.placeholder')}
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          autoFocus
        />
      </EditSheetShell>
    );
  }
);

PhoneEditSheet.displayName = 'PhoneEditSheet';
