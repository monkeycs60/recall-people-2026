import * as FileSystem from 'expo-file-system/legacy';
import { getToken, refreshAccessToken } from './auth';
import { ExtractionResult, SuggestedQuestion } from '@/types';
import { ExtractionFeedback } from '@/utils/extractionFeedback';
import { useSettingsStore } from '@/stores/settings-store';
import { ApiError, NetworkError, showApiError } from './error-handler';
import { API_URL } from './config';

const getCurrentLanguage = () => useSettingsStore.getState().language;

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  delayMs: 300,
};

const DEFAULT_TIMEOUT_MS = 30000;
const AVATAR_GENERATION_TIMEOUT_MS = 120000;

// Utility to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Check if error is retryable (server errors, network errors, but not client errors like 400/401/403)
const isRetryableError = (error: unknown): boolean => {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) {
    // Retry on 5xx server errors, not on 4xx client errors
    return error.status !== undefined && error.status >= 500;
  }
  return false;
};

// Wrapper function to add retry logic to any async function
const withRetry = async <T>(
  fn: () => Promise<T>,
  config = RETRY_CONFIG
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry if we've exhausted all attempts
      if (attempt === config.maxRetries) {
        console.log(`[API Retry] All ${config.maxRetries + 1} attempts failed`);
        throw error;
      }

      console.log(`[API Retry] Attempt ${attempt + 1} failed, retrying in ${config.delayMs}ms...`);
      await delay(config.delayMs);
    }
  }

  throw lastError;
};

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  showErrorToast?: boolean;
  timeoutMs?: number;
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

export function isAbortError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return true;
  }

  return false;
}

const apiCall = async <T>(endpoint: string, options: ApiOptions = {}, isRetry = false): Promise<T> => {
  const { showErrorToast = true, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const token = await getToken();

  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: fetchOptions.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
      },
      body: fetchOptions.body ? JSON.stringify(fetchOptions.body) : undefined,
      signal: controller.signal,
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
    if (isAbortError(error)) {
      const networkError = new NetworkError('Request timeout');
      if (showErrorToast) {
        showApiError(networkError);
      }
      throw networkError;
    }
    if (isNetworkError(error)) {
      const networkError = new NetworkError();
      if (showErrorToast) {
        showApiError(networkError);
      }
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(fetchTimeout);
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
      // Don't show toast here - withRetry wrapper handles showing toast after all retries fail
      throw apiError;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (isNetworkError(error)) {
      const networkError = new NetworkError();
      // Don't show toast here - withRetry wrapper handles showing toast after all retries fail
      throw networkError;
    }
    throw error;
  }
};

export const transcribeAudio = (audioUri: string) =>
  withRetry(() => transcribeAudioInternal(audioUri));

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
  return withRetry(() =>
    apiCall('/api/extract', {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
      showErrorToast: false, // Don't show toast during retries - caller handles final error
    })
  );
};

export const generateSuggestedQuestions = async (data: {
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
    eventDate?: string;
  }>;
  recentNotes?: Array<{
    title: string;
    transcription: string;
    createdAt: string;
  }>;
}): Promise<SuggestedQuestion[]> => {
  const response = await apiCall<{ success: boolean; suggestedQuestions: SuggestedQuestion[] }>(
    '/api/suggested-questions',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
    }
  );
  return response.suggestedQuestions;
};

export type AvatarHints = {
  physical: string | null;
  personality: string | null;
  interest: string | null;
  context: string | null;
};

