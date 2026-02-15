import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Colors } from '@/constants/theme';

type SettingsRowProps = {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  description?: string;
};

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  destructive = false,
  toggleValue,
  onToggle,
  description,
}: SettingsRowProps) {
  const isToggle = onToggle !== undefined;
  const hasDescription = !!description;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        hasDescription && styles.containerWithDescription,
        pressed && !isToggle && styles.containerPressed,
      ]}
      onPress={isToggle ? () => onToggle(!toggleValue) : onPress}
      disabled={!onPress && !isToggle}
    >
      <View style={[styles.iconContainer, hasDescription && styles.iconContainerTop]}>
        {icon}
      </View>
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text
            style={[styles.label, destructive && styles.labelDestructive]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {value && !isToggle && (
            <Text style={styles.value} numberOfLines={1}>{value}</Text>
          )}
          {isToggle && (
            <Switch
              value={toggleValue}
              onValueChange={onToggle}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
              thumbColor={toggleValue ? Colors.primary : Colors.textMuted}
            />
          )}
          {showChevron && onPress && !isToggle && (
            <ChevronRight size={20} color={Colors.textMuted} />
          )}
        </View>
        {hasDescription && (
          <Text style={styles.description}>{description}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  containerWithDescription: {
    alignItems: 'flex-start',
  },
  containerPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  iconContainerTop: {
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  labelDestructive: {
    color: Colors.error,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  value: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginLeft: 8,
    marginRight: 4,
  },
});
