import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchSkeleton } from '@/components/search/SearchSkeleton';
import { SearchResults } from '@/components/search/SearchResults';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

const SUGGESTION_CHIPS = [
  'search.example1',
  'search.example2',
  'search.example3',
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useContactsQuery(); // Preload contacts data (cached by TanStack Query)
  const { results, isLoading, error, search, clearResults } = useSemanticSearch();
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleSuggestionPress = (suggestionKey: string) => {
    const suggestionText = t(suggestionKey);
    setQuery(suggestionText);
    setHasSearched(true);
    search(suggestionText);
  };

  const showSuggestions = !hasSearched && !isLoading && results.length === 0;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 24 }}>
        <Text style={styles.screenTitle}>{t('search.title')}</Text>

        <SearchInput
          value={query}
          onChangeText={handleChangeText}
          onSubmit={handleSubmit}
          onClear={handleClear}
          isLoading={isLoading}
        />
      </View>

      <View className="flex-1 px-6 pt-4">
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {showSuggestions && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={styles.descriptionText}>{t('search.description')}</Text>
            <Text style={styles.suggestionsLabel}>{t('search.examples')} :</Text>
            <View style={styles.suggestionsColumn}>
              {SUGGESTION_CHIPS.map((chipKey, index) => (
                <Animated.View
                  key={chipKey}
                  entering={FadeInDown.delay(index * 100).duration(300)}
                >
                  <Pressable
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(chipKey)}
                  >
                    <Text style={styles.suggestionChipText}>{t(chipKey)}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
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

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: `${Colors.error}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    fontSize: 14,
  },
  descriptionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  suggestionsLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionsColumn: {
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  suggestionChipText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});
