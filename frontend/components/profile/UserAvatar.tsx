import { View, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Colors } from '@/constants/theme';

type UserAvatarProps = {
  name: string;
  size?: number;
};

export function UserAvatar({ name, size = 64 }: UserAvatarProps) {
  // User avatar with blue-grey background to differentiate from contacts
  const bgColor = 'e8ecef';
  const shirtColor = '6b7d8a'; // Secondary color

  // baseColor=f9c9b6 for light skin tone
  const avatarUrl = `https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bgColor}&shirtColor=${shirtColor}&baseColor=f9c9b6&backgroundType=solid&radius=50`;

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
  ];

  return (
    <View style={containerStyle}>
      <SvgUri
        width={size}
        height={size}
        uri={avatarUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: Colors.secondaryLight,
  },
});
