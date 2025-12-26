import Toast from 'react-native-toast-message';
import i18n from '@/lib/i18n';

export type ApiErrorDetails = {
  status?: number;
  message?: string;
};

export class ApiError extends Error {
  status?: number;
  backendMessage?: string;

  constructor(message: string, status?: number, backendMessage?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.backendMessage = backendMessage;
  }
}

export class NetworkError extends Error {
  constructor(message?: string) {
    super(message || 'Network error');
    this.name = 'NetworkError';
  }
}

function getErrorTitleByStatus(status?: number): string {
  switch (status) {
    case 401:
    case 403:
      return i18n.t('errors.unauthorized');
    case 404:
      return i18n.t('errors.notFound');
    case 429:
      return i18n.t('errors.tooManyRequests');
    case 500:
    case 502:
    case 503:
    case 504:
      return i18n.t('errors.serverError');
    default:
      return i18n.t('errors.generic');
  }
}

export function showApiError(error: ApiError | Error) {
  if (error instanceof NetworkError) {
    showNetworkError();
    return;
  }

  const apiError = error instanceof ApiError ? error : null;
  const title = apiError ? getErrorTitleByStatus(apiError.status) : i18n.t('errors.generic');
  const subtitle = apiError?.backendMessage || undefined;

  Toast.show({
    type: 'error',
    text1: title,
    text2: subtitle,
    visibilityTime: 4000,
    position: 'bottom',
  });
}

export function showNetworkError() {
  Toast.show({
    type: 'error',
    text1: i18n.t('errors.networkError'),
    text2: i18n.t('errors.checkConnection'),
    visibilityTime: 4000,
    position: 'bottom',
  });
}

export function showSuccessToast(message: string) {
  Toast.show({
    type: 'success',
    text1: message,
    visibilityTime: 3000,
    position: 'bottom',
  });
}
