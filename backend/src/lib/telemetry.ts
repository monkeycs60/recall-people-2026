import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { trace } from '@opentelemetry/api';

/**
 * LangFuse Observability Setup for Cloudflare Workers
 *
 * This module initializes OpenTelemetry with LangFuse for LLM observability.
 * It tracks all AI calls, costs, latency, and quality metrics.
 */

export type TelemetryConfig = {
	LANGFUSE_SECRET_KEY?: string;
	LANGFUSE_PUBLIC_KEY?: string;
	LANGFUSE_BASE_URL?: string;
	ENABLE_LANGFUSE?: string; // 'true' or 'false'
};

let langfuseSpanProcessor: LangfuseSpanProcessor | null = null;
let isInitialized = false;

/**
 * Initialize LangFuse telemetry
 * Call this once at application startup
 */
export function initializeLangfuse(config: TelemetryConfig) {
	// Skip if already initialized or disabled
	if (isInitialized || config.ENABLE_LANGFUSE !== 'true') {
		return null;
	}

	// Validate required credentials
	if (!config.LANGFUSE_SECRET_KEY || !config.LANGFUSE_PUBLIC_KEY) {
		console.warn('LangFuse credentials missing. Observability disabled.');
		return null;
	}

	try {
		// Create LangFuse span processor
		langfuseSpanProcessor = new LangfuseSpanProcessor({
			secretKey: config.LANGFUSE_SECRET_KEY,
			publicKey: config.LANGFUSE_PUBLIC_KEY,
			baseUrl: config.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
		});

		// Set up OpenTelemetry tracer provider with LangFuse span processor
		const tracerProvider = new NodeTracerProvider({
			spanProcessors: [langfuseSpanProcessor],
		});
		tracerProvider.register();

		isInitialized = true;
		console.log('✅ LangFuse observability initialized');

		return langfuseSpanProcessor;
	} catch (error) {
		console.error('Failed to initialize LangFuse:', error);
		return null;
	}
}

/**
 * Get the LangFuse span processor instance
 * Used to flush traces in serverless environments
 */
export function getLangfuseSpanProcessor() {
	return langfuseSpanProcessor;
}

/**
 * Flush pending traces to LangFuse
 * CRITICAL for Cloudflare Workers to ensure traces are sent before worker terminates
 *
 * @returns Promise that resolves when flush completes
 */
export async function flushLangfuse(): Promise<void> {
	if (!langfuseSpanProcessor) {
		return;
	}

	try {
		await langfuseSpanProcessor.forceFlush();
	} catch (error) {
		console.error('Failed to flush LangFuse traces:', error);
	}
}

/**
 * Get the current tracer instance
 */
export function getTracer() {
	return trace.getTracer('recall-people-api');
}

/**
 * Check if LangFuse is enabled and initialized
 */
export function isLangfuseEnabled(): boolean {
	return isInitialized && langfuseSpanProcessor !== null;
}
