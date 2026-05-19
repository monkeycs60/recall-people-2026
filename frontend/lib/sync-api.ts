import { getToken, refreshAccessToken } from './auth';
import { API_URL } from './config';
import type {
  SyncBootstrapResponse,
  SyncChangesResponse,
  SyncMutation,
  SyncPushResponse,
} from './sync-types';

async function syncRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return syncRequest<T>(endpoint, options, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body.error === 'string'
        ? body.error
        : `Sync request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export const syncApi = {
  bootstrap: (): Promise<SyncBootstrapResponse> =>
    syncRequest<SyncBootstrapResponse>('/api/sync/bootstrap'),

  initialize: (mutations: SyncMutation[]): Promise<SyncPushResponse> =>
    syncRequest<SyncPushResponse>('/api/sync/initialize', {
      method: 'POST',
      body: JSON.stringify({ mutations }),
    }),

  push: (mutations: SyncMutation[]): Promise<SyncPushResponse> =>
    syncRequest<SyncPushResponse>('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations }),
    }),

  changes: (cursor: string): Promise<SyncChangesResponse> =>
    syncRequest<SyncChangesResponse>(`/api/sync/changes?cursor=${encodeURIComponent(cursor)}`),
};
