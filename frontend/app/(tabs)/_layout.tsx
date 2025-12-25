import { Tabs, useRouter } from 'expo-router';
import { Users, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { CustomTabBar } from '@/components/ui/CustomTabBar';

export default function TabLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    isLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace('/(auth)/login');
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
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
