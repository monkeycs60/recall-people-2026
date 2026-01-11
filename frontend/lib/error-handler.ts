import { toast } from 'sonner-native';
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

  toast.error(title, {
    description: subtitle,
    duration: 4000,
  });
}

export function showNetworkError() {
  toast.error(i18n.t('errors.networkError'), {
    description: i18n.t('errors.checkConnection'),
    duration: 4000,
  });
}

export function showSuccessToast(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

export function showErrorToast(title: string, subtitle?: string) {
  toast.error(title, {
    description: subtitle,
    duration: 4000,
  });
}

export function showInfoToast(title: string, subtitle?: string) {
  toast.info(title, {
    description: subtitle,
    duration: 3000,
  });
}
