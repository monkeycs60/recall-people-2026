import { View, Text, StyleSheet, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/theme';
import { Gender } from '@/types';
import { useRef, useCallback } from 'react';

const AVATAR_PALETTE: Array<[string, string]> = [
  ['#FFD7C2', '#B03A11'],
  ['#D0E5FF', '#0F3C75'],
  ['#E6D7FF', '#3F18A4'],
  ['#CDF2DC', '#0A5C38'],
  ['#FFE7A8', '#6B4B00'],
  ['#FFD0E4', '#8A1B4E'],
  ['#C7E9E8', '#0D4F4F'],
  ['#F5D3C0', '#6B2E0B'],
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getInitials(name: string): string {
  return (name || '?')
    .split(' ')
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

type AvatarSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<AvatarSize, number> = {
  small: 48,
  medium: 60,
  large: 72,
};

type ContactAvatarProps = {
  firstName: string;
  lastName?: string;
  gender?: Gender;
  avatarUrl?: string;
  size?: AvatarSize;
  onPress?: () => void;
  showEditBadge?: boolean;
  cacheKey?: string;
  recyclingKey?: string;
  isGenerating?: boolean;
};

export function ContactAvatar({
  firstName,
  lastName,
  gender: _gender,
  avatarUrl,
  size = 'medium',
  onPress,
  showEditBadge = false,
  cacheKey,
  recyclingKey,
  isGenerating = false,
}: ContactAvatarProps) {
  const pixelSize = SIZE_MAP[size];
  const needsBadge = showEditBadge && size === 'large';
  const badgeSize = 32;

  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const hash = hashName(fullName);
  const [tileBg, tileFg] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  const initials = getInitials(fullName);
  const rotation = (hash % 5) - 2;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    if (isGenerating) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [isGenerating, pulseAnim]);

  const imageUri = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${cacheKey || ''}`
    : null;

  if (isGenerating && !avatarUrl) {
    const skeletonElement = (
      <Animated.View
        style={{
          width: pixelSize,
          height: pixelSize,
          borderRadius: 14,
          backgroundColor: tileBg,
          opacity: pulseAnim,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${rotation}deg` }],
        }}
        ref={() => startPulse()}
      >
        <ActivityIndicator size={size === 'large' ? 'large' : 'small'} color={tileFg} />
      </Animated.View>
    );

    if (onPress) {
      return <Pressable onPress={onPress}>{skeletonElement}</Pressable>;
    }
    return skeletonElement;
  }

  const initialsElement = (
    <View
      style={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: 14,
        backgroundColor: tileBg,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: `${rotation}deg` }],
      }}
    >
      <Text
        style={{
          fontSize: pixelSize * 0.38,
          fontWeight: '700',
          color: tileFg,
          letterSpacing: -0.5,
        }}
      >
        {initials}
      </Text>
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          cachePolicy="memory-disk"
          recyclingKey={recyclingKey}
          style={{
            ...StyleSheet.absoluteFillObject,
            borderRadius: 14,
          }}
          contentFit="cover"
          transition={recyclingKey ? 0 : 200}
        />
      )}
    </View>
  );

  if (!needsBadge) {
    if (onPress) {
      return <Pressable onPress={onPress}>{initialsElement}</Pressable>;
    }
    return initialsElement;
  }

  const content = (
    <View style={[styles.wrapper, { width: pixelSize, height: pixelSize }]}>
      {initialsElement}
      <View style={[styles.editBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
        <Camera size={badgeSize * 0.5} color={Colors.textInverse} />
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  wrapper: {
    ...Shadows.floating,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
