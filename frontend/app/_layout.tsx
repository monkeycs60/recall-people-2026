import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import '../global.css';
import '@/lib/i18n';
import { initDatabase } from '@/lib/db';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import { changeLanguage } from '@/lib/i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { Colors } from '@/constants/theme';

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

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

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
      <View className="flex-1 items-center justify-center px-5 bg-background">
        <Text className="text-error mb-2">Database Error:</Text>
        <Text className="text-error">{dbError}</Text>
      </View>
    );
  }

  if (!dbReady || !fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: Colors.background },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18 },
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="select-contact"
              options={{
                headerShown: true,
                title: 'Sélectionner le contact',
                headerLeft: () => (
                  <Pressable
                    onPress={() => {
                      useAppStore.getState().resetRecording();
                      router.back();
                    }}
                    className="p-2 -ml-2"
                  >
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                  </Pressable>
                ),
              }}
            />
            <Stack.Screen
              name="review"
              options={{
                headerShown: true,
                title: 'Vérification',
                headerLeft: () => (
                  <Pressable
                    onPress={() => {
                      useAppStore.getState().resetRecording();
                      router.back();
                    }}
                    className="p-2 -ml-2"
                  >
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                  </Pressable>
                ),
              }}
            />
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
                    <ArrowLeft size={24} color={Colors.textPrimary} />
                  </Pressable>
                ),
              }}
            />
            <Stack.Screen
              name="record"
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
        </QueryClientProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
