import { createXai } from '@ai-sdk/xai';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * AI Provider configuration
 * Supports switching between different AI providers via environment variables
 *
 * MIGRATION TO OPENAI (Redesign V2):
 * - Primary provider: OpenAI GPT-5 mini with Structured Outputs
 * - Structured Outputs guarantee 100% schema compliance (no parsing errors)
 * - Use temperature: 0 for deterministic outputs
 * - Fallback providers: xAI (Grok) and Cerebras remain available
 */

export type AIProviderType = 'openai' | 'grok' | 'cerebras';

export type AIProviderConfig = {
	OPENAI_API_KEY?: string;
	XAI_API_KEY?: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: AIProviderType;
	ENABLE_PERFORMANCE_LOGGING?: boolean;
	ENABLE_LANGFUSE?: string; // 'true' or 'false'
};

/**
 * Model configuration for each provider
 *
 * OpenAI GPT-5 mini:
 * - Recommended for extraction tasks (review flow)
 * - Supports Structured Outputs with Zod schemas
 * - Best quality/price ratio for structured data extraction
 */
const PROVIDER_MODELS = {
	openai: 'gpt-5-mini',
	grok: 'grok-4-1-fast',
	cerebras: 'gpt-oss-120b',
} as const;

/**
 * Llama 3.1 8B model for lightweight tasks like summary generation
 */
const LLAMA_8B_MODEL = 'llama-3.1-8b';

/**
 * Creates a Cerebras Llama 3.1 8B model for lightweight tasks
 * @param apiKey - Cerebras API key
 * @returns A configured Llama 3.1 8B model
 */
export function createLlama8BModel(apiKey: string) {
	const cerebras = createCerebras({ apiKey });
	return cerebras(LLAMA_8B_MODEL);
}

/**
 * Creates an AI provider instance based on environment configuration
 * @param config - Provider configuration including API keys
 * @returns An AI provider instance (openai, xai, or cerebras)
 *
 * DEFAULT PROVIDER: OpenAI (Redesign V2)
 * - Defaults to OpenAI GPT-5 mini if AI_PROVIDER is not set
 * - Falls back to xAI (Grok) or Cerebras if OpenAI key is missing
 */
export function createAIProvider(config: AIProviderConfig) {
	const provider = (config.AI_PROVIDER || 'openai') as AIProviderType;

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
	const provider = (config.AI_PROVIDER || 'openai') as AIProviderType;
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
 * Get telemetry options for AI SDK calls
 * @param config - Provider configuration
 * @returns Telemetry options object or undefined
 */
export function getTelemetryOptions(config: AIProviderConfig) {
	if (config.ENABLE_LANGFUSE === 'true') {
		return {
			experimental_telemetry: {
				isEnabled: true,
			},
		};
	}
	return {};
}

/**
 * Get the current provider name (for logging)
 */
export function getAIProviderName(config: AIProviderConfig): string {
	return (config.AI_PROVIDER || 'openai') as AIProviderType;
}

/**
 * Helper function to get recommended settings for Structured Outputs
 * Use this when calling generateObject() with OpenAI provider
 *
 * @returns Recommended settings for deterministic, structured outputs
 *
 * @example
 * ```typescript
 * const { object } = await generateObject({
 *   model,
 *   schema: myZodSchema,
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