export type DetectionResult = {
  contactId: string | null;
  firstName: string;
  lastName: string | null;
  gender: 'male' | 'female' | 'unknown';
  suggestedNickname: string | null;
  confidence: 'high' | 'medium' | 'low';
  isNew: boolean;
  candidateIds: string[];
  avatarHints: AvatarHints | null;
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
  return withRetry(() =>
    apiCall('/api/detect-contact', {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
      showErrorToast: false, // Don't show toast during retries - caller handles final error
    })
  );
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

export const uploadAvatar = async (data: {
  contactId: string;
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
}): Promise<{ avatarUrl: string; filename: string }> => {
  const response = await apiCall<{ success: boolean; avatarUrl: string; filename: string }>(
    '/api/avatar/upload',
    {
      method: 'POST',
      body: data,
    }
  );
  return { avatarUrl: response.avatarUrl, filename: response.filename };
};

export const generateAvatar = async (data: {
  contactId: string;
  prompt: string;
}): Promise<{ avatarUrl: string; filename: string }> => {
  const response = await apiCall<{ success: boolean; avatarUrl: string; filename: string }>(
    '/api/avatar/generate',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
      timeoutMs: AVATAR_GENERATION_TIMEOUT_MS,
    }
  );
  return { avatarUrl: response.avatarUrl, filename: response.filename };
};

export const deleteAvatar = async (contactId: string): Promise<void> => {
  await apiCall(`/api/avatar/${contactId}`, {
    method: 'DELETE',
  });
};

export const generateAvatarFromHints = async (data: {
  contactId: string;
  gender: 'male' | 'female' | 'unknown';
  avatarHints: AvatarHints;
}): Promise<{ avatarUrl: string; filename: string }> => {
  const response = await apiCall<{ success: boolean; avatarUrl: string; filename: string }>(
    '/api/avatar/generate-from-hints',
    {
      method: 'POST',
      body: data,
      showErrorToast: false, // Silent fail for auto-generation
      timeoutMs: AVATAR_GENERATION_TIMEOUT_MS,
    }
  );
  return { avatarUrl: response.avatarUrl, filename: response.filename };
};

export const uploadUserAvatar = async (data: {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
}): Promise<{ avatarUrl: string; filename: string }> => {
  const response = await apiCall<{ success: boolean; avatarUrl: string; filename: string }>(
    '/api/avatar/user/upload',
    {
      method: 'POST',
      body: data,
    }
  );
  return { avatarUrl: response.avatarUrl, filename: response.filename };
};

export const generateUserAvatar = async (data: {
  prompt: string;
}): Promise<{ avatarUrl: string; filename: string }> => {
  const response = await apiCall<{ success: boolean; avatarUrl: string; filename: string }>(
    '/api/avatar/user/generate',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
      timeoutMs: AVATAR_GENERATION_TIMEOUT_MS,
    }
  );
  return { avatarUrl: response.avatarUrl, filename: response.filename };
};

export const deleteUserAvatar = async (): Promise<void> => {
  await apiCall('/api/avatar/user', {
    method: 'DELETE',
  });
};

export const checkProWhitelist = async (): Promise<boolean> => {
  const token = await getToken();
  if (!token) {
    if (__DEV__) {
      console.log('[API] Skipping checkProWhitelist: no auth token');
    }
    return false;
  }

  try {
    console.log('[API] Calling checkProWhitelist...');
    const response = await apiCall<{ success: boolean; isWhitelisted: boolean }>(
      '/api/subscription/check-whitelist',
      { showErrorToast: false }
    );
    console.log('[API] checkProWhitelist response:', response);
    return response.isWhitelisted;
  } catch (error) {
    if (__DEV__) {
      console.log('[API] checkProWhitelist failed:', error);
    }
    return false;
  }
};

// ============================================
// Seed / Import API
// ============================================

export type SeedContactInput = {
  firstName: string;
  lastName?: string;
  nickname?: string;
  gender?: 'male' | 'female' | 'unknown';
  phone?: string;
  email?: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  birthdayYear?: number;
  aiSummary?: string;
  facts?: Array<{
    factType: string;
    factKey: string;
    factValue: string;
  }>;
  memories?: Array<{
    description: string;
    eventDate?: string;
    isShared?: boolean;
  }>;
  hotTopics?: Array<{
    title: string;
    context?: string;
    status?: 'active' | 'resolved';
  }>;
  notes?: Array<{
    title?: string;
    transcription?: string;
    summary?: string;
  }>;
  groups?: string[];
};

