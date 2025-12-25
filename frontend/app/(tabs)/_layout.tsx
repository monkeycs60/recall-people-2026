import { Tabs, useRouter } from 'expo-router';
import { Home, Users, Search, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/lib/auth';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

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
      <View className="flex-1 items-center justify-center">
        <Text className="text-textPrimary">Loading...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: {
          backgroundColor: '#18181b',
          borderTopColor: '#27272a',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('tabs.contacts'),
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
