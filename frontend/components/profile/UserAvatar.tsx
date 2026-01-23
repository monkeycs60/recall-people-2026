import { View, StyleSheet, Pressable } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

type UserAvatarProps = {
  name: string;
  size?: number;
  avatarUrl?: string;
  onPress?: () => void;
  showEditBadge?: boolean;
  cacheKey?: string;
};

export function UserAvatar({
  name,
  size = 64,
  avatarUrl,
  onPress,
  showEditBadge = false,
  cacheKey,
}: UserAvatarProps) {
  const badgeSize = Math.max(24, size * 0.35);
  const hasCustomAvatar = !!avatarUrl;

  const dicebearUrl = getDicebearUrl(name);
  const imageUri = hasCustomAvatar
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${cacheKey || ''}`
    : dicebearUrl;

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
        backgroundColor: Colors.secondaryLight,
      }}
      contentFit="cover"
      transition={200}
      placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
      placeholderContentFit="cover"
    />
  ) : (
    <SvgUri width={size} height={size} uri={dicebearUrl} />
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

function getDicebearUrl(name: string): string {
  const bgColor = 'e8ecef';
  const shirtColor = '6b7d8a';
  return `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bgColor}&shirtColor=${shirtColor}&baseColor=f9c9b6&backgroundType=solid&radius=50`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.secondaryLight,
  },
  wrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
