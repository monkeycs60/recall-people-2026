import { View, Pressable, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, User, Mic, Calendar, Sparkle, MessageCircleQuestion, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

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
  const [menuVisible, setMenuVisible] = useState(false);

  const leftTabs = [
    { name: 'index', icon: Users, label: t('tabs.contacts') },
    { name: 'upcoming', icon: Calendar, label: t('tabs.upcoming') },
  ];

  const rightTabs = [
    { name: 'search', icon: Sparkle, label: t('tabs.assistant') },
    { name: 'profile', icon: User, label: t('tabs.profile') },
  ];

  const handleFabPress = () => {
    fabScale.value = withSpring(0.9, { damping: 15 }, () => {
      fabScale.value = withSpring(1, { damping: 15 });
    });
    setMenuVisible(true);
  };

  const handleMenuOption = (route: string) => {
    setMenuVisible(false);
    router.push(route as '/record' | '/ask');
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

      <View style={styles.fabContainer}>
        <AnimatedPressable
          onPress={handleFabPress}
          style={[styles.fab, fabAnimatedStyle]}
        >
          <View style={styles.fabInner}>
            <Plus size={32} color={Colors.textInverse} strokeWidth={2.5} />
          </View>
        </AnimatedPressable>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[styles.menuContainer, { paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeader}>
              <View style={styles.menuHandle} />
            </View>

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => handleMenuOption('/record')}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: Colors.primary }]}>
                <Mic size={22} color={Colors.textInverse} strokeWidth={2.5} />
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Animated.Text style={styles.menuOptionTitle}>
                  {t('fab.newNote')}
                </Animated.Text>
                <Animated.Text style={styles.menuOptionSubtitle}>
                  Enregistrer un vocal sur un contact
                </Animated.Text>
              </View>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => handleMenuOption('/ask')}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#7C3AED' }]}>
                <MessageCircleQuestion size={22} color={Colors.textInverse} strokeWidth={2.5} />
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Animated.Text style={styles.menuOptionTitle}>
                  {t('fab.askQuestion')}
                </Animated.Text>
                <Animated.Text style={styles.menuOptionSubtitle}>
                  Interroger ta mémoire
                </Animated.Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    borderTopWidth: 1.5,
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
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    top: -28,
    left: '50%',
    marginLeft: -32,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  fabInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  menuIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionTextContainer: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  menuOptionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
});
