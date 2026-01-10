import Constants from 'expo-constants';

export const getApiUrl = (): string => {
  // En production, utiliser l'URL configurée via env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // En dev, utiliser l'URL injectée par app.config.js
  const localApiUrl = Constants.expoConfig?.extra?.localApiUrl as string | undefined;
  if (localApiUrl) {
    return localApiUrl;
  }

  return 'http://localhost:8787';
};

export const API_URL = getApiUrl();

// Debug log en dev
if (__DEV__) {
  console.log('[config] API_URL:', API_URL);
}
