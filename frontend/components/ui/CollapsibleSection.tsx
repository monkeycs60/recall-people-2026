import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

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
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  containerExpanded: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  headerExpanded: {
    borderWidth: 0,
    borderRadius: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
});
