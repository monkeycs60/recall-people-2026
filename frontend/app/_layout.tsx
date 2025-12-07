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

  console.log('[_layout] Render state:', { dbReady, dbError });

  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Database Error:</Text>
        <Text style={{ color: 'red' }}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Initializing database...</Text>
      </View>
    );
  }

  // TODO: Re-enable auth later - currently disabled to debug
  // For now, app starts directly on tabs (no auth check)
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="review" options={{ title: 'Vérification' }} />
      <Stack.Screen name="disambiguation" options={{ title: 'Sélectionner le contact' }} />
      <Stack.Screen name="contact/[id]" options={{ title: 'Contact' }} />
    </Stack>
  );
}
