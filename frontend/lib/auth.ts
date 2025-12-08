import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthResponse = {
  user: User;
  token: string;
};

// Store token
export const setToken = async (token: string) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

// Get token
export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
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
  await setToken(data.token);
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
  await setToken(data.token);
  await setUser(data.user);
  return data;
};

// Logout
export const logout = async () => {
  await clearAuth();
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
      await clearAuth();
      return null;
    }

    const data = await response.json();
    await setUser(data.user);
    return data.user;
  } catch (error) {
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
