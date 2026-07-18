import type { RateLimitStore } from '../types/runtime';

type Entry = { value: string; expiresAt: number | null };

// Mono-instance store used by the Node API for rate limiting. If the API is
// scaled to multiple replicas, replace it with a shared Redis-backed store.
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, Entry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const ttl = options?.expirationTtl;
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
