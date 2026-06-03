import { View, Text, Pressable, StyleSheet } from 'react-native';
import { forwardRef, useCallback, useMemo } from 'react';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  ArrowDownAZ,
  Bell,
  CalendarClock,
  Cake,
  Check,
  Clock3,
  ListFilter,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import type { ContactSortMode } from '@/utils/contactSort';

type ContactSortSheetProps = {
  selectedMode: ContactSortMode;
  isSaving?: boolean;
  onSelectMode: (mode: ContactSortMode) => void;
};

type SortOption = {
  mode: ContactSortMode;
  titleKey: string;
  subtitleKey: string;
  Icon: typeof CalendarClock;
};

const sortOptions: SortOption[] = [
  {
    mode: 'next-deadline',
    titleKey: 'contacts.sort.options.nextDeadline.title',
    subtitleKey: 'contacts.sort.options.nextDeadline.subtitle',
    Icon: CalendarClock,
  },
  {
    mode: 'upcoming-birthday',
    titleKey: 'contacts.sort.options.upcomingBirthday.title',
    subtitleKey: 'contacts.sort.options.upcomingBirthday.subtitle',
    Icon: Cake,
  },
  {
    mode: 'overdue',
    titleKey: 'contacts.sort.options.overdue.title',
    subtitleKey: 'contacts.sort.options.overdue.subtitle',
    Icon: Bell,
  },
  {
    mode: 'recent-contact',
    titleKey: 'contacts.sort.options.recentContact.title',
    subtitleKey: 'contacts.sort.options.recentContact.subtitle',
    Icon: Clock3,
  },
  {
    mode: 'alphabetical',
    titleKey: 'contacts.sort.options.alphabetical.title',
    subtitleKey: 'contacts.sort.options.alphabetical.subtitle',
    Icon: ArrowDownAZ,
  },
];

export function getContactSortLabelKey(mode: ContactSortMode): string {
  return sortOptions.find((option) => option.mode === mode)?.titleKey ?? 'contacts.sort.options.recentContact.title';
}

export const ContactSortSheet = forwardRef<BottomSheetModal, ContactSortSheetProps>(
  ({ selectedMode, isSaving = false, onSelectMode }, ref) => {
    const { t } = useTranslation();
    const snapPoints = useMemo(() => ['56%'], []);

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

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <ListFilter size={18} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={styles.title}>{t('contacts.sort.title')}</Text>
            </View>
            <Pressable style={styles.doneButton} onPress={dismiss}>
              <Text style={styles.doneButtonText}>{t('contacts.sort.done')}</Text>
            </Pressable>
          </View>

          <View style={styles.optionList}>
            {sortOptions.map(({ mode, titleKey, subtitleKey, Icon }) => {
              const isSelected = selectedMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => onSelectMode(mode)}
                  disabled={isSaving && isSelected}
                >
                  <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                    <Icon
                      size={18}
                      color={isSelected ? Colors.textInverse : Colors.textSecondary}
                      strokeWidth={2.4}
                    />
                  </View>
                  <View style={styles.optionTextColumn}>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                      {t(titleKey)}
                    </Text>
                    <Text style={[styles.optionSubtitle, isSelected && styles.optionSubtitleSelected]}>
                      {t(subtitleKey)}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Check size={20} color={Colors.textInverse} strokeWidth={2.8} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheetModal>
    );
  }
);

ContactSortSheet.displayName = 'ContactSortSheet';

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
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 18,
    letterSpacing: 0,
    color: Colors.textPrimary,
  },
  doneButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  doneButtonText: {
    fontFamily: Fonts.sans.bold,
    fontSize: 13,
    color: Colors.primary,
  },
  optionList: {
    gap: 8,
  },
  optionRow: {
    minHeight: 68,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
  },
  optionRowSelected: {
    backgroundColor: Colors.primary,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  optionIconSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  optionTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionTitleSelected: {
    color: Colors.textInverse,
  },
  optionSubtitle: {
    marginTop: 2,
    fontFamily: Fonts.sans.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  optionSubtitleSelected: {
    color: 'rgba(255,255,255,0.72)',
  },
});
