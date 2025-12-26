import { View, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Colors } from '@/constants/theme';

type ContactAvatarProps = {
  firstName: string;
  lastName?: string;
  size?: 'small' | 'medium' | 'large';
};

const SIZE_MAP = {
  small: 44,
  medium: 52,
  large: 100,
} as const;

// Warm background colors matching our theme
const BACKGROUND_COLORS = [
  'F5DFC9', // Warm cream
  'E8D5C4', // Soft beige
  'FAE5D3', // Peach
  'E8ECEF', // Blue grey light
  'EDD5C0', // Amber light
  'F7E4D4', // Rose sand
  'E5DCD5', // Warm taupe light
  'FBE8D8', // Soft apricot
];

function hashCode(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function ContactAvatar({ firstName, lastName, size = 'medium' }: ContactAvatarProps) {
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const pixelSize = SIZE_MAP[size];

  const hash = hashCode(displayName);
  const bgColor = BACKGROUND_COLORS[hash % BACKGROUND_COLORS.length];

  // Build DiceBear URL with adventurer style
  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=${bgColor}&backgroundType=solid&radius=50`;

  const containerStyle = [
    styles.container,
    {
      width: pixelSize,
      height: pixelSize,
      borderRadius: pixelSize / 2,
    },
    size === 'large' && styles.containerLarge,
  ];

  return (
    <View style={containerStyle}>
      <SvgUri
        width={pixelSize}
        height={pixelSize}
        uri={avatarUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
  },
  containerLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
});
