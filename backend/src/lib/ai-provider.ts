import { createXai } from '@ai-sdk/xai';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenAI } from '@ai-sdk/openai';
import { withTracing } from '@posthog/ai/vercel';
import { getPostHog, aiTracingOptions, BACKEND_DISTINCT_ID } from './posthog';

/**
 * AI Provider configuration
 * Supports switching between different AI providers via environment variables
 *
 * AI Provider configuration:
 * - Primary provider: Cerebras gpt-oss-120b
 * - OpenAI is reserved for avatar image generation in avatar-image.ts
 * - xAI and OpenAI text providers remain available behind explicit configuration
 */

export type AIProviderType = 'openai' | 'grok' | 'cerebras';

export type AIProviderConfig = {
	OPENAI_API_KEY?: string;
	XAI_API_KEY?: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: AIProviderType;
	ENABLE_PERFORMANCE_LOGGING?: boolean;
};

/**
 * Model configuration for each provider
 *
 * Text model configuration for each provider.
 */
const PROVIDER_MODELS = {
	openai: 'gpt-5-mini',
	grok: 'grok-4-1-fast',
	cerebras: 'gpt-oss-120b',
} as const;

/**
 * Creates an AI provider instance based on environment configuration
 * @param config - Provider configuration including API keys
 * @returns An AI provider instance (cerebras, openai, or xai)
 *
 * DEFAULT PROVIDER: Cerebras
 * - Defaults to Cerebras gpt-oss-120b if AI_PROVIDER is not set
 * - Set AI_PROVIDER explicitly in production to avoid ambiguous disclosures
 */
export function createAIProvider(config: AIProviderConfig) {
	const provider = (config.AI_PROVIDER || 'cerebras') as AIProviderType;

	switch (provider) {
		case 'openai': {
			if (!config.OPENAI_API_KEY) {
				throw new Error('OPENAI_API_KEY is required when using openai provider');
			}
			return createOpenAI({
				apiKey: config.OPENAI_API_KEY,
				
			});
		}
		case 'cerebras': {
			if (!config.CEREBRAS_API_KEY) {
				throw new Error('CEREBRAS_API_KEY is required when using cerebras provider');
			}
			return createCerebras({
				apiKey: config.CEREBRAS_API_KEY,
			});
		}
		case 'grok':
		default: {
			if (!config.XAI_API_KEY) {
				throw new Error('XAI_API_KEY is required when using grok provider');
			}
			return createXai({
				apiKey: config.XAI_API_KEY,
			});
		}
	}
}

/**
 * Gets the model name for the current provider
 * @param config - Provider configuration
 * @returns The model name to use
 */
export function getAIModel(config: AIProviderConfig) {
	const provider = (config.AI_PROVIDER || 'cerebras') as AIProviderType;
	return PROVIDER_MODELS[provider];
}

/**
 * Helper function to create an AI model instance ready for use
 * @param config - Provider configuration including API keys
 * @returns A configured AI model
 */
export function createAIModel(config: AIProviderConfig) {
	const provider = createAIProvider(config);
	const model = getAIModel(config);
	return provider(model);
}

/**
 * Options for PostHog LLM observability tracing.
 * Passed by route handlers so each $ai_generation carries the right
 * distinct_id (user) + feature/route context.
 */
export type AITracingContext = {
	/** User id when available, else a stable backend id is used. */
	distinctId?: string;
	/** Groups inputs/outputs of a multi-step request under one trace. */
	traceId?: string;
	/** Feature-specific props, e.g. { feature: 'ask', route: '/api/ask' }. */
	properties?: Record<string, unknown>;
};

/**
 * Create an AI model wrapped with PostHog observability.
 *
 * Same as {@link createAIModel} but the returned model auto-captures a
 * `$ai_generation` event (model, provider, tokens, latency, cost, input,
 * output, errors) on every call through the Vercel AI SDK.
 *
 * BEST EFFORT : if PostHog is not configured the model is returned untouched,
 * and any tracing failure must never break the underlying AI call.
 */
export function createTracedAIModel(
	config: AIProviderConfig,
	tracing: AITracingContext = {}
) {
	const model = createAIModel(config);

	const phClient = getPostHog();
	if (!phClient) {
		return model;
	}

	try {
		return withTracing(
			model,
			phClient,
			aiTracingOptions({
				distinctId: tracing.distinctId || BACKEND_DISTINCT_ID,
				traceId: tracing.traceId,
				properties: {
					$ai_provider: getAIProviderName(config),
					...tracing.properties,
				},
			})
		);
	} catch (error) {
		console.error('[PostHog] withTracing failed, falling back to untraced model:', error);
		return model;
	}
}

/**
 * Get telemetry options for AI SDK calls
 * @param config - Provider configuration
 * @returns Telemetry options object or undefined
 */
export function getTelemetryOptions(_config: AIProviderConfig) {
	// Content-bearing AI SDK telemetry is intentionally disabled. PostHog's
	// privacy-mode tracing retains operational metrics without prompts/outputs.
	return {};
}

/**
 * Get the current provider name (for logging)
 */
export function getAIProviderName(config: AIProviderConfig): string {
	return (config.AI_PROVIDER || 'cerebras') as AIProviderType;
}

/**
 * Helper function to get recommended settings for Structured Outputs
 * Use this when calling generateText() with Output.object() and OpenAI provider
 *
 * @returns Recommended settings for deterministic, structured outputs
 *
 * @example
 * ```typescript
 * const { output } = await generateText({
 *   model,
 *   output: Output.object({ schema: myZodSchema }),
 *   prompt: '...',
 *   ...getStructuredOutputSettings() // Add temperature: 0
 * });
 * ```
 */
export function getStructuredOutputSettings() {
	return {
		temperature: 0, // Deterministic outputs for consistent schema compliance
	};
}
