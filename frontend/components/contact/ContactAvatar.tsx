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
  'f5dfc9', // Warm cream
  'e8d5c4', // Soft beige
  'fae5d3', // Peach
  'e8ecef', // Blue grey light
  'edd5c0', // Amber light
  'f7e4d4', // Rose sand
  'fbe8d8', // Soft apricot
  'f0e6dc', // Warm white
];

// Fun shirt colors - mix of warm tones and pops of color
const SHIRT_COLORS = [
  'c67c4e', // Terracotta (primary)
  '6b7d8a', // Blue grey (secondary)
  'd4926a', // Soft coral
  '8b6f5c', // Warm brown
  'a65d2e', // Deep terracotta
  '7a8b8c', // Cool grey
  'b86b3f', // Amber
  'd98e5c', // Light terracotta
];

function hashCode(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function hashCode2(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 6) + (hash << 16) - hash);
  }
  return Math.abs(hash);
}

export function ContactAvatar({ firstName, lastName, size = 'medium' }: ContactAvatarProps) {
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const pixelSize = SIZE_MAP[size];

  const hash1 = hashCode(displayName);
  const hash2 = hashCode2(displayName);

  const bgColor = BACKGROUND_COLORS[hash1 % BACKGROUND_COLORS.length];
  const shirtColor = SHIRT_COLORS[hash2 % SHIRT_COLORS.length];

  // Build DiceBear URL with Micah style
  // baseColor=f9c9b6 for light skin tone
  const avatarUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=${bgColor}&shirtColor=${shirtColor}&baseColor=f9c9b6&backgroundType=solid&radius=50`;

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
