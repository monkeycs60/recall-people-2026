import { Stack, useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../global.css';
import { clearActiveDatabaseUser, configureDatabaseForUser, initDatabase } from '@/lib/db';
import {
  Text,
  View,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  AppState,
  Linking,
  LogBox,
  Platform,
  StatusBar as NativeStatusBar,
} from 'react-native';
import { ArrowLeft, BotMessageSquare } from 'lucide-react-native';
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
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Colors } from '@/constants/theme';
import { Toaster } from 'sonner-native';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { notificationService, SNOOZE_TOMORROW_MORNING_ACTION } from '@/services/notification.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { reminderService } from '@/services/reminder.service';
import { revenueCatService } from '@/services/revenuecat.service';
import { useAuthStore } from '@/stores/auth-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { getNotificationRoute } from '@/lib/notification-routing';
import { useSyncStore } from '@/stores/sync-store';
import { PostHogProvider } from 'posthog-react-native';
import { posthog, initErrorTracking } from '@/lib/analytics';

// Wire global JS error + unhandled-rejection capture to PostHog (best-effort,
// no-op when analytics is disabled). Installed once at module load.
initErrorTracking();

const hideStatusBarForScreenshots =
  process.env.EXPO_PUBLIC_HIDE_STATUS_BAR === 'true' ||
  process.env.EXPO_PUBLIC_SCREENSHOT_MODE === 'true';

