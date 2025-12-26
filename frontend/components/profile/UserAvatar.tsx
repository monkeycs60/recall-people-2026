import { View, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { Colors } from '@/constants/theme';

type UserAvatarProps = {
  name: string;
  size?: number;
};

export function UserAvatar({ name, size = 64 }: UserAvatarProps) {
  // Use a warm background for user avatar (blue-grey to differentiate from contacts)
  const bgColor = 'E8ECEF';

  const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bgColor}&backgroundType=solid&radius=50`;

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
