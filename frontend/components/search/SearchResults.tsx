import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SemanticSearchResult } from '@/types';
import { SearchResultItem } from './SearchResultItem';

type SearchResultsProps = {
  results: SemanticSearchResult[];
  hasSearched: boolean;
};

export function SearchResults({ results, hasSearched }: SearchResultsProps) {
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
      <Animated.View
        entering={FadeIn}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 64,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: '#27272a',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <SearchX size={36} color="#52525b" />
        </View>
        <Text className="text-textSecondary text-lg font-medium mb-2">
          Aucun résultat
        </Text>
        <Text className="text-textMuted text-center px-8">
          Essayez une recherche différente ou des termes plus généraux
        </Text>
      </Animated.View>
    );
  }

  if (results.length === 0) {
    return (
      <Animated.View
        entering={FadeIn}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 64,
        }}
      >
        <Text className="text-textSecondary text-base text-center px-8 leading-relaxed mb-6">
          Posez une question en langage naturel pour trouver des informations sur vos contacts
        </Text>
        <View style={{ paddingHorizontal: 32 }}>
          <Text className="text-textMuted text-sm italic text-center mb-3">
            Exemples :
          </Text>
          <Text className="text-primary text-sm text-center mb-2">
            "Qui fait de la musique ?"
          </Text>
          <Text className="text-primary text-sm text-center mb-2">
            "Contacts qui aiment le sport"
          </Text>
          <Text className="text-primary text-sm text-center">
            "Qui travaille dans la tech ?"
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-textSecondary text-sm">
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
