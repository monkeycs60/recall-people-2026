import { View, Text, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, User, Loader2 } from 'lucide-react-native';
import { ClusterCard } from '@/components/ClusterCard';
import { useNetworkGraph } from '@/hooks/useNetworkGraph';
import { Contact } from '@/types';

export default function NetworkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    clusterData,
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
      'Recalculer les connexions',
      'Cela va analyser à nouveau les points communs entre vos contacts. Cette opération peut prendre quelques secondes.',
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

  const handleUnconnectedPress = (contact: Contact) => {
    router.push(`/contact/${contact.id}`);
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between mb-2"
        style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}
      >
        <Text className="text-3xl font-bold text-textPrimary">Réseau</Text>
        <Pressable
          onPress={handleForceRefresh}
          disabled={isLoading || isCalculating}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center"
        >
          {isCalculating ? (
            <Loader2 size={20} color="#8B5CF6" />
          ) : (
            <RefreshCw size={20} color="#8B5CF6" />
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
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
            <View className="w-16 h-16 rounded-2xl bg-surface items-center justify-center mb-4">
              <Loader2 size={28} color="#8B5CF6" />
            </View>
            <Text className="text-textSecondary text-base">
              {isCalculating ? 'Analyse des connexions...' : 'Chargement...'}
            </Text>
          </View>
        ) : error ? (
          <View className="items-center justify-center py-20">
            <Text className="text-red-500 text-center mb-4">{error}</Text>
            <Pressable
              onPress={handleRefresh}
              className="bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Réessayer</Text>
            </Pressable>
          </View>
        ) : clusterData ? (
          <>
            {clusterData.clusters.length > 0 ? (
              <View>
                <Text className="text-textMuted text-sm mb-5">
                  {clusterData.clusters.length} groupe{clusterData.clusters.length > 1 ? 's' : ''} de contacts avec des points communs
                </Text>
                {clusterData.clusters.map((cluster) => (
                  <ClusterCard key={cluster.id} cluster={cluster} />
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-16 px-6">
                <View className="w-20 h-20 rounded-2xl bg-surface items-center justify-center mb-4">
                  <Text className="text-4xl">🔗</Text>
                </View>
                <Text className="text-textPrimary font-semibold text-lg text-center mb-2">
                  Pas encore de connexions
                </Text>
                <Text className="text-textMuted text-center">
                  Ajoutez plus d'informations sur vos contacts pour découvrir leurs points communs !
                </Text>
              </View>
            )}

            {clusterData.unconnected.length > 0 && (
              <View className="mt-4">
                <Text className="text-lg font-semibold text-textPrimary mb-4">
                  Sans groupe ({clusterData.unconnected.length})
                </Text>
                <View className="bg-surface rounded-2xl p-4">
                  <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                    {clusterData.unconnected.map((contact) => (
                      <Pressable
                        key={contact.id}
                        onPress={() => handleUnconnectedPress(contact)}
                        className="flex-row items-center bg-background rounded-xl px-4 py-3"
                      >
                        <View className="w-8 h-8 rounded-full bg-zinc-700 items-center justify-center mr-3">
                          <User size={14} color="#9CA3AF" />
                        </View>
                        <Text className="text-textPrimary font-medium">
                          {contact.firstName}
                          {contact.lastName ? ` ${contact.lastName}` : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
