import { Context, Next } from 'hono';
import { initPostHog, flushPostHog, isPostHogEnabled } from '../lib/posthog';

/**
 * PostHog middleware (server-side observability + error tracking).
 *
 * Serverless observability middleware:
 *  1. Initializes the shared PostHog client on first request (reads
 *     POSTHOG_KEY / POSTHOG_HOST from the request env / process.env).
 *  2. Flushes pending events after each request via `executionCtx.waitUntil`
 *     so AI/exception events leave before the handler terminates.
 *
 * Best-effort: never blocks the response, never throws.
 */

let initialized = false;

export async function posthogMiddleware(c: Context, next: Next) {
	if (!initialized) {
		initPostHog({
			POSTHOG_KEY: c.env.POSTHOG_KEY,
			POSTHOG_HOST: c.env.POSTHOG_HOST,
		});
		initialized = true;
	}

	await next();

	if (isPostHogEnabled() && c.executionCtx) {
		c.executionCtx.waitUntil(flushPostHog());
	}
}
