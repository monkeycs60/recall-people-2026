import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { SemanticSearchResult } from '@/types';
import { SearchResultItem } from './SearchResultItem';
import { Colors } from '@/constants/theme';

type SearchResultsProps = {
  results: SemanticSearchResult[];
  hasSearched: boolean;
};

export function SearchResults({ results, hasSearched }: SearchResultsProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleResultPress = (result: SemanticSearchResult) => {
    router.push({
      pathname: `/contact/${result.contactId}`,
      params: {
        highlightType: result.sourceType,
        highlightId: result.sourceId,
      },
    });
  };

  if (results.length === 0 && hasSearched) {
    return (
      <Animated.View entering={FadeIn} style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <SearchX size={36} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>{t('search.noResults')}</Text>
        <Text style={styles.emptySubtitle}>
          Essayez une recherche différente ou des termes plus généraux
        </Text>
      </Animated.View>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <ScrollView
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {results.length} résultat{results.length > 1 ? 's' : ''}
        </Text>
      </View>

      {results.map((result, index) => (
        <SearchResultItem
          key={`${result.contactId}-${result.sourceId}`}
          result={result}
          index={index}
          onPress={() => handleResultPress(result)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
