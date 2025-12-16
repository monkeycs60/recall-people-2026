import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from './auth';
import { ExtractionResult } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

const apiCall = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const token = await getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
};

export const transcribeAudio = async (
  audioUri: string
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

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Transcription failed');
  }

  return response.json();
};

export const extractInfo = async (data: {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    tags: string[];
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
  };
}): Promise<{
  extraction: ExtractionResult;
}> => {
  return apiCall('/api/extract', {
    method: 'POST',
    body: data,
  });
};

export const generateSummary = async (data: {
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
}): Promise<string> => {
  const response = await apiCall<{ success: boolean; summary: string }>(
    '/api/summary',
    {
      method: 'POST',
      body: data,
    }
  );
  return response.summary;
};

export { apiCall };
