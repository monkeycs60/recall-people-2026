import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SearchX, Sparkles } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SemanticSearchResult } from '@/types';
import { SearchResultItem } from './SearchResultItem';

type SearchResultsProps = {
  results: SemanticSearchResult[];
  query: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function SearchResults({ results, query }: SearchResultsProps) {
  const router = useRouter();

  const handleResultPress = (result: SemanticSearchResult) => {
    router.push(`/contact/${result.contactId}`);
  };

  if (results.length === 0 && query.length > 0) {
    return (
      <AnimatedView entering={FadeIn} className="flex-1 items-center justify-center py-16">
        <View className="w-20 h-20 rounded-full bg-surfaceHover items-center justify-center mb-4">
          <SearchX size={36} color="#52525b" />
        </View>
        <Text className="text-textSecondary text-lg font-medium mb-2">
          Aucun résultat
        </Text>
        <Text className="text-textMuted text-center px-8">
          Essayez une recherche différente ou des termes plus généraux
        </Text>
      </AnimatedView>
    );
  }

  if (results.length === 0) {
    return (
      <AnimatedView entering={FadeIn} className="flex-1 items-center justify-center py-16">
        <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-6">
          <Sparkles size={40} color="#8b5cf6" />
        </View>
        <Text className="text-textPrimary text-xl font-semibold mb-2">
          Recherche sémantique
        </Text>
        <Text className="text-textMuted text-center px-8 leading-relaxed">
          Posez une question en langage naturel pour trouver des informations sur vos contacts
        </Text>
        <View className="mt-6 px-8">
          <Text className="text-textSecondary text-sm italic text-center mb-2">
            Exemples :
          </Text>
          <Text className="text-primary text-sm text-center mb-1">
            "Qui fait de la musique ?"
          </Text>
          <Text className="text-primary text-sm text-center mb-1">
            "Contacts qui aiment le sport"
          </Text>
          <Text className="text-primary text-sm text-center">
            "Qui travaille dans la tech ?"
          </Text>
        </View>
      </AnimatedView>
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
