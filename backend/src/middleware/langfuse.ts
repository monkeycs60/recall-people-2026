import { Context, Next } from 'hono';
import { initializeLangfuse, flushLangfuse, isLangfuseEnabled } from '../lib/telemetry';

/**
 * LangFuse Middleware for Cloudflare Workers
 *
 * This middleware:
 * 1. Initializes LangFuse on first request
 * 2. Flushes traces after each request using executionCtx.waitUntil
 *
 * CRITICAL for serverless environments to ensure traces are sent before worker terminates
 */

let initialized = false;

export async function langfuseMiddleware(c: Context, next: Next) {
	// Initialize LangFuse on first request
	if (!initialized) {
		initializeLangfuse({
			LANGFUSE_SECRET_KEY: c.env.LANGFUSE_SECRET_KEY,
			LANGFUSE_PUBLIC_KEY: c.env.LANGFUSE_PUBLIC_KEY,
			LANGFUSE_BASE_URL: c.env.LANGFUSE_BASE_URL,
			ENABLE_LANGFUSE: c.env.ENABLE_LANGFUSE,
		});
		initialized = true;
	}

	// Process the request
	await next();

	// Flush traces in background (don't block response)
	// executionCtx.waitUntil ensures traces are sent even after response is returned
	if (isLangfuseEnabled() && c.executionCtx) {
		c.executionCtx.waitUntil(flushLangfuse());
	}
}
