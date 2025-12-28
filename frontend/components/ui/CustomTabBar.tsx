import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, User, Mic, Calendar, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  navigation: {
    navigate: (name: string) => void;
  };
}

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const fabScale = useSharedValue(1);

  const leftTabs = [
    { name: 'contacts', icon: Users, label: t('tabs.contacts') },
    { name: 'upcoming', icon: Calendar, label: t('tabs.upcoming') },
  ];

  const rightTabs = [
    { name: 'search', icon: Search, label: t('tabs.explore') },
    { name: 'profile', icon: User, label: t('tabs.profile') },
  ];

  const handleFabPress = () => {
    fabScale.value = withSpring(0.9, { damping: 15 }, () => {
      fabScale.value = withSpring(1, { damping: 15 });
    });
    router.push('/record');
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const renderTab = (tab: { name: string; icon: typeof Users; label: string }) => {
    const isActive = state.routes[state.index]?.name === tab.name;
    const Icon = tab.icon;

    return (
      <Pressable
        key={tab.name}
        onPress={() => navigation.navigate(tab.name)}
        style={styles.tabItem}
      >
        <Icon
          size={24}
          color={isActive ? Colors.primary : Colors.tabIconDefault}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <Animated.Text
          style={[
            styles.tabLabel,
            { color: isActive ? Colors.primary : Colors.tabIconDefault },
          ]}
        >
          {tab.label}
        </Animated.Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBar}>
        <View style={styles.tabGroup}>
          {leftTabs.map(renderTab)}
        </View>

        <View style={styles.fabSpacer} />

        <View style={styles.tabGroup}>
          {rightTabs.map(renderTab)}
        </View>
      </View>

      <AnimatedPressable
        onPress={handleFabPress}
        style={[styles.fab, fabAnimatedStyle]}
      >
        <View style={styles.fabInner}>
          <Mic size={28} color={Colors.textInverse} strokeWidth={2.5} />
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
  },
  tabGroup: {
    flexDirection: 'row',
    flex: 1,
  },
  fabSpacer: {
    width: 80,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    top: -28,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
