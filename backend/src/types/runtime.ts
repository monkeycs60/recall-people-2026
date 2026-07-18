export type RateLimitStore = {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
};

export type AvatarObject = {
  body: Uint8Array<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

export type AvatarObjectStore = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | Buffer,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<void>;
  get(key: string): Promise<AvatarObject | null>;
  list(options?: { prefix?: string }): Promise<{ objects: { key: string }[] }>;
  delete(key: string): Promise<void>;
};
