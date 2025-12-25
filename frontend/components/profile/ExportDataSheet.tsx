import { View, Text, Pressable, Alert } from 'react-native';
import { forwardRef, useCallback, useState } from 'react';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { FileJson, FileSpreadsheet, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { contactService } from '@/services/contact.service';
import { useGroupsStore } from '@/stores/groups-store';
import { ContactWithDetails, Group, FactType } from '@/types';
import { Colors } from '@/constants/theme';

type ExportFormat = 'json' | 'csv';

const FACT_TYPE_COLUMNS: FactType[] = [
  'work', 'company', 'education', 'location', 'origin',
  'partner', 'children', 'hobby', 'sport', 'language',
  'pet', 'birthday', 'how_met', 'where_met', 'contact'
];

const escapeCSV = (value: string | undefined): string => {
  if (!value) return '';
  const stringValue = String(value);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const convertToCSV = (contacts: ContactWithDetails[], groups: Group[]): string => {
  const baseHeaders = ['firstName', 'lastName', 'nickname', 'lastContactAt', 'createdAt'];
  const factHeaders = FACT_TYPE_COLUMNS;
  const otherHeaders = ['hotTopics', 'memories', 'notes'];
  const allHeaders = [...baseHeaders, ...factHeaders, ...otherHeaders];

  const rows = contacts.map((contact) => {
    const baseValues = [
      escapeCSV(contact.firstName),
      escapeCSV(contact.lastName),
      escapeCSV(contact.nickname),
      escapeCSV(contact.lastContactAt),
      escapeCSV(contact.createdAt),
    ];

    const factValues = factHeaders.map((factType) => {
      const factsOfType = contact.facts.filter((fact) => fact.factType === factType);
      if (factsOfType.length === 0) return '';
      return escapeCSV(factsOfType.map((fact) => fact.factValue).join('; '));
    });

    const hotTopicsValue = escapeCSV(
      contact.hotTopics.map((ht) => ht.title).join('; ')
    );
    const memoriesValue = escapeCSV(
      contact.memories.map((m) => m.description).join('; ')
    );
    const notesValue = escapeCSV(
      contact.notes.map((n) => n.title || n.summary || '').filter(Boolean).join('; ')
    );

    return [...baseValues, ...factValues, hotTopicsValue, memoriesValue, notesValue].join(',');
  });

  return [allHeaders.join(','), ...rows].join('\n');
};

export const ExportDataSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();
  const groups = useGroupsStore((state) => state.groups);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [isExporting, setIsExporting] = useState(false);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const fetchAllContactsWithDetails = async (): Promise<ContactWithDetails[]> => {
    const basicContacts = await contactService.getAll();
    const detailedContacts = await Promise.all(
      basicContacts.map((contact) => contactService.getById(contact.id))
    );
    return detailedContacts.filter((c): c is ContactWithDetails => c !== null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const contacts = await fetchAllContactsWithDetails();
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
      backgroundStyle={{ backgroundColor: Colors.surface }}
      handleIndicatorStyle={{ backgroundColor: Colors.border }}
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
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              backgroundColor: selectedFormat === 'json' ? Colors.primaryLight : Colors.background,
              borderWidth: selectedFormat === 'json' ? 1 : 0,
              borderColor: Colors.primary,
            }}
            onPress={() => setSelectedFormat('json')}
          >
            <View style={{ width: 40, height: 40, backgroundColor: Colors.primaryLight, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <FileJson size={20} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-medium">JSON</Text>
              <Text className="text-textSecondary text-xs">{t('profile.export.jsonDescription')}</Text>
            </View>
            {selectedFormat === 'json' && <Check size={20} color={Colors.primary} />}
          </Pressable>

          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderRadius: 12,
              backgroundColor: selectedFormat === 'csv' ? Colors.primaryLight : Colors.background,
              borderWidth: selectedFormat === 'csv' ? 1 : 0,
              borderColor: Colors.primary,
            }}
            onPress={() => setSelectedFormat('csv')}
          >
            <View style={{ width: 40, height: 40, backgroundColor: Colors.primaryLight, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <FileSpreadsheet size={20} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary font-medium">CSV</Text>
              <Text className="text-textSecondary text-xs">{t('profile.export.csvDescription')}</Text>
            </View>
            {selectedFormat === 'csv' && <Check size={20} color={Colors.primary} />}
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
