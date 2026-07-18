import { importPKCS8, SignJWT } from 'jose';

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const APPLE_TOKEN_URL = `${APPLE_AUDIENCE}/auth/token`;
const APPLE_REVOKE_URL = `${APPLE_AUDIENCE}/auth/revoke`;

export type AppleAuthorizationConfig = {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
};

type AppleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class AppleAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppleAuthorizationError';
  }
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
}

export async function createAppleClientSecret(
  config: AppleAuthorizationConfig,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const signingKey = await importPKCS8(normalizePrivateKey(config.privateKey), 'ES256');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.keyId })
    .setIssuer(config.teamId)
    .setAudience(APPLE_AUDIENCE)
    .setSubject(config.clientId)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + 300)
    .sign(signingKey);
}

async function readAppleResponse(response: Response): Promise<AppleTokenResponse> {
  const payload = await response.json().catch(() => ({})) as AppleTokenResponse;
  if (!response.ok) {
    const reason = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new AppleAuthorizationError(`Apple authorization request failed: ${reason}`);
  }
  return payload;
}

export async function revokeAppleAuthorizationCode(
  authorizationCode: string,
  config: AppleAuthorizationConfig,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const clientSecret = await createAppleClientSecret(config);
  const tokenResponse = await fetchImpl(APPLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const tokens = await readAppleResponse(tokenResponse);
  const token = tokens.refresh_token || tokens.access_token;

  if (!token) {
    throw new AppleAuthorizationError('Apple token exchange returned no revocable token');
  }

  const revokeResponse = await fetchImpl(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }).toString(),
  });

  await readAppleResponse(revokeResponse);
}
