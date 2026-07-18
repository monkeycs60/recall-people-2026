import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

type AppleAuthResult = {
  identityToken: string;
  authorizationCode: string | null;
  fullName: {
    givenName: string | null;
    familyName: string | null;
  } | null;
};

type UseAppleAuthReturn = {
  promptAsync: () => Promise<AppleAuthResult | null>;
  isAvailable: boolean;
};

export const useAppleAuth = (): UseAppleAuthReturn => {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsAvailable(false);
      return;
    }

    const checkAvailability = async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAvailable(available);
    };

    checkAvailability();
  }, []);

  const promptAsync = useCallback(async (): Promise<AppleAuthResult | null> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        console.error('No identityToken received from Apple Sign-In');
        return null;
      }

      return {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName,
              familyName: credential.fullName.familyName,
            }
          : null,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        console.log('Apple Sign-In cancelled by user');
      } else {
        console.error('Apple Sign-In error:', error);
      }
      return null;
    }
  }, []);

  return {
    promptAsync,
    isAvailable,
  };
};
