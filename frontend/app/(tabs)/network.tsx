import { View, Text, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RefreshCw, User, Loader2 } from 'lucide-react-native';
import { NetworkGraph } from '@/components/NetworkGraph';
import { useNetworkGraph } from '@/hooks/useNetworkGraph';
import { Contact, GraphNode, GraphEdge } from '@/types';

const FACT_TYPE_LABELS: Record<string, string> = {
  work: 'Travail',
  company: 'Entreprise',
  hobby: 'Loisir',
  sport: 'Sport',
  relationship: 'Relation',
  partner: 'Partenaire',
  location: 'Lieu',
  education: 'Formation',
  birthday: 'Anniversaire',
  contact: 'Contact',
  other: 'Autre',
};

export default function NetworkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    networkData,
    isLoading,
    isCalculating,
    error,
    refresh,
    forceRefresh,
  } = useNetworkGraph();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleForceRefresh = () => {
    Alert.alert(
      'Recalculer les similarités',
      'Cela va recalculer toutes les similarités entre vos contacts. Cette opération utilise l\'IA et peut prendre quelques secondes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Recalculer',
          onPress: async () => {
            await forceRefresh();
          },
        },
      ]
    );
  };

  const handleNodePress = (node: GraphNode) => {
    router.push(`/contact/${node.contactId}`);
  };

  const handleEdgePress = (edge: GraphEdge) => {
    const typeLabel = FACT_TYPE_LABELS[edge.factType] || edge.factType;
    Alert.alert(
      `${typeLabel}`,
      edge.label,
      [{ text: 'OK' }]
    );
  };

  const renderUnconnectedContact = (contact: Contact) => (
    <Pressable
      key={contact.id}
      className="bg-surface p-3 rounded-lg mb-2 flex-row items-center"
      onPress={() => router.push(`/contact/${contact.id}`)}
    >
      <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-3">
        <User size={20} color="#9CA3AF" />
      </View>
      <Text className="text-textPrimary font-medium">
        {contact.firstName} {contact.lastName || ''}
      </Text>
    </Pressable>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <View
          className="flex-row items-center justify-between"
          style={{ paddingTop: insets.top + 10, paddingHorizontal: 24 }}
        >
          <Text className="text-3xl font-bold text-textPrimary">Réseau</Text>
          <Pressable
            onPress={handleForceRefresh}
            disabled={isLoading || isCalculating}
            className="p-2"
          >
            {isCalculating ? (
              <Loader2 size={24} color="#8B5CF6" />
            ) : (
              <RefreshCw size={24} color="#8B5CF6" />
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8B5CF6"
            />
          }
        >
          {isLoading && !refreshing ? (
            <View className="items-center justify-center py-20">
              <Loader2 size={32} color="#8B5CF6" />
              <Text className="text-textSecondary mt-4">
                {isCalculating ? 'Calcul des similarités...' : 'Chargement...'}
              </Text>
            </View>
          ) : error ? (
            <View className="items-center justify-center py-20">
              <Text className="text-red-500 text-center">{error}</Text>
              <Pressable
                onPress={handleRefresh}
                className="mt-4 bg-primary px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Réessayer</Text>
              </Pressable>
            </View>
          ) : networkData ? (
            <>
              {networkData.nodes.length > 0 ? (
                <View className="mt-4">
                  <Text className="text-textSecondary text-sm mb-3">
                    {networkData.nodes.length} contact{networkData.nodes.length > 1 ? 's' : ''} connecté{networkData.nodes.length > 1 ? 's' : ''} par {networkData.edges.length} lien{networkData.edges.length > 1 ? 's' : ''}
                  </Text>
                  <NetworkGraph
                    data={networkData}
                    onNodePress={handleNodePress}
                    onEdgePress={handleEdgePress}
                  />
                  <Text className="text-textMuted text-xs text-center mt-2">
                    Double-tap pour réinitialiser le zoom
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center py-10">
                  <Text className="text-textSecondary text-center">
                    Pas encore de connexions entre vos contacts.{'\n'}
                    Ajoutez plus de faits pour découvrir des liens !
                  </Text>
                </View>
              )}

              {networkData.unconnected.length > 0 && (
                <View className="mt-6">
                  <Text className="text-lg font-semibold text-textPrimary mb-3">
                    Non classés ({networkData.unconnected.length})
                  </Text>
                  {networkData.unconnected.map(renderUnconnectedContact)}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}
