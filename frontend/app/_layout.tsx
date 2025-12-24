import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import '../global.css';
import '@/lib/i18n';
import { initDatabase } from '@/lib/db';
import { Text, View, Pressable } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettingsStore } from '@/stores/settings-store';
import { changeLanguage } from '@/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// Initialize DB once at module level
let isDbInitialized = false;

export default function RootLayout() {
  const router = useRouter();
  const [dbReady, setDbReady] = useState(isDbInitialized);
  const [dbError, setDbError] = useState<string | null>(null);
  const language = useSettingsStore((state) => state.language);
  const isHydrated = useSettingsStore((state) => state.isHydrated);

  // Sync language when settings are hydrated
  useEffect(() => {
    if (isHydrated) {
      changeLanguage(language);
    }
  }, [language, isHydrated]);

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
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="select-contact" options={{ headerShown: true, title: 'Sélectionner le contact' }} />
        <Stack.Screen name="review" options={{ headerShown: true, title: 'Vérification' }} />
        <Stack.Screen name="disambiguation" options={{ headerShown: true, title: 'Sélectionner le contact' }} />
        <Stack.Screen
            name="contact/[id]"
            options={{
              headerShown: true,
              title: 'Contact',
              headerLeft: () => (
                <Pressable
                  onPress={() => router.replace('/(tabs)/contacts')}
                  className="p-2 -ml-2"
                >
                  <ArrowLeft size={24} color="black" />
                </Pressable>
              ),
            }}
          />
      </Stack>
    </QueryClientProvider>
  );
}
