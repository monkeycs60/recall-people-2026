import { PostHog } from 'posthog-node';

/**
 * PostHog client (server-side) shared by the whole backend.
 *
 * Two responsibilities:
 *  1. LLM/AI observability — every AI call is captured as a `$ai_generation`
 *     event. For Vercel AI SDK models we wrap them with `withTracing` from
 *     `@posthog/ai/vercel` (auto-captures model/provider/tokens/latency/cost).
 *     For non-AI-SDK providers (Groq transcription, OpenAI image gen via fetch)
 *     we emit `$ai_generation` manually via `captureAiGeneration`.
 *  2. Error tracking — server exceptions are captured via `captureServerException`
 *     (used by the Hono `onError` handler and by the AI call sites' catch blocks).
 *
 * BEST EFFORT ABSOLUTE : a PostHog failure must NEVER break an AI call nor a user
 * request. Everything here is wrapped in try/catch and is a no-op when no key is
 * configured (POSTHOG_KEY missing).
 */

export type PostHogConfig = {
	POSTHOG_KEY?: string;
	POSTHOG_HOST?: string;
};

/** Common tags attached to every backend event. */
const BASE_PROPERTIES = {
	product: 'recall',
	surface: 'api',
} as const;

const DEFAULT_HOST = 'https://eu.i.posthog.com';

/**
 * Stable id used as `distinct_id` when no authenticated user is available
 * (anonymous / system AI calls). Keeps backend traces grouped together.
 */
export const BACKEND_DISTINCT_ID = 'recall-backend';

let client: PostHog | null = null;
let initialized = false;

/**
 * Initialize the shared PostHog client (idempotent).
 * No-op when POSTHOG_KEY is missing — keeps everything a safe no-op in dev.
 */
export function initPostHog(config: PostHogConfig): PostHog | null {
	if (initialized) {
		return client;
	}
	initialized = true;

	const apiKey = config.POSTHOG_KEY?.trim();
	if (!apiKey) {
		// No key → observability disabled. Never throws.
		return null;
	}

	try {
		client = new PostHog(apiKey, {
			host: config.POSTHOG_HOST?.trim() || DEFAULT_HOST,
			// Serverless-friendly: flush eagerly, we also flush per-request via waitUntil.
			flushAt: 1,
			flushInterval: 0,
		});
	} catch (error) {
		console.error('[PostHog] init failed:', error);
		client = null;
	}

	return client;
}

/** Returns the shared client, or null when disabled. */
export function getPostHog(): PostHog | null {
	return client;
}

/** True when PostHog is configured and active. */
export function isPostHogEnabled(): boolean {
	return client !== null;
}

/**
 * Flush pending events. Call from a request lifecycle hook
 * (`c.executionCtx.waitUntil(flushPostHog())`) so events leave before the
 * worker/handler terminates. Best-effort.
 */
export async function flushPostHog(): Promise<void> {
	if (!client) return;
	try {
		await client.flush();
	} catch (error) {
		console.error('[PostHog] flush failed:', error);
	}
}

/**
 * Graceful shutdown (drains the queue). Best-effort.
 */
export async function shutdownPostHog(): Promise<void> {
	if (!client) return;
	try {
		await client._shutdown();
	} catch (error) {
		console.error('[PostHog] shutdown failed:', error);
	} finally {
		client = null;
		initialized = false;
	}
}

/**
 * Capture an authoritative product event from the server.
 *
 * The mobile app is local-first and sends its own "optimistic" product events
 * (e.g. `contact_created`), but those can be lost (offline, ad-blockers,
 * app killed before flush). The sync endpoint is the single source of truth for
 * what actually lands in the database, so it emits the SAME logical events here
 * with `surface: 'api'` — these are the ones to trust for reliable counts.
 *
 * ⚠️ Content is end-to-end encrypted on the backend: NEVER pass decrypted
 * personal data in `properties`. Counters and technical ids only.
 *
 * Best-effort, never throws; no-op when PostHog is disabled.
 *
 * @param event       Event name, e.g. 'contact_created', 'note_created'.
 * @param distinctId  Authenticated user id (groups every event per user).
 * @param properties  Non-personal context (counts, entity_id, source, …).
 */
export function captureServerEvent(
	event: string,
	distinctId: string,
	properties?: Record<string, unknown>
): void {
	if (!client) return;
	try {
		client.capture({
			distinctId,
			event,
			properties: {
				...BASE_PROPERTIES,
				...properties,
			},
		});
	} catch (captureError) {
		console.error('[PostHog] captureServerEvent failed:', captureError);
	}
}

