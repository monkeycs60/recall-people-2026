import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'apple-authorization';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/apple-authorization.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      packages: 'external',
    },
  });
}

function createConfig() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return {
    teamId: 'TEAM123456',
    keyId: 'KEY1234567',
    clientId: 'com.example.recall',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

function decodeJwtPart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

test('creates a short-lived Apple client secret with the expected claims', async () => {
  const { createAppleClientSecret } = await loadModule();
  const config = createConfig();
  const now = 1_786_000_000;

  const secret = await createAppleClientSecret(config, now);
  const [encodedHeader, encodedPayload] = secret.split('.');
  const protectedHeader = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);

  assert.deepEqual(protectedHeader, { alg: 'ES256', kid: config.keyId });
  assert.equal(payload.iss, config.teamId);
  assert.equal(payload.sub, config.clientId);
  assert.equal(payload.aud, 'https://appleid.apple.com');
  assert.equal(payload.iat, now);
  assert.equal(payload.exp, now + 300);
});

test('exchanges a fresh authorization code and revokes the returned refresh token', async () => {
  const { revokeAppleAuthorizationCode } = await loadModule();
  const requests = [];
  const fakeFetch = async (url, init) => {
    requests.push({ url: String(url), init });
    if (requests.length === 1) {
      return new Response(JSON.stringify({ refresh_token: 'refresh-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await revokeAppleAuthorizationCode('fresh-code', createConfig(), fakeFetch);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://appleid.apple.com/auth/token');
  assert.equal(requests[1].url, 'https://appleid.apple.com/auth/revoke');

  const exchangeBody = new URLSearchParams(requests[0].init.body);
  assert.equal(exchangeBody.get('code'), 'fresh-code');
  assert.equal(exchangeBody.get('grant_type'), 'authorization_code');

  const revokeBody = new URLSearchParams(requests[1].init.body);
  assert.equal(revokeBody.get('token'), 'refresh-token');
  assert.equal(revokeBody.get('token_type_hint'), 'refresh_token');
  assert.ok(revokeBody.get('client_secret'));
});

test('fails closed when Apple does not return a revocable token', async () => {
  const { revokeAppleAuthorizationCode } = await loadModule();
  const fakeFetch = async () => new Response('{}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    revokeAppleAuthorizationCode('fresh-code', createConfig(), fakeFetch),
    /returned no revocable token/,
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
