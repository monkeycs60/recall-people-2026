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

// Capture mode for App Store / ASO screenshots: hides system chrome and the
// in-app floating action buttons so the screen reads cleanly inside a mockup.
export const screenshotMode =
  process.env.EXPO_PUBLIC_HIDE_STATUS_BAR === 'true' ||
  process.env.EXPO_PUBLIC_SCREENSHOT_MODE === 'true';

// Debug log en dev
if (__DEV__) {
  console.log('[config] API_URL:', API_URL);
}
