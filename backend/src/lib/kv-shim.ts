// In-memory KV shim — implémente le sous-ensemble de Workers KVNamespace utilisé
// par l'app (get / put avec expirationTtl, + delete). Mono-instance : l'état n'est
// pas partagé entre process. Suffisant pour le rate-limiting d'une API mono-conteneur.
// Si on passe un jour en multi-instance, remplacer par un backend Redis.

type Entry = { value: string; expiresAt: number | null };

export class InMemoryKV {
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
    options?: { expirationTtl?: number }
  ): Promise<void> {
    const ttl = options?.expirationTtl;
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
