import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';

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

// Duotone color pairs: [primary, secondary] - more variety
const DUOTONE_PALETTES = [
  ['#C67C4E', '#F5DFC9'], // Terracotta warm
  ['#A65D2E', '#E8D5C4'], // Deep terracotta
  ['#D4926A', '#FBE8D8'], // Soft peach
  ['#6B7D8A', '#E8ECEF'], // Blue grey
  ['#B86B3F', '#EDD5C0'], // Amber brown
  ['#D98E5C', '#FAE5D3'], // Light terracotta
  ['#8B6F5C', '#E5DCD5'], // Warm taupe
  ['#7A8B8C', '#E0E5E6'], // Cool grey
];

// Better hash function (djb2)
function hashCode(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Secondary hash for more variation
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

  // Use different hash bits for each property
  const paletteIndex = hash1 % DUOTONE_PALETTES.length;
  const patternType = hash2 % 6;
  const offsetX = ((hash1 >> 8) % 40 - 20) / 100;
  const offsetY = ((hash2 >> 8) % 40 - 20) / 100;
  const sizeVar = 0.55 + ((hash1 >> 16) % 20) / 100;

  const palette = DUOTONE_PALETTES[paletteIndex];
  const center = pixelSize / 2;
  const radius = pixelSize / 2;

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
    switch (patternType) {
      case 0:
        // Large circle offset
        return (
          <Circle
            cx={center + radius * offsetX * 1.5}
            cy={center + radius * offsetY * 1.5}
            r={radius * sizeVar}
            fill={palette[1]}
          />
        );
      case 1:
        // Two overlapping circles
        return (
          <>
            <Circle
              cx={center - radius * 0.25 + offsetX * radius}
              cy={center + offsetY * radius}
              r={radius * 0.45}
              fill={palette[1]}
            />
            <Circle
              cx={center + radius * 0.2}
              cy={center + radius * 0.15}
              r={radius * 0.35}
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
              x={center - radius * 0.35 + offsetX * radius}
              y={center - radius * 0.45}
              width={radius * 0.8}
              height={radius * 1.0}
              fill={palette[1]}
              rx={4}
            />
            <Circle
              cx={center + radius * 0.25}
              cy={center - radius * 0.15}
              r={radius * 0.3}
              fill={palette[0]}
              opacity={0.4}
            />
          </>
        );
      case 3:
        // Three small circles
        return (
          <>
            <Circle
              cx={center - radius * 0.2}
              cy={center - radius * 0.2}
              r={radius * 0.35}
              fill={palette[1]}
            />
            <Circle
              cx={center + radius * 0.25}
              cy={center}
              r={radius * 0.3}
              fill={palette[1]}
              opacity={0.8}
            />
            <Circle
              cx={center}
              cy={center + radius * 0.3}
              r={radius * 0.25}
              fill={palette[1]}
              opacity={0.6}
            />
          </>
        );
      case 4:
        // Large offset circle bottom-right
        return (
          <Circle
            cx={center + radius * 0.2 + offsetX * radius}
            cy={center + radius * 0.2 + offsetY * radius}
            r={radius * sizeVar * 1.1}
            fill={palette[1]}
          />
        );
      case 5:
      default:
        // Half moon style
        return (
          <Circle
            cx={center - radius * 0.3 + offsetX * radius}
            cy={center - radius * 0.1 + offsetY * radius}
            r={radius * 0.6}
            fill={palette[1]}
          />
        );
    }
  };

  return (
    <View style={containerStyle}>
      <Svg width={pixelSize} height={pixelSize} viewBox={`0 0 ${pixelSize} ${pixelSize}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill={palette[0]}
        />
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
