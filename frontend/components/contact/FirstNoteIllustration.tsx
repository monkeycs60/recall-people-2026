import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Colors } from '@/constants/theme';

type FirstNoteIllustrationProps = {
  size?: number;
};

export function FirstNoteIllustration({ size = 74 }: FirstNoteIllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <Rect x="8" y="8" width="80" height="80" rx="22" fill={Colors.primaryLight} />
      <Rect x="18" y="17" width="60" height="62" rx="14" fill="#FFFFFF" />
      <Path d="M26 34H70" stroke={Colors.hairlineStrong} strokeWidth="4" strokeLinecap="round" />
      <Path d="M26 46H60" stroke={Colors.hairlineStrong} strokeWidth="4" strokeLinecap="round" />
      <Path d="M26 58H50" stroke={Colors.hairlineStrong} strokeWidth="4" strokeLinecap="round" />
      <Circle cx="67" cy="25" r="10" fill={Colors.accentLight} />
      <Path
        d="M62 25.5L65.5 29L72 22"
        stroke={Colors.accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <G transform="translate(20 56)">
        <Rect x="0" y="0" width="34" height="24" rx="12" fill={Colors.mintLight} />
        <Circle cx="12" cy="12" r="7" fill={Colors.mint} />
        <Path
          d="M22 9H28M22 15H30"
          stroke={Colors.textPrimary}
          strokeOpacity="0.5"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </G>
      <G transform="translate(49 52) rotate(-8 14 14)">
        <Rect x="0" y="0" width="30" height="30" rx="11" fill={Colors.amberLight} />
        <Path
          d="M9 20L11 14L21 7L24 11L14 18L9 20Z"
          fill={Colors.amber}
        />
        <Path d="M20 8L23 12" stroke="#6B4B00" strokeWidth="2" strokeLinecap="round" />
      </G>
    </Svg>
  );
}
