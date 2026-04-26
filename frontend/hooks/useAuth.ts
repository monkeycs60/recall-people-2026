import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login as authLogin, register as authRegister, loginWithGoogle as authLoginWithGoogle, loginWithApple as authLoginWithApple } from '@/lib/auth';
import { shouldResetFirstRunSettings } from '@/lib/auth-onboarding';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useGoogleAuth } from './useGoogleAuth';
import { useAppleAuth } from './useAppleAuth';

export const useAuth = () => {
  const router = useRouter();
  const { setUser, logout: storeLogout } = useAuthStore();
  const { setHasSeenOnboarding, setHasAcceptedAIConsent } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { promptAsync: googlePromptAsync, isReady: isGoogleReady } = useGoogleAuth();
  const { promptAsync: applePromptAsync, isAvailable: isAppleAvailable } = useAppleAuth();

  const resetFirstRunSettings = () => {
    setHasSeenOnboarding(false);
    setHasAcceptedAIConsent(false);
  };

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
      if (shouldResetFirstRunSettings(result, { assumeNewUserWhenMissing: true })) {
        resetFirstRunSettings();
      }
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
      if (shouldResetFirstRunSettings(result)) {
        resetFirstRunSettings();
      }
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithApple = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const appleResult = await applePromptAsync();

      if (!appleResult?.identityToken) {
        throw new Error('Apple authentication cancelled');
      }

      const result = await authLoginWithApple(appleResult.identityToken, appleResult.fullName);
      if (shouldResetFirstRunSettings(result)) {
        resetFirstRunSettings();
      }
      setUser(result.user);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Apple login failed');
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
    loginWithApple,
    isAppleAvailable,
  };
};
