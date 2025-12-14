import { useState } from 'react';
import { useRouter } from 'expo-router';
import { login as authLogin, register as authRegister } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export const useAuth = () => {
  const router = useRouter();
  const { setUser, logout: storeLogout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return {
    isLoading,
    error,
    login,
    register,
    logout,
  };
};
