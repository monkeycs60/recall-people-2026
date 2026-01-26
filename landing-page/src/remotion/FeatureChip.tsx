'use client';

import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

interface FeatureChipProps {
  icon: string;
  label: string;
  color: string;
  startFrame?: number;
  index?: number;
}

export const FeatureChip: React.FC<FeatureChipProps> = ({
  icon,
  label,
  color,
  startFrame = 0,
  index = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - startFrame);

  // Staggered entrance with spring
  const entrance = spring({
    frame: adjustedFrame - index * 4,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const scale = interpolate(entrance, [0, 1], [0.8, 1]);
  const opacity = interpolate(entrance, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const y = interpolate(entrance, [0, 1], [15, 0]);

  // Subtle floating animation after entrance
  const floatOffset = Math.sin((frame + index * 20) * 0.05) * 2;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        backgroundColor: color,
        borderRadius: 12,
        border: '2px solid #1A1A1A',
        transform: `scale(${scale}) translateY(${y + floatOffset}px)`,
        opacity,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 500, color: '#1A1A1A', fontSize: 14 }}>
        {label}
      </span>
    </div>
  );
};
