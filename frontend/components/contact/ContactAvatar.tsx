import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { Gender } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ContactAvatarProps = {
  firstName: string;
  lastName?: string;
  gender?: Gender;
  avatarUrl?: string;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showEditBadge?: boolean;
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
}: ContactAvatarProps) {
  const pixelSize = SIZE_MAP[size];
  const placeholderUrl = getPlaceholderUrl(gender);

  const containerStyle = [
    styles.container,
    {
      width: pixelSize,
      height: pixelSize,
      borderRadius: pixelSize / 2,
    },
    size === 'large' && styles.containerLarge,
  ];

  const badgeSize = size === 'large' ? 32 : size === 'medium' ? 24 : 20;

  const content = (
    <View style={containerStyle}>
      <Image
        source={{ uri: avatarUrl || placeholderUrl }}
        style={{
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize / 2,
        }}
        contentFit="cover"
        transition={200}
        placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
        placeholderContentFit="cover"
      />
      {showEditBadge && size === 'large' && (
        <View style={[styles.editBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 }]}>
          <Camera size={badgeSize * 0.5} color={Colors.textInverse} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {content}
      </Pressable>
    );
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
  containerLarge: {
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
