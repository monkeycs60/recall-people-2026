import { View, Text, Pressable, StyleSheet } from 'react-native';
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
};

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  destructive = false,
}: SettingsRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={[styles.label, destructive && styles.labelDestructive]}>
        {label}
      </Text>
      {value && <Text style={styles.value}>{value}</Text>}
      {showChevron && onPress && (
        <ChevronRight size={20} color={Colors.textMuted} />
      )}
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
  containerPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  label: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  labelDestructive: {
    color: Colors.error,
  },
  value: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginRight: 8,
  },
});
