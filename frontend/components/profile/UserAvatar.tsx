import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, G } from 'react-native-svg';
import { Colors } from '@/constants/theme';

type UserAvatarProps = {
  name: string;
  size?: number;
};

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

export function UserAvatar({ name, size = 64 }: UserAvatarProps) {
  const hash = hashCode(name);
  const shapeVariant = getUnit(hash, 3, 0);
  const offsetX = getUnit(hash, 6, 1) - 3;
  const offsetY = getUnit(hash, 6, 2) - 3;

  const center = size / 2;
  const mainSize = size * 0.5;

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ];

  const renderMainShape = () => {
    const cx = center + offsetX;
    const cy = center + offsetY;

    switch (shapeVariant) {
      case 0:
        return (
          <Circle cx={cx} cy={cy} r={mainSize / 2} fill={Colors.secondary} />
        );
      case 1:
        return (
          <Rect
            x={cx - mainSize / 2}
            y={cy - mainSize / 2}
            width={mainSize}
            height={mainSize}
            rx={mainSize * 0.2}
            fill={Colors.secondary}
          />
        );
      case 2:
      default:
        return (
          <G>
            <Circle cx={cx - mainSize * 0.12} cy={cy} r={mainSize / 2.5} fill={Colors.secondary} />
            <Circle cx={cx + mainSize * 0.2} cy={cy - mainSize * 0.1} r={mainSize / 4} fill={Colors.secondary} opacity={0.6} />
          </G>
        );
    }
  };

  return (
    <View style={containerStyle}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {renderMainShape()}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