export type SeedContact = SeedContactInput & {
  id: string;
  avatarHints?: AvatarHints;
  facts: Array<{
    id: string;
    contactId: string;
    factType: string;
    factKey: string;
    factValue: string;
  }>;
  memories: Array<{
    id: string;
    contactId: string;
    description: string;
    eventDate?: string;
    isShared: boolean;
  }>;
  hotTopics: Array<{
    id: string;
    contactId: string;
    title: string;
    context?: string;
    status: 'active' | 'resolved';
  }>;
  notes: Array<{
    id: string;
    contactId: string;
    title?: string;
    transcription?: string;
    summary?: string;
  }>;
};

export type SeedResponse = {
  success: boolean;
  contacts: SeedContact[];
  count: number;
};

export const seedContacts = async (contacts: SeedContactInput[]): Promise<SeedResponse> => {
  return apiCall('/api/seed', {
    method: 'POST',
    body: { contacts },
  });
};

export const generateSeedContacts = async (
  count: number = 5,
  locale: 'en' | 'fr' = 'fr',
  richness: 'minimal' | 'normal' | 'rich' = 'rich'
): Promise<SeedResponse> => {
  return apiCall('/api/seed/generate', {
    method: 'POST',
    body: { count, locale, richness },
  });
};

// ============================================
// Ask API
// ============================================

export type AskRequest = {
  question: string;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    notes: Array<{
      id: string;
      title: string;
      transcription: string;
      createdAt: string;
    }>;
  }>;
};

export type AskSource = {
  noteId: string;
  noteTitle: string;
  noteDate: string;
  contactId: string;
  contactName: string;
  relevantExcerpt: string;
};

export type AskResponse = {
  success: boolean;
  answer: string;
  sources: AskSource[];
  relatedContactId: string | null;
  noInfoFound: boolean;
};

export const askQuestion = async (
  data: AskRequest,
  options: { showErrorToast?: boolean } = {}
): Promise<AskResponse> => {
  return apiCall('/api/ask', {
    method: 'POST',
    body: { ...data, language: getCurrentLanguage() },
    showErrorToast: options.showErrorToast,
  });
};

// ============================================
// Monthly Quotas API
// ============================================

export type UseQuotaResponse = {
  success: boolean;
  isPremium?: boolean;
  remaining: number;
  error?: string;
  type?: 'ask' | 'avatar';
};

export type QuotasResponse = {
  avatarUsed: number;
  avatarLimit: number;
  askUsed: number;
  askLimit: number;
  isPremium: boolean;
};

export const getQuotas = async (): Promise<QuotasResponse | null> => {
  const token = await getToken();
  if (!token) {
    if (__DEV__) {
      console.log('[API] Skipping getQuotas: no auth token');
    }
    return null;
  }

  try {
    return await apiCall<QuotasResponse>('/api/subscription/quotas', { showErrorToast: false });
  } catch (error) {
    if (__DEV__) {
      console.log('[API] getQuotas failed:', error);
    }
    return null;
  }
};

export const consumeAvatarQuota = async (): Promise<UseQuotaResponse> => {
  return apiCall('/api/subscription/use-avatar-quota', { method: 'POST', showErrorToast: false });
};

export const consumeAskQuota = async (): Promise<UseQuotaResponse> => {
  return apiCall('/api/subscription/use-ask-quota', { method: 'POST', showErrorToast: false });
};

export const deleteAccount = async (): Promise<{ success: boolean }> => {
  return apiCall('/auth/account', {
    method: 'DELETE',
  });
};

export const sendExtractionFeedback = async (
  feedback: ExtractionFeedback
): Promise<void> => {
  await apiCall('/api/extraction-feedback', {
    method: 'POST',
    body: feedback,
    showErrorToast: false,
  });
};

export { apiCall };