if (hideStatusBarForScreenshots) {
  LogBox.ignoreAllLogs(true);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

let initializedDatabaseUserId: string | null = null;

export default function RootLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const [dbReady, setDbReady] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const handledCaptureUrlRef = useRef<string | null>(null);
  const language = useSettingsStore((state) => state.language);
  const isHydrated = useSettingsStore((state) => state.isHydrated);
  const user = useAuthStore((state) => state.user);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const isSubscriptionHydrated = useSubscriptionStore((state) => state.isHydrated);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    NativeStatusBar.setHidden(hideStatusBarForScreenshots, 'none');
    if (Platform.OS === 'android' && hideStatusBarForScreenshots) {
      NativeStatusBar.setTranslucent(true);
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!__DEV__) return;

    const maybeScheduleCaptureNotification = (url: string | null) => {
      if (!url?.startsWith('recall-people://debug/notification')) return;
      if (handledCaptureUrlRef.current === url) return;

      handledCaptureUrlRef.current = url;
      notificationService.scheduleCaptureDemoNotification().catch((error) => {
        console.warn('[_layout] Failed to schedule capture demo notification:', error);
      });
    };

    Linking.getInitialURL()
      .then(maybeScheduleCaptureNotification)
      .catch((error) => {
        console.warn('[_layout] Failed to read initial URL:', error);
      });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      maybeScheduleCaptureNotification(url);
    });

    return () => subscription.remove();
  }, []);

  // Sync language when settings are hydrated
  useEffect(() => {
    if (isHydrated) {
      changeLanguage(language);
    }
  }, [language, isHydrated]);

  useEffect(() => {
    if (!isAuthInitialized) {
      initializeAuth();
    }
  }, [initializeAuth, isAuthInitialized]);

  // Initialize the local SQLite database for the authenticated account only.
  useEffect(() => {
    let isCancelled = false;

    if (!isAuthInitialized) return;

    if (!user?.id) {
      initializedDatabaseUserId = null;
      clearActiveDatabaseUser().catch((error) => {
        console.warn('[_layout] Failed to close account database:', error);
      });
      setDbReady(true);
      return;
    }

    if (initializedDatabaseUserId === user.id) {
      setDbReady(true);
      return;
    }

    setDbReady(false);
    console.log('[_layout] Starting DB initialization for account:', user.id);

    configureDatabaseForUser(user.id)
      .then(() => {
        queryClient.clear();
        useSyncStore.setState({ lastSyncedAt: null, error: null, isSyncing: false });
        return initDatabase();
      })
      .then(async () => {
        if (isCancelled) return;
        console.log('[_layout] DB initialized successfully for account:', user.id);
        initializedDatabaseUserId = user.id;
        await hotTopicService.cleanupPastBirthdays();
        setDbReady(true);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('[_layout] DB initialization failed:', error);
        setDbError(error.message);
        setDbReady(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthInitialized, user?.id]);

  // Setup notification tap handler to navigate to contact
  useEffect(() => {
    const cleanup = notificationService.setupNotificationListener(async (data, actionIdentifier) => {
      if (actionIdentifier === SNOOZE_TOMORROW_MORNING_ACTION) {
        const eventId = typeof data.eventId === 'string' ? data.eventId : null;
        const title = typeof data.title === 'string' ? data.title : '';
        const contactName = typeof data.contactName === 'string' ? data.contactName : '';
        if (eventId) {
          await notificationService.snoozeEventReminderToMorning(eventId, title, contactName);
        }
        return;
      }

      const route = getNotificationRoute(data);
      if (!route) return;

      if (route.type === 'contact') {
        router.push(`/contact/${route.contactId}`);
        return;
      }

      if (route.type === 'event') {
        const hotTopic = await hotTopicService.getById(route.eventId);
        if (hotTopic) {
          router.push(`/contact/${hotTopic.contactId}`);
        }
        return;
      }

      if (route.type === 'upcoming') {
        router.push('/(tabs)/upcoming');
      }
    });

    return cleanup;
  }, [router]);

  // Initialize RevenueCat when user is authenticated and subscription store is hydrated
  // In dev mode, waiting for hydration ensures local premium status is preserved
  useEffect(() => {
    if (user?.id && isSubscriptionHydrated) {
      revenueCatService.initialize(user.id);
    }
  }, [user?.id, isSubscriptionHydrated]);

  // Check server-backed subscription state on every app launch.
  useEffect(() => {
    if (user?.id && isSubscriptionHydrated && isHydrated && dbReady) {
      console.log('[_layout] Checking whitelist status for user:', user.email);
      const syncAndScheduleReminders = async () => {
        const subscriptionStore = useSubscriptionStore.getState();
        await subscriptionStore.checkWhitelistStatus();
        await subscriptionStore.syncQuotas();

        // Launch scheduling should never trigger the OS permission prompt.
        const scheduleOptions = { requestPermission: false };
        await reminderService.scheduleNotSeenReminders(scheduleOptions);
        await reminderService.scheduleWeeklyDigest(scheduleOptions);
        await reminderService.schedulePostEventFollowUps(scheduleOptions);
        await reminderService.rescheduleEventReminders(scheduleOptions);
        await notificationService.registerNotificationCategories();
      };

      syncAndScheduleReminders().catch((error) => {
        console.warn('[_layout] Failed to sync subscription state or schedule reminders:', error);
      });
    }
  }, [user?.id, user?.email, isSubscriptionHydrated, isHydrated, dbReady]);

  useEffect(() => {
    if (!user?.id || !dbReady || !isHydrated) return;

    const syncAccountData = () => {
      useSyncStore.getState().syncNow().catch((error) => {
        console.warn('[_layout] Failed to sync account data:', error);
      });
    };

    syncAccountData();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncAccountData();
    });

    return () => subscription.remove();
  }, [dbReady, isHydrated, user?.id]);

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
      <ExpoStatusBar hidden={hideStatusBarForScreenshots} />
      <OfflineBanner />
      <BottomSheetModalProvider>
        <QueryClientProvider client={queryClient}>
          <PostHogProvider
            client={posthog ?? undefined}
            autocapture={{
              // expo-router is built on React Navigation v7; the provider
              // tracks $screen views and touch interactions automatically.
              captureScreens: true,
              captureTouches: true,
            }}
          >
          <Stack
            screenOptions={{
              headerShown: false,
              headerStyle: { backgroundColor: Colors.background },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18 },
              contentStyle: { backgroundColor: Colors.background },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="select-contact"
              options={{
                headerShown: true,
                title: t('selectContact.title'),
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
                title: t('review.title'),
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
              name="catch-up"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen name="disambiguation" options={{ headerShown: true, title: t('selectContact.title') }} />
            <Stack.Screen
              name="contact/[id]/index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="contact/[id]/coming-up"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="contact/[id]/icebreakers"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="contact/[id]/notes"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="record"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="ask"
              options={{
                headerShown: false,
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="ask-result"
              options={{
                headerShown: true,
                title: t('ask.title'),
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
          </Stack>
          </PostHogProvider>
        </QueryClientProvider>
      </BottomSheetModalProvider>
      <Toaster
        position="bottom-center"
        icons={{
          info: <BotMessageSquare size={18} color={Colors.primary} strokeWidth={2.1} />,
        }}
      />
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
