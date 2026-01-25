import { Tabs, useRouter, useFocusEffect } from 'expo-router';
import { Users, User, Calendar, Sparkle } from 'lucide-react-native';
import { useState, useCallback } from 'react';
import { isLoggedIn } from '@/lib/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';
import { Onboarding } from '@/components/Onboarding';
import { Colors } from '@/constants/theme';
import { CustomTabBar } from '@/components/ui/CustomTabBar';

export default function TabLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { t } = useTranslation();
  const hasSeenOnboarding = useSettingsStore((state) => state.hasSeenOnboarding);
  const setHasSeenOnboarding = useSettingsStore((state) => state.setHasSeenOnboarding);

  useFocusEffect(
    useCallback(() => {
      isLoggedIn().then((loggedIn) => {
        if (!loggedIn) {
          router.replace('/(auth)/login');
        } else {
          setChecking(false);
        }
      });
    }, [router])
  );

  const handleOnboardingComplete = () => {
    setHasSeenOnboarding(true);
    router.push('/record');
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.contacts'),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: t('tabs.upcoming'),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.assistant'),
          tabBarIcon: ({ color, size }) => <Sparkle color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
