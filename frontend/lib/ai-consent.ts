import { AI_CONSENT_VERSION } from '@/lib/ai-consent-policy';
import { useSettingsStore } from '@/stores/settings-store';

export class AIConsentRequiredError extends Error {
  constructor() {
    super('AI action cancelled before consent was granted');
    this.name = 'AIConsentRequiredError';
  }
}

let pendingDecision: Promise<boolean> | null = null;
let settlePendingDecision: ((accepted: boolean) => void) | null = null;

const waitForAIConsentDecision = (): Promise<boolean> => {
  if (!pendingDecision) {
    pendingDecision = new Promise<boolean>((resolve) => {
      settlePendingDecision = resolve;
    });
  }

  return pendingDecision;
};

export function resolveAIConsentRequest(accepted: boolean): void {
  const settle = settlePendingDecision;
  pendingDecision = null;
  settlePendingDecision = null;
  settle?.(accepted);
}

export function isAIConsentRequiredError(error: unknown): error is AIConsentRequiredError {
  return error instanceof Error && error.name === 'AIConsentRequiredError';
}

export async function requireAIConsent(): Promise<void> {
  const state = useSettingsStore.getState();
  const isCurrentConsent =
    state.hasAcceptedAIConsent && state.aiConsentVersion === AI_CONSENT_VERSION;

  if (isCurrentConsent) return;

  state.requestAIConsent();
  const accepted = await waitForAIConsentDecision();
  if (!accepted) throw new AIConsentRequiredError();
}
