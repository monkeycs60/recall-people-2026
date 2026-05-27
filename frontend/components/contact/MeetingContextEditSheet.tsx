import { forwardRef, useState } from 'react';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { MapPin } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EditSheetShell, sheetInputStyles } from '@/components/ui/EditSheetShell';
import { Colors } from '@/constants/theme';

type MeetingContextEditSheetProps = {
  initialValue: string;
  onSave: (value: string) => void;
};

export const MeetingContextEditSheet = forwardRef<BottomSheetModal, MeetingContextEditSheetProps>(
  ({ initialValue, onSave }, ref) => {
    const { t } = useTranslation();
    const [value, setValue] = useState(initialValue);

    const trimmed = value.trim();

    return (
      <EditSheetShell
        ref={ref}
        title={t('contact.meetingContextModal.title')}
        icon={<MapPin size={18} color={Colors.primary} strokeWidth={2.3} />}
        config={{
          snapPoint: '36%',
          readValue: initialValue || null,
          canSave: trimmed.length > 0,
          onStart: () => setValue(initialValue),
          onSave: () => onSave(trimmed),
        }}
      >
        <BottomSheetTextInput
          style={[sheetInputStyles.input, sheetInputStyles.inputMultiline]}
          value={value}
          onChangeText={setValue}
          placeholder={t('contact.meetingContextModal.placeholder')}
          placeholderTextColor={Colors.textMuted}
          multiline
          autoFocus
        />
      </EditSheetShell>
    );
  }
);

MeetingContextEditSheet.displayName = 'MeetingContextEditSheet';
