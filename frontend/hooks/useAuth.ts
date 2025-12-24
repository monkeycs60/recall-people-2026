import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login as authLogin, register as authRegister, loginWithGoogle as authLoginWithGoogle } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { useGoogleAuth } from './useGoogleAuth';

export const useAuth = () => {
  const router = useRouter();
  const { setUser, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { promptAsync: googlePromptAsync, isReady: isGoogleReady } = useGoogleAuth();

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authLogin(email, password);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authRegister(email, password, name);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await storeLogout();
    router.replace('/(auth)/login');
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const googleResult = await googlePromptAsync();

      if (!googleResult?.idToken) {
        throw new Error('Google authentication cancelled');
      }

      const result = await authLoginWithGoogle(googleResult.idToken);
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    login,
    register,
    logout,
    loginWithGoogle,
    isGoogleReady,
  };
};
