import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import '../global.css';
import { initDatabase } from '@/lib/db';
import { Text, View } from 'react-native';

// Initialize DB once at module level
let isDbInitialized = false;

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(isDbInitialized);
  const [dbError, setDbError] = useState<string | null>(null);

  // Initialize database only once
  useEffect(() => {
    if (!isDbInitialized) {
      console.log('[_layout] Starting DB initialization...');
      initDatabase()
        .then(() => {
          console.log('[_layout] DB initialized successfully');
          isDbInitialized = true;
          setDbReady(true);
        })
        .catch((error) => {
          console.error('[_layout] DB initialization failed:', error);
          setDbError(error.message);
          setDbReady(true);
        });
    }
  }, []);

  if (dbError) {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-error mb-2">Database Error:</Text>
        <Text className="text-error">{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-textPrimary">Initializing database...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="select-contact" options={{ headerShown: true, title: 'Sélectionner le contact' }} />
      <Stack.Screen name="review" options={{ headerShown: true, title: 'Vérification' }} />
      <Stack.Screen name="disambiguation" options={{ headerShown: true, title: 'Sélectionner le contact' }} />
      <Stack.Screen name="contact/[id]" options={{ headerShown: true, title: 'Contact' }} />
    </Stack>
  );
}
