import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsStore } from '@/stores/contacts-store';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchSkeleton } from '@/components/search/SearchSkeleton';
import { SearchResults } from '@/components/search/SearchResults';

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { loadContacts } = useContactsStore();
  const { results, isLoading, error, search, clearResults } = useSemanticSearch();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const handleSubmit = () => {
    if (query.trim()) {
      setHasSearched(true);
      search(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    setHasSearched(false);
    clearResults();
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (text.length === 0) {
      setHasSearched(false);
      clearResults();
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        className="mb-4"
        style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}
      >
        <Text className="text-3xl font-bold text-textPrimary mb-4">{t('search.title')}</Text>

        <SearchInput
          value={query}
          onChangeText={handleChangeText}
          onSubmit={handleSubmit}
          onClear={handleClear}
          isLoading={isLoading}
        />
      </View>

      <View className="flex-1 px-5">
        {error && (
          <View className="bg-error/20 rounded-xl p-4 mb-4">
            <Text className="text-error text-center">{error}</Text>
          </View>
        )}

        {isLoading ? (
          <SearchSkeleton />
        ) : (
          <SearchResults results={results} hasSearched={hasSearched} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
