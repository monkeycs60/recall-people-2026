import { Langfuse } from 'langfuse';

/**
 * LangFuse Observability Setup for Cloudflare Workers
 *
 * This module uses the Langfuse SDK directly (not OpenTelemetry)
 * to be compatible with Cloudflare Workers edge runtime.
 */

export type TelemetryConfig = {
	LANGFUSE_SECRET_KEY?: string;
	LANGFUSE_PUBLIC_KEY?: string;
	LANGFUSE_BASE_URL?: string;
	ENABLE_LANGFUSE?: string; // 'true' or 'false'
};

let langfuseClient: Langfuse | null = null;
let isInitialized = false;

/**
 * Initialize LangFuse telemetry
 * Call this once at application startup
 */
export function initializeLangfuse(config: TelemetryConfig): Langfuse | null {
	// Skip if already initialized or disabled
	if (isInitialized || config.ENABLE_LANGFUSE !== 'true') {
		return langfuseClient;
	}

	// Validate required credentials
	if (!config.LANGFUSE_SECRET_KEY || !config.LANGFUSE_PUBLIC_KEY) {
		console.warn('LangFuse credentials missing. Observability disabled.');
		return null;
	}

	try {
		langfuseClient = new Langfuse({
			secretKey: config.LANGFUSE_SECRET_KEY,
			publicKey: config.LANGFUSE_PUBLIC_KEY,
			baseUrl: config.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
			flushAt: 1, // Flush immediately for serverless
			flushInterval: 0, // Disable interval-based flushing
		});

		isInitialized = true;
		console.log('✅ LangFuse observability initialized');

		return langfuseClient;
	} catch (error) {
		console.error('Failed to initialize LangFuse:', error);
		return null;
	}
}

/**
 * Get the LangFuse client instance
 */
export function getLangfuseClient(): Langfuse | null {
	return langfuseClient;
}

/**
 * Flush pending traces to LangFuse
 * CRITICAL for Cloudflare Workers to ensure traces are sent before worker terminates
 *
 * @returns Promise that resolves when flush completes
 */
export async function flushLangfuse(): Promise<void> {
	if (!langfuseClient) {
		return;
	}

	try {
		await langfuseClient.flushAsync();
	} catch (error) {
		console.error('Failed to flush LangFuse traces:', error);
	}
}

/**
 * Shutdown LangFuse client gracefully
 */
export async function shutdownLangfuse(): Promise<void> {
	if (!langfuseClient) {
		return;
	}

	try {
		await langfuseClient.shutdownAsync();
		langfuseClient = null;
		isInitialized = false;
	} catch (error) {
		console.error('Failed to shutdown LangFuse:', error);
	}
}

/**
 * Check if LangFuse is enabled and initialized
 */
export function isLangfuseEnabled(): boolean {
	return isInitialized && langfuseClient !== null;
}
