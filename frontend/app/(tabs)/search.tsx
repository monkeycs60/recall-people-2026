import { View, Text, KeyboardAvoidingView, Platform, StyleSheet, Pressable, Modal } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react-native';
import { useContactsQuery } from '@/hooks/useContactsQuery';
import { useSemanticSearch } from '@/hooks/useSemanticSearch';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchSkeleton } from '@/components/search/SearchSkeleton';
import { SearchResults } from '@/components/search/SearchResults';
import { Paywall } from '@/components/Paywall';
import { TestProActivation } from '@/components/TestProActivation';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { showInfoToast } from '@/lib/error-handler';

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
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTestProFirst, setShowTestProFirst] = useState(true);

  const handleSubmit = () => {
    if (!isPremium) {
      showInfoToast(
        t('paywall.reason.aiSearch'),
        t('subscription.upgradeToPro')
      );
      setShowPaywall(true);
      return;
    }
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
    if (!isPremium) {
      showInfoToast(
        t('paywall.reason.aiSearch'),
        t('subscription.upgradeToPro')
      );
      setShowPaywall(true);
      return;
    }
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
            <Text style={styles.suggestionsLabel}>{t('search.examples')}</Text>
            <View style={styles.suggestionsContainer}>
              {SUGGESTION_CHIPS.map((chipKey, index) => (
                <Animated.View
                  key={chipKey}
                  entering={FadeInDown.delay(index * 80).duration(300)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.suggestionChip,
                      pressed && styles.suggestionChipPressed,
                    ]}
                    onPress={() => handleSuggestionPress(chipKey)}
                  >
                    <View style={styles.suggestionIconContainer}>
                      <Search size={14} color={Colors.textMuted} />
                    </View>
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

      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        {showTestProFirst ? (
          <TestProActivation
            onClose={() => {
              setShowTestProFirst(true);
              setShowPaywall(false);
            }}
            onNotWhitelisted={() => setShowTestProFirst(false)}
          />
        ) : (
          <Paywall
            onClose={() => {
              setShowTestProFirst(true);
              setShowPaywall(false);
            }}
            reason="ai_search"
          />
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  errorContainer: {
    backgroundColor: `${Colors.error}15`,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  suggestionsLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  suggestionsContainer: {
    gap: Spacing.sm,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionChipPressed: {
    backgroundColor: Colors.surfaceHover,
    borderColor: Colors.border,
  },
  suggestionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 4,
  },
  suggestionChipText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '400',
    flex: 1,
  },
});
