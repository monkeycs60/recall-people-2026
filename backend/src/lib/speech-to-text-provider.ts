import { createClient } from '@deepgram/sdk';
import Groq from 'groq-sdk';
import type { TranscriptionCreateParams } from 'groq-sdk/resources/audio/transcriptions';

/**
 * Speech-to-Text Provider configuration
 * Supports switching between different STT providers via environment variables
 */

export type STTProviderType = 'deepgram' | 'groq-whisper-v3' | 'groq-whisper-v3-turbo';

export type STTProviderConfig = {
	DEEPGRAM_API_KEY?: string;
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
	deepgram: 'nova-3',
	'groq-whisper-v3': 'whisper-large-v3',
	'groq-whisper-v3-turbo': 'whisper-large-v3-turbo',
} as const;

/**
 * Language mapping for different providers
 * Deepgram uses ISO 639-1 codes (fr, en, es, it, de)
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
 * Transcribes audio using Deepgram
 */
async function transcribeWithDeepgram(
	config: STTProviderConfig,
	audioBuffer: ArrayBuffer,
	language: string
): Promise<TranscriptionResult> {
	if (!config.DEEPGRAM_API_KEY) {
		throw new Error('DEEPGRAM_API_KEY is required when using deepgram provider');
	}

	const deepgram = createClient(config.DEEPGRAM_API_KEY);
	const mappedLanguage = LANGUAGE_MAP[language] || 'fr';

	const { result } = await deepgram.listen.prerecorded.transcribeFile(
		Buffer.from(audioBuffer),
		{
			model: PROVIDER_MODELS.deepgram,
			language: mappedLanguage,
			smart_format: true,
			punctuate: true,
		}
	);

	if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
		throw new Error('No transcription result from Deepgram');
	}

	const transcript = result.results.channels[0].alternatives[0].transcript;
	const confidence = result.results.channels[0].alternatives[0].confidence;

	return {
		transcript,
		confidence,
		duration: result.metadata?.duration,
	};
}

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
	const provider = (config.STT_PROVIDER || 'deepgram') as STTProviderType;

	switch (provider) {
		case 'groq-whisper-v3':
			return transcribeWithGroq(config, audioBuffer, language, 'whisper-large-v3');

		case 'groq-whisper-v3-turbo':
			return transcribeWithGroq(config, audioBuffer, language, 'whisper-large-v3-turbo');

		case 'deepgram':
		default:
			return transcribeWithDeepgram(config, audioBuffer, language);
	}
}

/**
 * Gets the current STT provider name
 */
export function getSTTProviderName(config: STTProviderConfig): string {
	return (config.STT_PROVIDER || 'deepgram') as STTProviderType;
}

/**
 * Gets the current STT model name
 */
export function getSTTModelName(config: STTProviderConfig): string {
	const provider = config.STT_PROVIDER || 'deepgram';
	return PROVIDER_MODELS[provider as STTProviderType];
}
