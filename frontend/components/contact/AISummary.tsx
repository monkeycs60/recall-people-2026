import { View, Text, ActivityIndicator } from 'react-native';

type AISummaryProps = {
  summary?: string;
  isLoading?: boolean;
};

export function AISummary({ summary, isLoading }: AISummaryProps) {
  if (isLoading) {
    return (
      <View className="bg-surface/50 p-4 rounded-lg mb-4">
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text className="text-textSecondary ml-2">Génération du résumé...</Text>
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View className="bg-surface/30 p-4 rounded-lg mb-4 border border-dashed border-surfaceHover">
        <Text className="text-textMuted text-center italic">
          Ajoutez des notes pour générer un résumé automatique
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-primary/10 p-4 rounded-lg mb-4 border-l-4 border-primary">
      <Text className="text-textPrimary leading-6">{summary}</Text>
    </View>
  );
}
