import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Gender } from '@/types';
import { API_URL } from '@/lib/config';

type ContactAvatarProps = {
  firstName: string;
  lastName?: string;
  gender?: Gender;
  avatarUrl?: string;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showEditBadge?: boolean;
  cacheKey?: string; // Use updatedAt to force cache invalidation
  recyclingKey?: string; // Use contact id to prevent FlatList recycling issues
};

const SIZE_MAP = {
  small: 44,
  medium: 52,
  large: 100,
} as const;

const getPlaceholderUrl = (gender: Gender): string => {
  return `${API_URL}/api/avatar/placeholders/avatar-${gender}.png`;
};

export function ContactAvatar({
  firstName,
  lastName,
  gender = 'unknown',
  avatarUrl,
  size = 'medium',
  onPress,
  showEditBadge = false,
  cacheKey,
  recyclingKey,
}: ContactAvatarProps) {
  const pixelSize = SIZE_MAP[size];
  const placeholderUrl = getPlaceholderUrl(gender);
  const needsBadge = showEditBadge && size === 'large';
  const badgeSize = 32;

  // Add cache buster to avatar URL if cacheKey provided
  const imageUri = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${cacheKey || ''}`
    : placeholderUrl;

  const imageElement = (
    <Image
      source={{ uri: imageUri }}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey}
      style={{
        width: pixelSize,
        height: pixelSize,
        borderRadius: pixelSize / 2,
        backgroundColor: Colors.primaryLight,
      }}
      contentFit="cover"
      transition={recyclingKey ? 0 : 200}
      placeholder={recyclingKey ? undefined : { blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
      placeholderContentFit="cover"
    />
  );

  // Simple version for list items (no badge)
  if (!needsBadge) {
    if (onPress) {
      return <Pressable onPress={onPress}>{imageElement}</Pressable>;
    }
    return imageElement;
  }

  // Version with badge for profile header
  const content = (
    <View style={[styles.wrapper, { width: pixelSize, height: pixelSize }]}>
      <View style={[styles.imageContainer, { width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 }]}>
        {imageElement}
      </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  imageContainer: {
    overflow: 'hidden',
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
