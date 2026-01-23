import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

type User = {
  id: string;
  email: string;
  name: string;
  provider?: 'credentials' | 'google';
  avatarUrl?: string;
};

type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

// Store token
export const setToken = async (token: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

// Get token
export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

// Store refresh token
export const setRefreshToken = async (token: string) => {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

// Get refresh token
export const getRefreshToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

// Store user
export const setUser = async (user: User) => {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
};

// Get user
export const getUser = async (): Promise<User | null> => {
  const userStr = await SecureStore.getItemAsync(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Clear auth data
export const clearAuth = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
};

// Register
export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const data: AuthResponse = await response.json();
  await setToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  await setUser(data.user);
  return data;
};

// Login
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data: AuthResponse = await response.json();
  await setToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  await setUser(data.user);
  return data;
};

// Logout
export const logout = async () => {
  await clearAuth();
};

// Login with Google
export const loginWithGoogle = async (idToken: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google login failed');
  }

  const data: AuthResponse = await response.json();
  await setToken(data.accessToken);
  await setRefreshToken(data.refreshToken);
  await setUser(data.user);
  return data;
};

// Verify token
export const verifyToken = async (): Promise<User | null> => {
  const token = await getToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      // Token expired or invalid - try to refresh before giving up
      const refreshResult = await refreshAccessToken();
      if (refreshResult) {
        return refreshResult.user;
      }
      await clearAuth();
      return null;
    }

    const data = await response.json();
    await setUser(data.user);
    return data.user;
  } catch {
    // Network error - try to refresh before giving up
    const refreshResult = await refreshAccessToken();
    if (refreshResult) {
      return refreshResult.user;
    }
    await clearAuth();
    return null;
  }
};

// Check if logged in
export const isLoggedIn = async (): Promise<boolean> => {
  const token = await getToken();
  if (!token) return false;

  const user = await verifyToken();
  return !!user;
};

// Flag to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<AuthResponse | null> | null = null;

// Refresh access token using refresh token
export const refreshAccessToken = async (): Promise<AuthResponse | null> => {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearAuth();
        return null;
      }

      const data: AuthResponse = await response.json();
      await setToken(data.accessToken);
      await setRefreshToken(data.refreshToken);
      await setUser(data.user);
      return data;
    } catch {
      await clearAuth();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Request password reset
export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Password reset request failed');
  }

  return data;
};

// Reset password with token
export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Password reset failed');
  }

  return data;
};
