import { View, Text, Pressable, StyleSheet } from 'react-native';
import { forwardRef, useCallback } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Colors, Spacing } from '@/constants/theme';

interface OptionPickerOption {
  label: string;
  value: number | null;
}

interface OptionPickerSheetProps {
  title: string;
  description?: string;
  options: OptionPickerOption[];
  selectedValue: number | null | undefined;
  onSelect: (value: number | null) => void;
}

export const OptionPickerSheet = forwardRef<BottomSheetModal, OptionPickerSheetProps>(
  ({ title, description, options, selectedValue, onSelect }, ref) => {
    const insets = useSafeAreaInsets();
    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const handleSelect = (value: number | null) => {
      onSelect(value);
      if (ref && 'current' in ref && ref.current) {
        ref.current.dismiss();
      }
    };

    const normalizedSelected = selectedValue === undefined ? null : selectedValue;

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors.surface }}
        handleIndicatorStyle={{ backgroundColor: Colors.hairline }}
      >
        <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {description && (
              <Text style={styles.description}>{description}</Text>
            )}
          </View>

          <View style={styles.optionsList}>
            {options.map((option) => (
              <Pressable
                key={String(option.value)}
                style={({ pressed }) => [
                  styles.optionRow,
                  pressed && styles.optionRowPressed,
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                {normalizedSelected === option.value && (
                  <Check size={20} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

OptionPickerSheet.displayName = 'OptionPickerSheet';

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  optionsList: {
    paddingTop: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  optionRowPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  optionLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
  },
});
