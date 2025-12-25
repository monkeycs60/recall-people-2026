import { Tabs, useRouter } from 'expo-router';
import { Users, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';
import { Onboarding } from '@/components/Onboarding';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { t } = useTranslation();
  const hasSeenOnboarding = useSettingsStore((state) => state.hasSeenOnboarding);
  const setHasSeenOnboarding = useSettingsStore((state) => state.setHasSeenOnboarding);

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace('/(auth)/login');
      } else {
        setChecking(false);
      }
    });
  }, []);

  const handleOnboardingComplete = () => {
    setHasSeenOnboarding(true);
  };

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Show onboarding if user hasn't seen it yet
  if (!hasSeenOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('tabs.contacts'),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
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
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
