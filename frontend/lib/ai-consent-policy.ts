export const AI_CONSENT_VERSION = '2026-07-17';

export type AIConsentStatus = 'pending' | 'accepted' | 'declined';

const AI_ENDPOINTS = new Set([
  '/api/ask',
  '/api/detect-contact',
  '/api/extract',
  '/api/search',
  '/api/similarity/batch',
  '/api/summary',
  '/api/suggested-questions',
  '/api/transcribe',
  '/api/seed/generate',
]);

const AI_ENDPOINT_PREFIXES = [
  '/api/avatar/generate',
  '/api/avatar/user/generate',
];

export function endpointRequiresAIConsent(endpoint: string): boolean {
  return AI_ENDPOINTS.has(endpoint) || AI_ENDPOINT_PREFIXES.some((prefix) => endpoint.startsWith(prefix));
}
