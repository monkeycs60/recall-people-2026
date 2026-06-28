import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'public-url';

async function loadModule() {
  return loadTsModule({ entryPoint: 'src/lib/public-url.ts', suiteName });
}

test.after(() => cleanTsModule(suiteName));

// THE BUG: Node behind a TLS-terminating proxy (Coolify/Traefik) receives plain
// HTTP, so new URL(c.req.url).protocol is 'http:'. Avatar URLs built from it come
// out as http:// and get blocked by iOS ATS / Android cleartext on release builds.
// The fix must honor X-Forwarded-Proto (set by the proxy).

test('uses X-Forwarded-Proto over the request protocol (the prod bug fix)', async () => {
  const { resolvePublicBaseUrl } = await loadModule();
  const base = resolvePublicBaseUrl({
    requestUrl: 'http://api.recallpeople.com/api/avatar/generate',
    forwardedProto: 'https',
  });
  assert.equal(base, 'https://api.recallpeople.com');
});

test('takes the first value when X-Forwarded-Proto is a comma list', async () => {
  const { resolvePublicBaseUrl } = await loadModule();
  const base = resolvePublicBaseUrl({
    requestUrl: 'http://api.recallpeople.com/x',
    forwardedProto: 'https, http',
  });
  assert.equal(base, 'https://api.recallpeople.com');
});

test('falls back to the request protocol in dev (no proxy header)', async () => {
  const { resolvePublicBaseUrl } = await loadModule();
  const base = resolvePublicBaseUrl({
    requestUrl: 'http://10.0.2.2:8787/api/avatar/generate',
    forwardedProto: undefined,
  });
  assert.equal(base, 'http://10.0.2.2:8787');
});

test('an explicit configured base URL wins and trailing slashes are stripped', async () => {
  const { resolvePublicBaseUrl } = await loadModule();
  const base = resolvePublicBaseUrl({
    requestUrl: 'http://api.recallpeople.com/x',
    forwardedProto: 'http',
    configuredBaseUrl: 'https://cdn.recallpeople.com/',
  });
  assert.equal(base, 'https://cdn.recallpeople.com');
});

test('a blank configured base URL is ignored', async () => {
  const { resolvePublicBaseUrl } = await loadModule();
  const base = resolvePublicBaseUrl({
    requestUrl: 'http://api.recallpeople.com/x',
    forwardedProto: 'https',
    configuredBaseUrl: '   ',
  });
  assert.equal(base, 'https://api.recallpeople.com');
});