/**
 * Capture a server-side exception. Best-effort, never throws.
 * Used by the Hono `onError` handler and AI call sites.
 *
 * @param error          The thrown error/value.
 * @param distinctId     User id when available, else BACKEND_DISTINCT_ID.
 * @param properties     Extra context (route, provider, model, feature, …).
 */
export function captureServerException(
	error: unknown,
	distinctId?: string,
	properties?: Record<string, unknown>
): void {
	if (!client) return;
	try {
		client.captureException(error, distinctId || BACKEND_DISTINCT_ID, {
			...BASE_PROPERTIES,
			...properties,
		});
	} catch (captureError) {
		console.error('[PostHog] captureException failed:', captureError);
	}
}

/**
 * Properties for a manual `$ai_generation` event.
 * Mirrors what `@posthog/ai` emits automatically, for the providers we call
 * outside the Vercel AI SDK (Groq transcription, OpenAI image generation).
 *
 * See https://posthog.com/docs/ai-engineering/observability
 */
export type AiGenerationEvent = {
	distinctId?: string;
	/** Model id, e.g. 'whisper-large-v3-turbo', 'gpt-image-2'. */
	model: string;
	/** Provider, e.g. 'groq', 'openai'. */
	provider: string;
	/** Logical operation name, e.g. 'transcribe', 'avatar-image'. */
	spanName?: string;
	/** Groups inputs/outputs by a logical request. */
	traceId?: string;
	/** Input payload (kept light; redacted under privacy mode). */
	input?: unknown;
	/** Output payload. */
	output?: unknown;
	inputTokens?: number;
	outputTokens?: number;
	/** Latency in SECONDS (PostHog convention). */
	latencySeconds?: number;
	httpStatus?: number;
	baseUrl?: string;
	isError?: boolean;
	error?: unknown;
	/** Extra props merged into the event (e.g. feature, route, language). */
	extra?: Record<string, unknown>;
};

/**
 * Manually capture a `$ai_generation` event for AI calls made outside the
 * Vercel AI SDK. Best-effort, never throws.
 */
export function captureAiGeneration(event: AiGenerationEvent): void {
	if (!client) return;
	try {
		const properties: Record<string, unknown> = {
			...BASE_PROPERTIES,
			$ai_model: event.model,
			$ai_provider: event.provider,
			...(event.spanName !== undefined ? { $ai_span_name: event.spanName } : {}),
			...(event.traceId !== undefined ? { $ai_trace_id: event.traceId } : {}),
			...(event.input !== undefined ? { $ai_input: event.input } : {}),
			...(event.output !== undefined ? { $ai_output_choices: event.output } : {}),
			...(event.inputTokens !== undefined
				? { $ai_input_tokens: event.inputTokens }
				: {}),
			...(event.outputTokens !== undefined
				? { $ai_output_tokens: event.outputTokens }
				: {}),
			...(event.latencySeconds !== undefined
				? { $ai_latency: event.latencySeconds }
				: {}),
			...(event.httpStatus !== undefined
				? { $ai_http_status: event.httpStatus }
				: {}),
			...(event.baseUrl !== undefined ? { $ai_base_url: event.baseUrl } : {}),
			...(event.isError !== undefined ? { $ai_is_error: event.isError } : {}),
			...(event.error !== undefined
				? {
						$ai_error:
							event.error instanceof Error
								? event.error.message
								: String(event.error),
					}
				: {}),
			...event.extra,
		};

		client.capture({
			distinctId: event.distinctId || BACKEND_DISTINCT_ID,
			event: '$ai_generation',
			properties,
		});
	} catch (captureError) {
		console.error('[PostHog] captureAiGeneration failed:', captureError);
	}
}

/**
 * Convenience builder for the `withTracing` options passed to a Vercel AI SDK
 * model. Centralizes the base tags so call sites just provide distinctId +
 * feature-specific properties.
 */
export function aiTracingOptions(args: {
	distinctId?: string;
	traceId?: string;
	properties?: Record<string, unknown>;
	privacyMode?: boolean;
}) {
	return {
		posthogDistinctId: args.distinctId || BACKEND_DISTINCT_ID,
		...(args.traceId ? { posthogTraceId: args.traceId } : {}),
		posthogProperties: {
			...BASE_PROPERTIES,
			...args.properties,
		},
		...(args.privacyMode !== undefined
			? { posthogPrivacyMode: args.privacyMode }
			: {}),
	};
}
