'use client';

import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface VoiceWaveformProps {
  isActive?: boolean;
  startFrame?: number;
  color?: string;
  barCount?: number;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive = true,
  startFrame = 0,
  color = '#10B981',
  barCount = 5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - startFrame);

  // Entrance animation
  const entrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 15, mass: 0.5 },
  });

  const bars = Array.from({ length: barCount }, (_, i) => {
    // Each bar has a different phase for wave effect
    const phase = (i / barCount) * Math.PI * 2;
    const waveSpeed = 0.15;

    // Sine wave for natural voice-like animation
    const baseHeight = isActive
      ? 0.4 + 0.6 * Math.abs(Math.sin(adjustedFrame * waveSpeed + phase))
      : 0.2;

    // Add some randomness for more organic feel
    const noise = Math.sin(adjustedFrame * 0.3 + i * 1.5) * 0.1;
    const height = Math.max(0.15, Math.min(1, baseHeight + noise));

    return (
      <div
        key={i}
        style={{
          width: 4,
          height: 32 * height * entrance,
          backgroundColor: color,
          borderRadius: 2,
          transition: 'height 0.05s ease',
        }}
      />
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        height: 32,
        opacity: entrance,
      }}
    >
      {bars}
    </div>
  );
};
