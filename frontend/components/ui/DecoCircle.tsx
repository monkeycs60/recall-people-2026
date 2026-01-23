import { View, StyleSheet } from 'react-native';

interface DecoCirclePosition {
	top?: number;
	bottom?: number;
	left?: number;
	right?: number;
}

interface DecoCircleProps {
	color: string;
	opacity?: number;
	size: number;
	position: DecoCirclePosition;
}

export function DecoCircle({ color, opacity = 0.1, size, position }: DecoCircleProps) {
	return (
		<View
			style={[
				styles.circle,
				{
					backgroundColor: color,
					opacity,
					width: size,
					height: size,
					borderRadius: size / 2,
					...position,
				},
			]}
		/>
	);
}

const styles = StyleSheet.create({
	circle: {
		position: 'absolute',
		zIndex: -1,
	},
});
