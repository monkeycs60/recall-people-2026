import { View, Text, StyleSheet } from 'react-native';
import { forwardRef, useState } from 'react';
import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { EditSheetShell } from '@/components/ui/EditSheetShell';
import { LovesEditor } from '@/components/contact/LovesEditor';
import { Colors, Fonts } from '@/constants/theme';

type LovesEditSheetProps = {
  initialLoves: string[];
  onSave: (loves: string[]) => void;
};

function ReadChips({ loves }: { loves: string[] }) {
  return (
    <View style={styles.readChips}>
      {loves.map((love) => (
        <View key={love} style={styles.readChip}>
          <Text style={styles.readChipText}>{love}</Text>
        </View>
      ))}
    </View>
  );
}

export const LovesEditSheet = forwardRef<BottomSheetModal, LovesEditSheetProps>(
  ({ initialLoves, onSave }, ref) => {
    const { t } = useTranslation();
    const [loves, setLoves] = useState(initialLoves);

    return (
      <EditSheetShell
        ref={ref}
        title={t('contactProfile.tileLoves')}
        icon={<Heart size={18} color={Colors.error} fill={Colors.error} strokeWidth={2.2} />}
        config={{
          readValue: initialLoves.length > 0 ? initialLoves.join(', ') : null,
          readContent: <ReadChips loves={initialLoves} />,
          canSave: true,
          onStart: () => setLoves(initialLoves),
          onSave: () => onSave(loves),
        }}
      >
        <LovesEditor loves={loves} onChange={setLoves} InputComponent={BottomSheetTextInput} />
      </EditSheetShell>
    );
  }
);

LovesEditSheet.displayName = 'LovesEditSheet';

const styles = StyleSheet.create({
  readChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  readChip: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  readChipText: {
    fontFamily: Fonts.sans.medium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
