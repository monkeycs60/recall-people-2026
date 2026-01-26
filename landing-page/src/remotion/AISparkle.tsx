'use client';

import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion';

interface AISparkleProps {
  startFrame?: number;
  x?: number;
  y?: number;
  size?: number;
  delay?: number;
}

export const AISparkle: React.FC<AISparkleProps> = ({
  startFrame = 0,
  x = 0,
  y = 0,
  size = 16,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - startFrame - delay);

  const entrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 10, mass: 0.3 },
  });

  const rotation = interpolate(adjustedFrame, [0, 60], [0, 360]);
  const scale = interpolate(entrance, [0, 1], [0, 1]);

  // Pulsing effect
  const pulse = 1 + Math.sin(adjustedFrame * 0.15) * 0.15;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `scale(${scale * pulse}) rotate(${rotation}deg)`,
        opacity: entrance,
        fontSize: size,
      }}
    >
      ✨
    </div>
  );
};

export const SparkleGroup: React.FC<{ startFrame?: number }> = ({ startFrame = 0 }) => {
  const sparkles = [
    { x: 10, y: 5, size: 14, delay: 0 },
    { x: 45, y: -8, size: 18, delay: 5 },
    { x: 80, y: 12, size: 12, delay: 10 },
    { x: 25, y: 35, size: 16, delay: 8 },
    { x: 65, y: 40, size: 14, delay: 15 },
  ];

  return (
    <div style={{ position: 'relative', width: 100, height: 50 }}>
      {sparkles.map((sparkle, i) => (
        <AISparkle key={i} startFrame={startFrame} {...sparkle} />
      ))}
    </div>
  );
};
