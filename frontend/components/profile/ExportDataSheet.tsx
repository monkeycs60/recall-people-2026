import { View, Text, Pressable, Alert } from 'react-native';
import { forwardRef, useCallback, useState } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FileJson, FileSpreadsheet, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useContactsStore } from '@/stores/contacts-store';
import { useGroupsStore } from '@/stores/groups-store';
import { Contact, Group } from '@/types';

type ExportFormat = 'json' | 'csv';

const convertToCSV = (contacts: Contact[], groups: Group[]): string => {
  const headers = ['firstName', 'lastName', 'nickname', 'lastContactAt', 'createdAt'];
  const rows = contacts.map((contact) =>
    headers.map((header) => {
      const value = contact[header as keyof Contact];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

export const ExportDataSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();
  const contacts = useContactsStore((state) => state.contacts);
  const groups = useGroupsStore((state) => state.groups);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const timestamp = Date.now();
      let fileUri: string;
      let mimeType: string;

      if (selectedFormat === 'json') {
        const exportData = {
          exportedAt: new Date().toISOString(),
          contacts,
          groups,
        };
        const jsonString = JSON.stringify(exportData, null, 2);
        fileUri = `${FileSystem.cacheDirectory}recall-export-${timestamp}.json`;
        mimeType = 'application/json';
        await FileSystem.writeAsStringAsync(fileUri, jsonString);
      } else {
        const csvContent = convertToCSV(contacts, groups);
        fileUri = `${FileSystem.cacheDirectory}recall-contacts-${timestamp}.csv`;
        mimeType = 'text/csv';
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
      }

      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: t('profile.export.title'),
      });

      if (ref && 'current' in ref && ref.current) {
        ref.current.dismiss();
      }
    } catch {
      Alert.alert(t('common.error'), t('profile.export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#1a1a1a' }}
      handleIndicatorStyle={{ backgroundColor: '#525252' }}
    >
      <BottomSheetView style={{ paddingBottom: 32 }}>
        <View className="px-4 pb-4 border-b border-surfaceHover">
          <Text className="text-textPrimary text-lg font-semibold">
            {t('profile.export.title')}
          </Text>
          <Text className="text-textSecondary text-sm mt-1">
            {t('profile.export.selectFormat')}
          </Text>
        </View>

        <View className="p-4">
          <Pressable
            className={`flex-row items-center p-4 rounded-xl mb-3 ${
              selectedFormat === 'json' ? 'bg-violet-500/20 border border-violet-500' : 'bg-surface'
            }`}
            onPress={() => setSelectedFormat('json')}
          >
            <View className="w-10 h-10 bg-violet-500/20 rounded-full items-center justify-center mr-3">
              <FileJson size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-medium">JSON</Text>
              <Text className="text-textSecondary text-xs">{t('profile.export.jsonDescription')}</Text>
            </View>
            {selectedFormat === 'json' && <Check size={20} color="#8b5cf6" />}
          </Pressable>

          <Pressable
            className={`flex-row items-center p-4 rounded-xl ${
              selectedFormat === 'csv' ? 'bg-violet-500/20 border border-violet-500' : 'bg-surface'
            }`}
            onPress={() => setSelectedFormat('csv')}
          >
            <View className="w-10 h-10 bg-violet-500/20 rounded-full items-center justify-center mr-3">
              <FileSpreadsheet size={20} color="#8b5cf6" />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-medium">CSV</Text>
              <Text className="text-textSecondary text-xs">{t('profile.export.csvDescription')}</Text>
            </View>
            {selectedFormat === 'csv' && <Check size={20} color="#8b5cf6" />}
          </Pressable>
        </View>

        <View className="px-4">
          <Pressable
            className="bg-primary py-4 rounded-xl items-center"
            onPress={handleExport}
            disabled={isExporting}
          >
            <Text className="text-white font-semibold">
              {isExporting ? t('common.loading') : t('profile.export.exportButton')}
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

ExportDataSheet.displayName = 'ExportDataSheet';
