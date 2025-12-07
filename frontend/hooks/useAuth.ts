import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSession, signIn as authSignIn, signUp as authSignUp, signOut as authSignOut } from '@/lib/auth';

export const useAuth = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authSignIn.email({ email, password });
      if (result.error) {
        throw new Error(result.error.message);
      }
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
      const result = await authSignUp.email({ email, password, name });
      if (result.error) {
        throw new Error(result.error.message);
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authSignOut();
    router.replace('/(auth)/login');
  };

  return {
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: isPending || isLoading,
    error,
    login,
    register,
    logout,
  };
};
