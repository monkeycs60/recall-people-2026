'use client';

import { useCurrentFrame, interpolate } from 'remotion';

interface TypingTextProps {
  text: string;
  startFrame?: number;
  speed?: number; // chars per frame
  style?: React.CSSProperties;
  className?: string;
}

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  startFrame = 0,
  speed = 0.8,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - startFrame);

  const charsToShow = Math.floor(adjustedFrame * speed);
  const displayText = text.slice(0, Math.min(charsToShow, text.length));

  // Cursor blink
  const showCursor = adjustedFrame > 0 && charsToShow <= text.length;
  const cursorOpacity = showCursor ? (Math.floor(frame / 8) % 2 === 0 ? 1 : 0) : 0;

  return (
    <span className={className} style={style}>
      {displayText}
      <span style={{ opacity: cursorOpacity }}>|</span>
    </span>
  );
};
