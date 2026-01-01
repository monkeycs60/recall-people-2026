import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';

export default function Index() {
	const { user, isLoading, isInitialized, initialize } = useAuthStore();

	useEffect(() => {
		if (!isInitialized) {
			initialize();
		}
	}, [isInitialized, initialize]);

	if (!isInitialized || isLoading) {
		return (
			<View className='flex-1 bg-background items-center justify-center'>
				<ActivityIndicator size='large' color={Colors.primary} />
			</View>
		);
	}

	if (user) {
		return <Redirect href='/(tabs)' />;
	}

	return <Redirect href='/(auth)/login' />;
}
