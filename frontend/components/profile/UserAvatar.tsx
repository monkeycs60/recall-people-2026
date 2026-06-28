import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Camera, User } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/theme';
import { normalizeAvatarUrl } from '@/lib/avatar-url';

type UserAvatarProps = {
  name: string;
  size?: number;
  avatarUrl?: string;
  onPress?: () => void;
  showEditBadge?: boolean;
  cacheKey?: string;
};

export function UserAvatar({
  size = 64,
  avatarUrl,
  onPress,
  showEditBadge = false,
  cacheKey,
}: UserAvatarProps) {
  const badgeSize = Math.max(24, size * 0.35);
  const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
  const hasCustomAvatar = !!normalizedAvatarUrl;

  const imageUri = normalizedAvatarUrl
    ? `${normalizedAvatarUrl}${normalizedAvatarUrl.includes('?') ? '&' : '?'}v=${cacheKey || ''}`
    : undefined;

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ];

  const avatarElement = hasCustomAvatar ? (
    <Image
      source={{ uri: imageUri }}
      cachePolicy="memory-disk"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Colors.primaryLight,
      }}
      contentFit="cover"
      transition={200}
      placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
      placeholderContentFit="cover"
    />
  ) : (
    <User size={size * 0.5} color={Colors.textMuted} strokeWidth={1.8} />
  );

  if (!showEditBadge) {
    if (onPress) {
      return (
        <Pressable onPress={onPress}>
          <View style={containerStyle}>{avatarElement}</View>
        </Pressable>
      );
    }
    return <View style={containerStyle}>{avatarElement}</View>;
  }

  const content = (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <View style={containerStyle}>{avatarElement}</View>
      <View
        style={[
          styles.editBadge,
          { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
        ]}
      >
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
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight,
  },
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
