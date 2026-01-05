import Svg, { Path } from 'react-native-svg';

type GeminiStarProps = {
  size?: number;
  color?: string;
};

export function GeminiStar({ size = 24, color = '#000' }: GeminiStarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 1C12 1 14 8 12 12C16 10 23 12 23 12C23 12 16 14 12 12C14 16 12 23 12 23C12 23 10 16 12 12C8 14 1 12 1 12C1 12 8 10 12 12C10 8 12 1 12 1Z"
        fill={color}
      />
    </Svg>
  );
}
