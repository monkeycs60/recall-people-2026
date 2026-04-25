import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, Shadows, Fonts } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CollapsibleSectionProps = {
  title: string;
  defaultExpanded?: boolean;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  defaultExpanded = false,
  badge,
  badgeColor = Colors.primary,
  icon,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      <Pressable
        style={[styles.header, isExpanded && styles.headerExpanded]}
        onPress={toggleExpanded}
      >
        <View style={styles.headerLeft}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: `${badgeColor}18` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
            </View>
          )}
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color={Colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={Colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    ...Shadows.card,
    overflow: 'hidden',
  },
  containerExpanded: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerExpanded: {
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.sans.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
