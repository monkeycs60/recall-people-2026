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
const analyticsInternalBuild = process.env.EXPO_PUBLIC_POSTHOG_INTERNAL_BUILD === 'true';

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
  // Contact lifecycle (edits/deletes — creation lives in the capture funnel)
  CONTACT_EDITED: 'contact_edited',
  CONTACT_DELETED: 'contact_deleted',
  // Note lifecycle (edits/deletes — creation lives in the capture funnel)
  NOTE_EDITED: 'note_edited',
  NOTE_DELETED: 'note_deleted',
  // Groups & organisation
  GROUP_CREATED: 'group_created',
  // Hot topics (follow-up reminders surfaced from notes)
  HOT_TOPIC_RESOLVED: 'hot_topic_resolved',
  // Discovery
  SEARCH_PERFORMED: 'search_performed',
  // AI assistant
  ASSISTANT_QUESTION_ASKED: 'assistant_question_asked',
  // Icebreakers (AI-suggested conversation starters for a contact)
  ICEBREAKER_VIEWED: 'icebreaker_viewed',
  // Monetisation
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  // Notifications & reminders (all local, no server push)
  NOTIFICATION_SNOOZED: 'notification_snoozed',
  REMINDER_TIME_CHANGED: 'reminder_time_changed',
  // Post-event loop: user taps "Tell the story" on the follow-up card
  POST_EVENT_STORY_STARTED: 'post_event_story_started',
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
        // Relationship data is too sensitive for session replay. Product
        // analytics remains event-based and contains no note/contact content.
        enableSessionReplay: false,
      })
    : null;

// Tag every event with product + surface so the EU project can slice cleanly.
// Safe to register at module load since the client (if any) exists by now.
posthog?.register({
  product: 'recall',
  surface: 'mobile',
  ...(analyticsInternalBuild ? { $internal_or_test_user: true } : {}),
  // Prevent PostHog from enriching events with IP-derived location data.
  $geoip_disable: true,
});

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
    posthog?.identify(
      distinctId,
      clean({
        ...properties,
        ...(analyticsInternalBuild ? { $internal_or_test_user: true } : {}),
      }),
    );
  },
  reset(): void {
    posthog?.reset();
  },
  /** Manually report a caught error to PostHog error tracking. No-op if disabled. */
  captureException(error: unknown, properties?: Props): void {
    posthog?.captureException(error, clean(properties));
  },
};

// Error tracking (RN has no built-in JS exception autocapture toggle, so we
// wire it ourselves). Both handlers are *chained*, not replaced: we forward to
// the previous handler so we never mask React Native's own error reporting.
let errorTrackingInstalled = false;

/**
 * Install global JS error + unhandled-rejection capture that forwards to
 * PostHog. Best-effort and idempotent; entirely a no-op when analytics is
 * disabled. Call once at app startup.
 */
export function initErrorTracking(): void {
  if (errorTrackingInstalled || !posthog) return;
  errorTrackingInstalled = true;

  try {
    // Uncaught JS errors — chain onto the existing global handler.
    const errorUtils = (globalThis as { ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    } }).ErrorUtils;

    if (errorUtils?.setGlobalHandler && errorUtils.getGlobalHandler) {
      const previousHandler = errorUtils.getGlobalHandler();
      errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        try {
          posthog?.captureException(error, { is_fatal: Boolean(isFatal) });
        } catch {
          // never let reporting break the app's own crash handling
        }
        previousHandler?.(error, isFatal);
      });
    }

    // Unhandled promise rejections (Hermes exposes HermesInternal hooks; the
    // RN promise polyfill also dispatches an 'unhandledrejection' event).
    const globalAny = globalThis as unknown as {
      addEventListener?: (type: string, listener: (e: unknown) => void) => void;
    };
    globalAny.addEventListener?.('unhandledrejection', (event: unknown) => {
      const reason = (event as { reason?: unknown })?.reason ?? event;
      try {
        posthog?.captureException(reason, { unhandled_rejection: true });
      } catch {
        // best-effort
      }
    });
  } catch {
    // Never throw from error-tracking setup.
  }
}
