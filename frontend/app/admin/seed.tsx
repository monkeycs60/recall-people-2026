import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ChevronLeft, Users, Sparkles, Trash2, Check, AlertCircle } from 'lucide-react-native';
import { importService, ImportResult } from '@/services/import.service';
import { useContactsStore } from '@/stores/contacts-store';
import { Colors } from '@/constants/theme';

export default function SeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadContacts = useContactsStore((state) => state.loadContacts);

  const [count, setCount] = useState('5');
  const [locale, setLocale] = useState<'fr' | 'en'>('fr');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [clearLoading, setClearLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const importResult = await importService.generateAndImport(
        parseInt(count) || 5,
        locale
      );
      setResult(importResult);
      await loadContacts();
    } catch (error) {
      setResult({
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      await importService.clearAllData();
      await loadContacts();
      setResult({
        success: true,
        importedCount: 0,
        errors: [],
      });
    } catch (error) {
      setResult({
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Failed to clear data'],
      });
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seed Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Generate Random Contacts</Text>
          </View>

          <Text style={styles.label}>Number of contacts</Text>
          <TextInput
            style={styles.input}
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Language</Text>
          <View style={styles.localeRow}>
            <TouchableOpacity
              style={[styles.localeButton, locale === 'fr' && styles.localeButtonActive]}
              onPress={() => setLocale('fr')}
            >
              <Text style={[styles.localeText, locale === 'fr' && styles.localeTextActive]}>
                Francais
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.localeButton, locale === 'en' && styles.localeButtonActive]}
              onPress={() => setLocale('en')}
            >
              <Text style={[styles.localeText, locale === 'en' && styles.localeTextActive]}>
                English
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.surface} />
            ) : (
              <>
                <Users size={20} color={Colors.surface} />
                <Text style={styles.generateButtonText}>Generate & Import</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trash2 size={20} color={Colors.error} />
            <Text style={[styles.sectionTitle, { color: Colors.error }]}>Danger Zone</Text>
          </View>

          <Text style={styles.dangerText}>
            This will permanently delete all contacts, notes, facts, memories, and hot topics.
          </Text>

          <TouchableOpacity
            style={[styles.clearButton, clearLoading && styles.buttonDisabled]}
            onPress={handleClearAll}
            disabled={clearLoading}
          >
            {clearLoading ? (
              <ActivityIndicator size="small" color={Colors.surface} />
            ) : (
              <>
                <Trash2 size={20} color={Colors.surface} />
                <Text style={styles.clearButtonText}>Clear All Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[styles.resultSection, result.success ? styles.successBg : styles.errorBg]}>
            <View style={styles.resultHeader}>
              {result.success ? (
                <Check size={24} color={Colors.success} />
              ) : (
                <AlertCircle size={24} color={Colors.error} />
              )}
              <Text style={[styles.resultTitle, result.success ? styles.successText : styles.errorText]}>
                {result.success ? 'Success!' : 'Error'}
              </Text>
            </View>

            {result.importedCount > 0 && (
              <Text style={styles.resultText}>
                Imported {result.importedCount} contact{result.importedCount > 1 ? 's' : ''}
              </Text>
            )}

            {result.errors.length > 0 && (
              <View style={styles.errorList}>
                {result.errors.map((error, index) => (
                  <Text key={index} style={styles.errorItem}>
                    {error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>API Endpoints</Text>
          <Text style={styles.infoCode}>POST /api/seed</Text>
          <Text style={styles.infoDesc}>Send custom contacts to validate and get IDs</Text>
          <Text style={styles.infoCode}>POST /api/seed/generate</Text>
          <Text style={styles.infoDesc}>Generate random contacts with realistic data</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  localeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  localeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  localeButtonActive: {
    backgroundColor: Colors.primary,
  },
  localeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  localeTextActive: {
    color: Colors.surface,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    padding: 16,
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  resultSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  successBg: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  errorBg: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: Colors.success,
  },
  errorText: {
    color: Colors.error,
  },
  resultText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  errorList: {
    marginTop: 8,
  },
  errorItem: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 4,
  },
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  infoCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.primary,
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
});
