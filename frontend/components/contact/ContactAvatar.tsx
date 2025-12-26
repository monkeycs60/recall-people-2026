import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
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

// Duotone color pairs: [primary, secondary]
const DUOTONE_PALETTES = [
  ['#C67C4E', '#F5DFC9'], // Terracotta warm
  ['#A65D2E', '#E8D5C4'], // Deep terracotta
  ['#D4926A', '#FBE8D8'], // Soft peach
  ['#6B7D8A', '#E8ECEF'], // Blue grey (secondary)
  ['#B86B3F', '#EDD5C0'], // Amber brown
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getUnit(hash: number, range: number, index: number): number {
  return ((hash >> (index * 4)) & 15) % range;
}

export function ContactAvatar({ firstName, lastName, size = 'medium' }: ContactAvatarProps) {
  const displayName = lastName ? `${firstName} ${lastName}` : firstName;
  const pixelSize = SIZE_MAP[size];
  const hash = hashCode(displayName);

  const paletteIndex = getUnit(hash, DUOTONE_PALETTES.length, 0);
  const palette = DUOTONE_PALETTES[paletteIndex];

  // Determine shape pattern based on hash
  const patternType = getUnit(hash, 4, 1);
  const offsetX = (getUnit(hash, 40, 2) - 20) / 100;
  const offsetY = (getUnit(hash, 40, 3) - 20) / 100;

  const containerStyle = [
    styles.container,
    {
      width: pixelSize,
      height: pixelSize,
      borderRadius: pixelSize / 2,
    },
    size === 'large' && styles.containerLarge,
  ];

  const renderPattern = () => {
    const center = pixelSize / 2;
    const radius = pixelSize / 2;

    switch (patternType) {
      case 0:
        // Large circle offset
        return (
          <Circle
            cx={center + radius * offsetX}
            cy={center + radius * offsetY}
            r={radius * 0.65}
            fill={palette[1]}
          />
        );
      case 1:
        // Two overlapping circles
        return (
          <>
            <Circle
              cx={center - radius * 0.2}
              cy={center}
              r={radius * 0.5}
              fill={palette[1]}
            />
            <Circle
              cx={center + radius * 0.25}
              cy={center + radius * 0.15}
              r={radius * 0.4}
              fill={palette[1]}
              opacity={0.7}
            />
          </>
        );
      case 2:
        // Rectangle + circle
        return (
          <>
            <Rect
              x={center - radius * 0.4}
              y={center - radius * 0.5}
              width={radius * 0.9}
              height={radius * 1.1}
              fill={palette[1]}
              rx={4}
            />
            <Circle
              cx={center + radius * 0.3}
              cy={center - radius * 0.2}
              r={radius * 0.35}
              fill={palette[0]}
              opacity={0.5}
            />
          </>
        );
      case 3:
      default:
        // Split diagonal
        return (
          <>
            <Circle
              cx={center - radius * 0.15}
              cy={center - radius * 0.15}
              r={radius * 0.55}
              fill={palette[1]}
            />
            <Circle
              cx={center + radius * 0.2}
              cy={center + radius * 0.2}
              r={radius * 0.4}
              fill={palette[1]}
              opacity={0.6}
            />
          </>
        );
    }
  };

  return (
    <View style={containerStyle}>
      <Svg width={pixelSize} height={pixelSize} viewBox={`0 0 ${pixelSize} ${pixelSize}`}>
        {/* Background circle */}
        <Circle
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={pixelSize / 2}
          fill={palette[0]}
        />
        {/* Pattern overlay */}
        {renderPattern()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  containerLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
});
