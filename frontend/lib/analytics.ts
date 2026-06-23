// PostHog analytics for the Recall People mobile app.
//
// A single shared client instance, importable from both React components
// (indirectly, via the PostHogProvider mounted at the root) and non-React
// code (stores / services) through the exported `analytics` helpers below.
//
// Key/host come from EXPO_PUBLIC_* env vars (public, write-only project key —
// safe to ship in the client bundle). When the key is missing the client is
// not created and every helper becomes a no-op, so the app still runs.
import PostHog from 'posthog-react-native';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

// Don't send analytics from automated runs (E2E / ASO screenshots).
const analyticsDisabled =
  process.env.EXPO_PUBLIC_E2E_TEST === 'true' ||
  process.env.EXPO_PUBLIC_SCREENSHOT_MODE === 'true';

// Custom event names. Centralised so the provider, stores and services all
// reference the same strings and we avoid typos drifting across the app.
export const AnalyticsEvent = {
  // Auth lifecycle
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  // Core capture funnel
  VOICE_RECORDING_STARTED: 'voice_recording_started',
  CAPTURE_PROCESSED: 'capture_processed',
  NOTE_CREATED: 'note_created',
  CONTACT_CREATED: 'contact_created',
  REMINDER_SET: 'reminder_set',
  // AI assistant
  ASSISTANT_QUESTION_ASKED: 'assistant_question_asked',
  // Monetisation
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/**
 * The shared client. `null` when analytics is disabled or no key is set.
 * Exported so the root layout can hand it to <PostHogProvider client={...}>.
 */
export const posthog: PostHog | null =
  POSTHOG_KEY && !analyticsDisabled
    ? new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        // PostHog RN handles app lifecycle + screen tracking; we enable
        // session replay here and rely on PostHogProvider for autocapture.
        enableSessionReplay: true,
        sessionReplayConfig: {
          // The app holds personal data about the user's contacts. Be
          // conservative: mask every text + text input and all images so no
          // names / phone numbers / notes leak into replays.
          maskAllTextInputs: true,
          maskAllImages: true,
          // Slightly longer throttle to reduce overhead on lower-end devices.
          androidDebouncerDelayMs: 1000,
          iOSdebouncerDelayMs: 1000,
        },
      })
    : null;

// Tag every event with product + surface so the EU project can slice cleanly.
// Safe to register at module load since the client (if any) exists by now.
posthog?.register({ product: 'recall', surface: 'mobile' });

// Property values must be JSON-serialisable for PostHog. Callers may pass
// `undefined` (e.g. an optional user field); those keys are stripped below.
type PropValue = string | number | boolean | null | undefined;
type Props = Record<string, PropValue | PropValue[]>;
type CleanProps = Record<string, string | number | boolean | null | (string | number | boolean | null)[]>;

// Drop undefined values so the payload matches PostHog's JSON-only type.
const clean = (props?: Props): CleanProps | undefined => {
  if (!props) return undefined;
  const out: CleanProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) out[key] = value as CleanProps[string];
  }
  return out;
};

/**
 * Thin, null-safe wrappers so callers never have to null-check the client.
 */
export const analytics = {
  capture(event: AnalyticsEventName, properties?: Props): void {
    posthog?.capture(event, clean(properties));
  },
  identify(distinctId: string, properties?: Props): void {
    posthog?.identify(distinctId, clean(properties));
  },
  reset(): void {
    posthog?.reset();
  },
};
