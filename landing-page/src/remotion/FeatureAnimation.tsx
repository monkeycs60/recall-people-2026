'use client';

import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  spring,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { VoiceWaveform } from './VoiceWaveform';
import { TypingText } from './TypingText';
import { SparkleGroup } from './AISparkle';

// Colors from theme - using violet/amber instead of green
const COLORS = {
  primary: '#8B5CF6',
  primaryLight: '#EDE9FE',
  calendar: '#F59E0B',
  calendarLight: '#FEF3C7',
  peche: '#FFEDD5',
  lavande: '#EDE9FE',
  bleuCiel: '#E0F2FE',
  surface: '#FFFFFF',
  background: '#F8F7F4',
  text: '#1A1A1A',
  textSecondary: '#57534E',
  textMuted: '#A8A29E',
  border: '#1A1A1A',
};

// Scene 1: Voice recording
const VoiceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerEntrance = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          opacity: containerEntrance,
          transform: `translateY(${interpolate(containerEntrance, [0, 1], [20, 0])}px)`,
        }}
      >
        {/* Mic button - now violet */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: COLORS.primaryLight,
            border: `2px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
          }}
        >
          🎤
        </div>

        {/* Waveform - now violet */}
        <VoiceWaveform isActive={frame > 15} startFrame={15} color={COLORS.primary} />

        {/* Transcription */}
        <div
          style={{
            maxWidth: 300,
            padding: '14px 18px',
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            border: `2px solid ${COLORS.border}`,
            fontSize: 13,
            color: COLORS.text,
            lineHeight: 1.5,
          }}
        >
          <TypingText
            text="Sarah Chen, met her at the AI Summit yesterday. Her birthday is March 15th. She's launching her startup next month, and she's running the NYC Marathon in November."
            startFrame={25}
            speed={1.2}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Contact Profile Generated
const ProfileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardEntrance = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.8 },
  });

  const scale = interpolate(cardEntrance, [0, 1], [0.9, 1]);
  const opacity = interpolate(cardEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });

  // Staggered animations for each section
  const sectionDelay = (index: number) => {
    const entrance = spring({
      frame: frame - 15 - index * 8,
      fps,
      config: { damping: 15 },
    });
    return {
      opacity: interpolate(entrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
      y: interpolate(entrance, [0, 1], [10, 0]),
    };
  };

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      {/* Sparkles */}
      <div style={{ position: 'absolute', top: 40, right: 60 }}>
        <SparkleGroup startFrame={0} />
      </div>

      {/* Profile Card */}
      <div
        style={{
          width: 290,
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          border: `2px solid ${COLORS.border}`,
          padding: 16,
          transform: `scale(${scale})`,
          opacity,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: COLORS.primaryLight,
              border: `2px solid ${COLORS.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            👩‍💼
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: COLORS.text }}>Sarah Chen</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>AI/ML Engineer</div>
          </div>
        </div>

        {/* Birthday */}
        <div
          style={{
            ...sectionStyles(sectionDelay(0)),
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            backgroundColor: COLORS.calendarLight,
            borderRadius: 10,
            marginBottom: 10,
            fontSize: 12,
          }}
        >
          <span>🎂</span>
          <span style={{ color: COLORS.text, fontWeight: 500 }}>March 15</span>
        </div>

        {/* News */}
        <div style={sectionStyles(sectionDelay(1))}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📰 News
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            <NewsTag label="Startup launch" time="3 weeks" highlight />
            <NewsTag label="NYC Marathon" time="November" />
          </div>
        </div>

        {/* Résumé */}
        <div style={sectionStyles(sectionDelay(2))}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📝 AI Summary
          </div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.4, marginBottom: 10 }}>
            Met at AI Summit, works in AI/ML
          </div>
        </div>

        {/* Ice Breaker */}
        <div style={sectionStyles(sectionDelay(3))}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            💬 Ice Breaker
          </div>
          <div
            style={{
              fontSize: 12,
              color: COLORS.primary,
              fontStyle: 'italic',
              padding: '6px 10px',
              backgroundColor: COLORS.primaryLight,
              borderRadius: 8,
            }}
          >
            "How's the marathon training going?"
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Helper for staggered section styles
const sectionStyles = (anim: { opacity: number; y: number }): React.CSSProperties => ({
  opacity: anim.opacity,
  transform: `translateY(${anim.y}px)`,
});

// News tag component
const NewsTag: React.FC<{ label: string; time: string; highlight?: boolean }> = ({
  label,
  time,
  highlight,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 10px',
      backgroundColor: highlight ? COLORS.calendarLight : COLORS.background,
      borderRadius: 8,
      border: highlight ? `2px solid ${COLORS.calendar}` : '1px solid #E7E5E4',
    }}
  >
    <span style={{ fontSize: 12, color: COLORS.text, fontWeight: highlight ? 600 : 400 }}>{label}</span>
    <span style={{ fontSize: 10, color: COLORS.textMuted }}>{time}</span>
  </div>
);

