import * as FileSystem from 'expo-file-system/legacy';
import { getToken, refreshAccessToken } from './auth';
import { ExtractionResult } from '@/types';
import { useSettingsStore } from '@/stores/settings-store';
import { ApiError, NetworkError, showApiError } from './error-handler';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getCurrentLanguage = () => useSettingsStore.getState().language;

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  showErrorToast?: boolean;
};

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return true;
  }
  if (error instanceof Error && error.message.includes('network')) {
    return true;
  }
  return false;
}

const apiCall = async <T>(endpoint: string, options: ApiOptions = {}, isRetry = false): Promise<T> => {
  const { showErrorToast = true, ...fetchOptions } = options;
  const token = await getToken();

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: fetchOptions.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
      },
      body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

      // If 401 and not already a retry, try to refresh the token
      if (response.status === 401 && !isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the request with the new token
          return apiCall<T>(endpoint, options, true);
        }
      }

      const apiError = new ApiError(
        errorData.error || `API Error: ${response.status}`,
        response.status,
        errorData.error || errorData.message
      );
      if (showErrorToast) {
        showApiError(apiError);
      }
      throw apiError;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (isNetworkError(error)) {
      const networkError = new NetworkError();
      if (showErrorToast) {
        showApiError(networkError);
      }
      throw networkError;
    }
    throw error;
  }
};

const transcribeAudioInternal = async (
  audioUri: string,
  isRetry = false
): Promise<{
  transcript: string;
  confidence: number;
  duration: number;
}> => {
  const token = await getToken();

  const formData = new FormData();

  const audioInfo = await FileSystem.getInfoAsync(audioUri);
  if (!audioInfo.exists) {
    throw new Error('Audio file not found');
  }

  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);
  formData.append('language', getCurrentLanguage());

  try {
    const response = await fetch(`${API_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Transcription failed' }));

      // If 401 and not already a retry, try to refresh the token
      if (response.status === 401 && !isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return transcribeAudioInternal(audioUri, true);
        }
      }

      const apiError = new ApiError(
        errorData.error || 'Transcription failed',
        response.status,
        errorData.error || errorData.message
      );
      showApiError(apiError);
      throw apiError;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (isNetworkError(error)) {
      const networkError = new NetworkError();
      showApiError(networkError);
      throw networkError;
    }
    throw error;
  }
};

export const transcribeAudio = (audioUri: string) => transcribeAudioInternal(audioUri);

export const extractInfo = async (data: {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
  }>;
  existingGroups?: Array<{
    id: string;
    name: string;
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
    hotTopics: Array<{
      id: string;
      title: string;
      context?: string;
    }>;
  };
}): Promise<{
  extraction: ExtractionResult;
}> => {
  return apiCall('/api/extract', {
    method: 'POST',
    body: { ...data, language: getCurrentLanguage() },
  });
};

export const generateIceBreakers = async (data: {
  contact: {
    firstName: string;
    lastName?: string;
  };
  facts: Array<{
    factType: string;
    factKey: string;
    factValue: string;
  }>;
  hotTopics: Array<{
    title: string;
    context: string;
    status: string;
  }>;
}): Promise<string[]> => {
  const response = await apiCall<{ success: boolean; iceBreakers: string[] }>(
    '/api/ice-breakers',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
    }
  );
  return response.iceBreakers;
};

export type DetectionResult = {
  contactId: string | null;
  firstName: string;
  lastName: string | null;
  suggestedNickname: string | null;
  confidence: 'high' | 'medium' | 'low';
  isNew: boolean;
  candidateIds: string[];
};

export const detectContact = async (data: {
  transcription: string;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    nickname?: string;
    aiSummary?: string;
    hotTopics: Array<{
      title: string;
      context?: string;
    }>;
  }>;
}): Promise<{ detection: DetectionResult }> => {
  return apiCall('/api/detect-contact', {
    method: 'POST',
    body: { ...data, language: getCurrentLanguage() },
  });
};

export const getUserSettings = async (): Promise<{
  user: { id: string; name: string; email: string; preferredLanguage: string };
}> => {
  return apiCall('/api/settings');
};

export const updateUserSettings = async (data: {
  preferredLanguage?: string;
}): Promise<{
  user: { id: string; name: string; email: string; preferredLanguage: string };
}> => {
  return apiCall('/api/settings', {
    method: 'PATCH',
    body: data,
  });
};

export const generateSummary = async (data: {
  contactName: string;
  transcriptions: string[];
}): Promise<string> => {
  const response = await apiCall<{ success: boolean; summary: string }>(
    '/api/summary',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
    }
  );
  return response.summary;
};

export { apiCall };
