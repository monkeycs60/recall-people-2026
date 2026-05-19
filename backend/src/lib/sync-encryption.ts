const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const VERSION_PREFIX = 'v1';

function getCrypto(): Crypto {
  const runtimeGlobal = globalThis as typeof globalThis & { crypto?: Crypto };
  if (!runtimeGlobal.crypto?.subtle) {
    throw new Error('Web Crypto API is required for sync encryption');
  }
  return runtimeGlobal.crypto;
}

function normalizeBase64(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=');
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(normalizeBase64(value));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getRawKey(rawKey: string | undefined): Uint8Array {
  if (!rawKey) {
    throw new Error('SYNC_ENCRYPTION_KEY is required');
  }

  const key = base64ToBytes(rawKey);
  if (key.length !== KEY_BYTES) {
    throw new Error('SYNC_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }

  return key;
}

async function importKey(rawKey: string | undefined): Promise<CryptoKey> {
  return getCrypto().subtle.importKey(
    'raw',
    getRawKey(rawKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptString(rawKey: string | undefined, value: string): Promise<string> {
  const nonce = new Uint8Array(NONCE_BYTES);
  getCrypto().getRandomValues(nonce);
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    await importKey(rawKey),
    new TextEncoder().encode(value)
  );

  return [
    VERSION_PREFIX,
    bytesToBase64Url(nonce),
    bytesToBase64Url(new Uint8Array(ciphertext)),
  ].join(':');
}

export async function decryptString(rawKey: string | undefined, value: string): Promise<string> {
  const [version, nonceBase64, ciphertextBase64] = value.split(':');
  if (version !== VERSION_PREFIX || !nonceBase64 || !ciphertextBase64) {
    throw new Error('Unsupported encrypted sync value');
  }

  const plaintext = await getCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(nonceBase64) },
    await importKey(rawKey),
    base64ToBytes(ciphertextBase64)
  );

  return new TextDecoder().decode(plaintext);
}

export async function encryptNullableString(
  rawKey: string | undefined,
  value: string | null | undefined
): Promise<string | null> {
  return value == null ? null : encryptString(rawKey, value);
}

export async function decryptNullableString(
  rawKey: string | undefined,
  value: string | null | undefined
): Promise<string | null> {
  return value == null ? null : decryptString(rawKey, value);
}

export async function encryptJson(rawKey: string | undefined, value: unknown): Promise<string> {
  return encryptString(rawKey, JSON.stringify(value));
}

export async function decryptJson<T>(rawKey: string | undefined, value: string): Promise<T> {
  return JSON.parse(await decryptString(rawKey, value)) as T;
}