// Scene 3: News Page with notification
const NewsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const listEntrance = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  // Notification pops in later
  const notifEntrance = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, mass: 0.6 },
  });

  const notifScale = interpolate(notifEntrance, [0, 1], [0.8, 1]);
  const notifOpacity = interpolate(notifEntrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const notifY = interpolate(notifEntrance, [0, 1], [-20, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      {/* News list */}
      <div
        style={{
          width: 280,
          opacity: listEntrance,
          transform: `translateY(${interpolate(listEntrance, [0, 1], [15, 0])}px)`,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.text,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>📰</span> Upcoming News
        </div>

        {/* News items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <NewsListItem
            avatar="👨‍💼"
            name="Tom's birthday"
            time="Tomorrow"
            color={COLORS.bleuCiel}
            faded
            delay={0}
          />
          <NewsListItem
            avatar="👩‍💼"
            name="Sarah's startup launch"
            time="3 weeks"
            color={COLORS.calendarLight}
            highlight
            delay={1}
          />
          <NewsListItem
            avatar="👥"
            name="Team dinner"
            time="2 weeks"
            color={COLORS.peche}
            faded
            delay={2}
          />
          <NewsListItem
            avatar="👩‍💼"
            name="Sarah - NYC Marathon"
            time="November"
            color={COLORS.lavande}
            delay={3}
          />
        </div>
      </div>

      {/* Notification popup */}
      <div
        style={{
          position: 'absolute',
          top: 30,
          right: 20,
          left: 20,
          padding: '12px 14px',
          backgroundColor: COLORS.surface,
          borderRadius: 14,
          border: `2px solid ${COLORS.calendar}`,
          boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transform: `scale(${notifScale}) translateY(${notifY}px)`,
          opacity: notifOpacity,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: COLORS.calendarLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
        >
          🔔
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>
            Sarah's startup launch
          </div>
          <div style={{ fontSize: 10, color: COLORS.textSecondary }}>
            In 3 weeks
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// News list item component
const NewsListItem: React.FC<{
  avatar: string;
  name: string;
  time: string;
  color: string;
  highlight?: boolean;
  faded?: boolean;
  delay: number;
}> = ({ avatar, name, time, color, highlight, faded, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - 10 - delay * 6,
    fps,
    config: { damping: 15 },
  });

  const opacity = faded ? 0.5 : 1;
  const x = interpolate(entrance, [0, 1], [20, 0]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        backgroundColor: highlight ? COLORS.calendarLight : COLORS.surface,
        borderRadius: 12,
        border: highlight ? `2px solid ${COLORS.calendar}` : `1px solid #E7E5E4`,
        opacity: opacity * interpolate(entrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `translateX(${x}px) ${highlight ? 'scale(1.02)' : ''}`,
        boxShadow: highlight ? '0 4px 12px rgba(245, 158, 11, 0.15)' : 'none',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        {avatar}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: highlight ? 600 : 400, color: COLORS.text }}>
          {name}
        </div>
      </div>
      <div style={{ fontSize: 10, color: COLORS.textMuted }}>{time}</div>
    </div>
  );
};

// Scene 4: Assistant Search
const AssistantScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerEntrance = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  // Result appears after question is typed
  const resultEntrance = spring({
    frame: frame - 70,
    fps,
    config: { damping: 12, mass: 0.8 },
  });

  const resultScale = interpolate(resultEntrance, [0, 1], [0.9, 1]);
  const resultOpacity = interpolate(resultEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
  const resultY = interpolate(resultEntrance, [0, 1], [15, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 290,
          opacity: containerEntrance,
          transform: `translateY(${interpolate(containerEntrance, [0, 1], [15, 0])}px)`,
        }}
      >
        {/* Search header */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: COLORS.text,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>✨</span> Assistant
        </div>

        {/* Search input */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            border: `2px solid ${COLORS.border}`,
            marginBottom: 16,
          }}
        >
          <TypingText
            text="Who's entrepreneurial?"
            startFrame={15}
            speed={0.5}
            style={{ fontSize: 14, color: COLORS.text }}
          />
        </div>

        {/* AI thinking sparkles */}
        {frame > 45 && frame < 70 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <SparkleGroup startFrame={45} />
          </div>
        )}

        {/* Result card */}
        <div
          style={{
            padding: '14px',
            backgroundColor: COLORS.surface,
            borderRadius: 14,
            border: `2px solid ${COLORS.primary}`,
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.15)',
            transform: `scale(${resultScale}) translateY(${resultY}px)`,
            opacity: resultOpacity,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: COLORS.primaryLight,
                border: `2px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              👩‍💼
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>Sarah Chen</div>
              <div style={{ fontSize: 11, color: COLORS.textSecondary }}>AI/ML Engineer</div>
            </div>
          </div>

          {/* Semantic link tag */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              backgroundColor: COLORS.primaryLight,
              borderRadius: 6,
              fontSize: 10,
              color: COLORS.primary,
              fontWeight: 500,
            }}
          >
            <span>✨</span> launching startup
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Main composition - 4 scenes, ~24s loop (6s per scene)
export const FeatureAnimation: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Scene 1: Voice (0-180 frames = 0-6s) */}
      <Sequence from={0} durationInFrames={180}>
        <VoiceScene />
      </Sequence>

      {/* Scene 2: Profile (180-360 frames = 6-12s) */}
      <Sequence from={180} durationInFrames={180}>
        <ProfileScene />
      </Sequence>

      {/* Scene 3: News (360-540 frames = 12-18s) */}
      <Sequence from={360} durationInFrames={180}>
        <NewsScene />
      </Sequence>

      {/* Scene 4: Assistant (540-720 frames = 18-24s) */}
      <Sequence from={540} durationInFrames={180}>
        <AssistantScene />
      </Sequence>
    </AbsoluteFill>
  );
};

export default FeatureAnimation;
