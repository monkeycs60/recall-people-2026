import { View, Text, Pressable, StyleSheet, ImageSourcePropType, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

type EmptyStateProps = {
	icon?: React.ReactNode;
	illustration?: ImageSourcePropType;
	title: string;
	description: string;
	ctaLabel?: string;
	onCtaPress?: () => void;
};

export function EmptyState({
	icon,
	illustration,
	title,
	description,
	ctaLabel,
	onCtaPress,
}: EmptyStateProps) {
	return (
		<Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
			{illustration && (
				<Image
					source={illustration}
					style={styles.illustration}
					resizeMode="contain"
				/>
			)}
			{!illustration && icon && (
				<View style={styles.iconContainer}>{icon}</View>
			)}
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.description}>{description}</Text>
			{ctaLabel && onCtaPress && (
				<Pressable style={styles.ctaButton} onPress={onCtaPress}>
					<Text style={styles.ctaButtonText}>{ctaLabel}</Text>
				</Pressable>
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
		paddingVertical: 40,
	},
	illustration: {
		width: 180,
		height: 140,
		marginBottom: 24,
	},
	iconContainer: {
		width: 64,
		height: 64,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: Colors.textPrimary,
		textAlign: 'center',
		marginBottom: 12,
		lineHeight: 26,
	},
	description: {
		fontSize: 15,
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 22,
	},
	ctaButton: {
		marginTop: 24,
		backgroundColor: Colors.primary,
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 12,
	},
	ctaButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: Colors.textInverse,
	},
});
