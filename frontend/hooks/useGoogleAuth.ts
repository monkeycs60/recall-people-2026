import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  web: '546590152270-o0or7j3b42vc9a5k8m7etjqv1hvgd5vt.apps.googleusercontent.com',
  ios: '546590152270-jsk7vkud486vg1eqsos9bt463fcbljug.apps.googleusercontent.com',
  android: '546590152270-5mhpmj00qsus5dnmrb5o6dbbmb3eu4g2.apps.googleusercontent.com',
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
