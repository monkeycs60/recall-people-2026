import Groq from 'groq-sdk';
import type { TranscriptionCreateParams } from 'groq-sdk/resources/audio/transcriptions';

/**
 * Speech-to-Text Provider configuration
 * Supports switching between different STT providers via environment variables
 */

export type STTProviderType = 'groq-whisper-v3' | 'groq-whisper-v3-turbo';

export type STTProviderConfig = {
	GROQ_API_KEY?: string;
	STT_PROVIDER?: STTProviderType;
	ENABLE_PERFORMANCE_LOGGING?: boolean;
};

export type TranscriptionResult = {
	transcript: string;
	confidence?: number;
	duration?: number;
};

/**
 * Model configuration for each provider
 */
const PROVIDER_MODELS = {
	'groq-whisper-v3': 'whisper-large-v3',
	'groq-whisper-v3-turbo': 'whisper-large-v3-turbo',
} as const;

const DEFAULT_STT_PROVIDER: STTProviderType = 'groq-whisper-v3-turbo';

function resolveSTTProvider(provider: string | undefined): STTProviderType {
	if (provider === 'groq-whisper-v3' || provider === 'groq-whisper-v3-turbo') {
		return provider;
	}

	return DEFAULT_STT_PROVIDER;
}

/**
 * Language mapping for different providers
 * Groq Whisper uses the same format
 */
const LANGUAGE_MAP: Record<string, string> = {
	fr: 'fr',
	en: 'en',
	es: 'es',
	it: 'it',
	de: 'de',
};

/**
 * Transcribes audio using Groq Whisper
 */
async function transcribeWithGroq(
	config: STTProviderConfig,
	audioBuffer: ArrayBuffer,
	language: string,
	model: 'whisper-large-v3' | 'whisper-large-v3-turbo'
): Promise<TranscriptionResult> {
	if (!config.GROQ_API_KEY) {
		throw new Error('GROQ_API_KEY is required when using groq provider');
	}

	const groq = new Groq({
		apiKey: config.GROQ_API_KEY,
	});

	const mappedLanguage = LANGUAGE_MAP[language] || 'fr';

	// Convert ArrayBuffer to File-like object
	const blob = new Blob([audioBuffer], { type: 'audio/webm' });
	const file = new File([blob], 'audio.webm', { type: 'audio/webm' });

	const transcriptionParams: TranscriptionCreateParams = {
		file: file,
		model: model,
		language: mappedLanguage,
		response_format: 'verbose_json',
	};

	const transcription = await groq.audio.transcriptions.create(transcriptionParams);

	// Groq's verbose_json format includes duration and segments
	// @ts-ignore - verbose_json has these fields but types might not reflect it
	const duration = transcription.duration;

	return {
		transcript: transcription.text,
		duration,
	};
}

/**
 * Transcribes audio using the configured provider
 * @param config - Provider configuration including API keys
 * @param audioBuffer - Audio data as ArrayBuffer
 * @param language - Language code (fr, en, es, it, de)
 * @returns Transcription result with transcript, confidence, and duration
 */
export async function transcribeAudio(
	config: STTProviderConfig,
	audioBuffer: ArrayBuffer,
	language: string = 'fr'
): Promise<TranscriptionResult> {
	const provider = resolveSTTProvider(config.STT_PROVIDER);

	switch (provider) {
		case 'groq-whisper-v3':
			return transcribeWithGroq(config, audioBuffer, language, 'whisper-large-v3');

		case 'groq-whisper-v3-turbo':
		default:
			return transcribeWithGroq(config, audioBuffer, language, 'whisper-large-v3-turbo');
	}
}

/**
 * Gets the current STT provider name
 */
export function getSTTProviderName(config: STTProviderConfig): string {
	return resolveSTTProvider(config.STT_PROVIDER);
}

/**
 * Gets the current STT model name
 */
export function getSTTModelName(config: STTProviderConfig): string {
	return PROVIDER_MODELS[resolveSTTProvider(config.STT_PROVIDER)];
}
