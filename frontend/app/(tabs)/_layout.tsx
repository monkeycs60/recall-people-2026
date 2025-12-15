import { Tabs, useRouter } from 'expo-router';
import { Home, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { isLoggedIn } from '@/lib/auth';
import { View, Text } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

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
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
