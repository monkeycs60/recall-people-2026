'use client';

import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

interface ContactCardProps {
  name: string;
  company: string;
  emoji?: string;
  color?: string;
  startFrame?: number;
  style?: React.CSSProperties;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  name,
  company,
  emoji = '👤',
  color = '#EDE9FE',
  startFrame = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - startFrame);

  // Spring animation for entrance
  const scaleProgress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 12, mass: 0.8 },
  });

  const yProgress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 15, mass: 0.6 },
  });

  const scale = interpolate(scaleProgress, [0, 1], [0.5, 1]);
  const y = interpolate(yProgress, [0, 1], [20, 0]);
  const opacity = interpolate(scaleProgress, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        border: '2px solid #1A1A1A',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity,
        ...style,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: color,
          border: '2px solid #1A1A1A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        {emoji}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: 15 }}>
          {name}
        </div>
        <div style={{ color: '#57534E', fontSize: 13 }}>
          {company}
        </div>
      </div>
    </div>
  );
};
