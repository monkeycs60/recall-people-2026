import { createXai } from '@ai-sdk/xai';
import { createCerebras } from '@ai-sdk/cerebras';

/**
 * AI Provider configuration
 * Supports switching between different AI providers via environment variables
 */

export type AIProviderType = 'grok' | 'cerebras';

export type AIProviderConfig = {
	XAI_API_KEY?: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: AIProviderType;
};

/**
 * Model configuration for each provider
 */
const PROVIDER_MODELS = {
	grok: 'grok-4-1-fast',
	cerebras: 'gpt-oss-120b',
} as const;

/**
 * Creates an AI provider instance based on environment configuration
 * @param config - Provider configuration including API keys
 * @returns An AI provider instance (xai or cerebras)
 */
export function createAIProvider(config: AIProviderConfig) {
	const provider = (config.AI_PROVIDER || 'grok') as AIProviderType;

	switch (provider) {
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
	const provider = (config.AI_PROVIDER || 'grok') as AIProviderType;
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
