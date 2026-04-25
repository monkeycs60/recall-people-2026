import { View, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, User, Calendar, Sparkle, Mic } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '@/constants/theme';
import {
  CUSTOM_TAB_BAR_BOTTOM_GAP,
  getBottomNavigationInset,
} from '@/constants/bottom-navigation';
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

const TAB_CONFIG = [
  { name: 'index', icon: Users, labelKey: 'tabs.contacts' },
  { name: 'upcoming', icon: Calendar, labelKey: 'tabs.upcoming' },
  { name: '__fab', icon: Mic, labelKey: '' },
  { name: 'search', icon: Sparkle, labelKey: 'tabs.assistant' },
  { name: 'profile', icon: User, labelKey: 'tabs.profile' },
] as const;

export function CustomTabBar({ state, navigation }: TabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const fabScale = useSharedValue(1);
  const bottomInset = getBottomNavigationInset(insets.bottom);

  const handleFabPress = () => {
    fabScale.value = withSpring(0.9, { damping: 15 }, () => {
      fabScale.value = withSpring(1, { damping: 15 });
    });
    router.push('/record');
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: bottomInset + CUSTOM_TAB_BAR_BOTTOM_GAP }]}>
      <View style={styles.pill}>
        {TAB_CONFIG.map((tab) => {
          if (tab.name === '__fab') {
            return (
              <AnimatedPressable
                key="fab"
                onPress={handleFabPress}
                style={[styles.fab, fabAnimatedStyle]}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fabGradient}
                >
                  <Mic size={22} color={Colors.textInverse} strokeWidth={2.5} />
                </LinearGradient>
              </AnimatedPressable>
            );
          }

          const isActive = state.routes[state.index]?.name === tab.name;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              style={[
                styles.tabButton,
                isActive && styles.tabButtonActive,
              ]}
            >
              <Icon
                size={20}
                color={isActive ? Colors.primary : Colors.textMuted}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? Colors.primary : Colors.textMuted },
                ]}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    pointerEvents: 'box-none',
  },
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.floating,
  },
  tabButton: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 24,
    ...Shadows.fab,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
