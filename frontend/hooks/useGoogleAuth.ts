import { useState, useEffect, useCallback } from 'react';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID = '546590152270-o0or7j3b42vc9a5k8m7etjqv1hvgd5vt.apps.googleusercontent.com';

type GoogleAuthResult = {
  idToken: string;
  accessToken: string | null;
};

type UseGoogleAuthReturn = {
  promptAsync: () => Promise<GoogleAuthResult | null>;
  isReady: boolean;
};

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    setIsReady(true);
  }, []);

  const promptAsync = useCallback(async (): Promise<GoogleAuthResult | null> => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken;

        if (!idToken) {
          console.error('No idToken received from Google Sign-In');
          return null;
        }

        return {
          idToken,
          accessToken: null,
        };
      }

      return null;
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            console.log('Google Sign-In already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            console.error('Google Play Services not available');
            break;
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('Google Sign-In cancelled by user');
            break;
          default:
            console.error('Google Sign-In error:', error.code, error.message);
        }
      } else {
        console.error('Google Sign-In unexpected error:', error);
      }
      return null;
    }
  }, []);

  return {
    promptAsync,
    isReady,
  };
};
