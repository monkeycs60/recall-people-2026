import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import '../global.css';
import '@/lib/i18n';
import { initDatabase } from '@/lib/db';
import { Text, View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
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
import Toast from 'react-native-toast-message';
import { toastConfig } from '@/components/ui/ToastConfig';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { notificationService } from '@/services/notification.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { revenueCatService } from '@/services/revenuecat.service';
import { useAuthStore } from '@/stores/auth-store';

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
  const user = useAuthStore((state) => state.user);

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
        .then(async () => {
          console.log('[_layout] DB initialized successfully');
          isDbInitialized = true;
          await hotTopicService.cleanupPastBirthdays();
          setDbReady(true);
        })
        .catch((error) => {
          console.error('[_layout] DB initialization failed:', error);
          setDbError(error.message);
          setDbReady(true);
        });
    }
  }, []);

  // Setup notification tap handler to navigate to contact
  useEffect(() => {
    const cleanup = notificationService.setupNotificationListener(async (eventId) => {
      const hotTopic = await hotTopicService.getById(eventId);
      if (hotTopic) {
        router.push(`/contact/${hotTopic.contactId}`);
      }
    });

    return cleanup;
  }, [router]);

  // Initialize RevenueCat when user is authenticated
  useEffect(() => {
    if (user?.id) {
      revenueCatService.initialize(user.id);
    }
  }, [user?.id]);

  if (dbError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Database Error:</Text>
        <Text style={styles.errorText}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <OfflineBanner />
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
                    style={styles.backButton}
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
                    style={styles.backButton}
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
                title: 'Contacts',
                headerShadowVisible: false,
                headerLeft: () => (
                  <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
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
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  errorTitle: {
    color: Colors.error,
    marginBottom: 8,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.error,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
});
