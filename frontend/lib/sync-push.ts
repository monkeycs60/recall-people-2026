import type { SyncMutation, SyncPushResponse } from './sync-types';

export class SyncRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export const isSyncRejection = (error: unknown): error is SyncRequestError =>
  error instanceof SyncRequestError &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 401 &&
  error.status !== 408 &&
  error.status !== 429;

type PushIsolatingRejectionsInput = {
  mutations: SyncMutation[];
  push: (mutations: SyncMutation[]) => Promise<SyncPushResponse>;
  onApplied: (response: SyncPushResponse) => Promise<void>;
  onRejected: (mutation: SyncMutation, error: SyncRequestError) => Promise<void>;
};

export async function pushIsolatingRejections({
  mutations,
  push,
  onApplied,
  onRejected,
}: PushIsolatingRejectionsInput): Promise<void> {
  if (mutations.length === 0) return;

  try {
    await onApplied(await push(mutations));
  } catch (error) {
    if (!isSyncRejection(error)) throw error;

    if (mutations.length === 1) {
      await onRejected(mutations[0], error);
      return;
    }

    const middle = Math.ceil(mutations.length / 2);
    const input = { push, onApplied, onRejected };
    await pushIsolatingRejections({ ...input, mutations: mutations.slice(0, middle) });
    await pushIsolatingRejections({ ...input, mutations: mutations.slice(middle) });
  }
}
