import { Redirect } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export default function Index() {
  const { user, isLoading, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  if (!isInitialized || isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text className="text-textSecondary mt-4">Chargement...</Text>
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
