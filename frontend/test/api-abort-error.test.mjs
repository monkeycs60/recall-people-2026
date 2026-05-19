import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'api-abort-error';

const stubPlugin = {
  name: 'api-test-stubs',
  setup(build) {
    const stubs = new Map([
      ['expo-file-system/legacy', 'export const getInfoAsync = async () => ({ exists: true });'],
      ['./auth', 'export const getToken = async () => null; export const refreshAccessToken = async () => false;'],
      ['@/stores/settings-store', 'export const useSettingsStore = { getState: () => ({ language: "en" }) };'],
      ['./config', 'export const API_URL = "http://localhost";'],
      ['@/lib/config', 'export const API_URL = "http://localhost";'],
      ['./error-handler', `
        export class ApiError extends Error {
          constructor(message, status, backendMessage) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.backendMessage = backendMessage;
          }
        }
        export class NetworkError extends Error {
          constructor(message = 'Network error') {
            super(message);
            this.name = 'NetworkError';
          }
        }
        export function showApiError() {}
      `],
      ['@/lib/error-handler', `
        export class ApiError extends Error {
          constructor(message, status, backendMessage) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.backendMessage = backendMessage;
          }
        }
        export class NetworkError extends Error {
          constructor(message = 'Network error') {
            super(message);
            this.name = 'NetworkError';
          }
        }
        export function showApiError() {}
      `],
    ]);

    for (const specifier of stubs.keys()) {
      build.onResolve({ filter: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }, () => ({
        path: specifier,
        namespace: 'api-test-stub',
      }));
    }

    build.onResolve({ filter: /^@\/types$/ }, () => ({
      path: '@/types',
      namespace: 'api-test-stub',
    }));

    build.onLoad({ filter: /.*/, namespace: 'api-test-stub' }, (args) => ({
      contents: stubs.get(args.path) ?? 'export {};',
      loader: 'js',
    }));
  },
};

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/api.ts',
    suiteName,
    esbuildOptions: {
      plugins: [stubPlugin],
    },
  });
}

test('detects abort errors when DOMException is unavailable in Hermes', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'DOMException');

  try {
    Object.defineProperty(globalThis, 'DOMException', {
      configurable: true,
      value: undefined,
    });

    const { isAbortError } = await loadModule();

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    assert.equal(isAbortError(abortError), true);
    assert.equal(isAbortError(new TypeError('Network request failed')), false);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'DOMException', descriptor);
    } else {
      delete globalThis.DOMException;
    }
  }
});

test('detects native DOMException aborts when available', async () => {
  const { isAbortError } = await loadModule();

  assert.equal(isAbortError(new DOMException('The operation was aborted.', 'AbortError')), true);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
