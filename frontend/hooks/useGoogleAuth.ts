import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  web: 'REDACTED_GOOGLE_CLIENT_ID_WEB',
  ios: 'REDACTED_GOOGLE_CLIENT_ID_IOS',
  android: 'REDACTED_GOOGLE_CLIENT_ID_ANDROID',
};

type GoogleAuthResult = {
  idToken: string;
  accessToken: string | null;
};

type UseGoogleAuthReturn = {
  promptAsync: () => Promise<GoogleAuthResult | null>;
  isReady: boolean;
};

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.web,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    scopes: ['openid', 'profile', 'email'],
  });

  const handlePromptAsync = useCallback(async (): Promise<GoogleAuthResult | null> => {
    if (!request) {
      console.error('Google Auth request not ready');
      return null;
    }

    const result = await promptAsync();

    if (result?.type === 'success') {
      const { authentication } = result;

      if (authentication?.idToken) {
        return {
          idToken: authentication.idToken,
          accessToken: authentication.accessToken,
        };
      }
    }

    if (result?.type === 'error') {
      console.error('Google Auth error:', result.error);
    }

    return null;
  }, [request, promptAsync]);

  return {
    promptAsync: handlePromptAsync,
    isReady: !!request,
  };
};
