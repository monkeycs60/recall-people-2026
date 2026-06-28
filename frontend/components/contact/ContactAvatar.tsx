import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/theme';
import { Gender } from '@/types';
import { normalizeAvatarUrl } from '@/lib/avatar-url';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const AVATAR_PALETTE: [string, string][] = [
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

type AvatarSize = 'tiny' | 'small' | 'medium' | 'large';

const SIZE_MAP: Record<AvatarSize, number> = {
  tiny: 40,
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
  const { t } = useTranslation();
  const pixelSize = SIZE_MAP[size];
  const needsBadge = showEditBadge && size === 'large';
  const badgeSize = 32;

  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const hash = hashName(fullName);
  const [tileBg, tileFg] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  const initials = getInitials(fullName);
  const rotation = (hash % 5) - 2;

  const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
  const imageUri = normalizedAvatarUrl
    ? `${normalizedAvatarUrl}${normalizedAvatarUrl.includes('?') ? '&' : '?'}v=${cacheKey || ''}`
    : null;
  const isPendingAvatar = isGenerating && !imageUri;

  const dotAnims = useRef([
    new Animated.Value(0.24),
    new Animated.Value(0.24),
    new Animated.Value(0.24),
  ]).current;

  useEffect(() => {
    if (!isPendingAvatar) {
      dotAnims.forEach((dotAnim) => dotAnim.setValue(0.24));
      return;
    }

    const dotSequence = Animated.loop(
      Animated.sequence([
        Animated.stagger(
          160,
          dotAnims.map((dotAnim) =>
            Animated.sequence([
              Animated.timing(dotAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(dotAnim, {
                toValue: 0.24,
                duration: 320,
                useNativeDriver: true,
              }),
            ])
          )
        ),
        Animated.delay(260),
      ])
    );

    dotSequence.start();

    return () => {
      dotSequence.stop();
      dotAnims.forEach((dotAnim) => dotAnim.setValue(0.24));
    };
  }, [dotAnims, isPendingAvatar]);

  if (isPendingAvatar) {
    const dotSize = Math.max(3, pixelSize * 0.07);

    const skeletonElement = (
      <Animated.View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('contact.avatar.generatingTitle')}
        accessibilityState={{ busy: true }}
        style={{
          width: pixelSize,
          height: pixelSize,
          borderRadius: 14,
          backgroundColor: tileBg,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Math.max(3, pixelSize * 0.05),
          transform: [{ rotate: `${rotation}deg` }],
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          style={[
            styles.generatingText,
            {
              color: tileFg,
              fontSize: Math.max(9, pixelSize * 0.16),
            },
          ]}
        >
          {t('contact.avatar.generatingShort')}
        </Text>
        <View style={styles.generatingDots}>
          {dotAnims.map((dotAnim, dot) => (
            <Animated.View
              key={dot}
              style={[
                styles.generatingDot,
                {
                  backgroundColor: tileFg,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  opacity: dotAnim,
                },
              ]}
            />
          ))}
        </View>
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
  generatingText: {
    fontWeight: '700',
    letterSpacing: 0,
    maxWidth: '86%',
    textAlign: 'center',
  },
  generatingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  generatingDot: {
    width: 4,
    height: 4,
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
