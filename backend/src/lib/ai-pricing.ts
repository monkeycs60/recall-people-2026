/**
 * Cost estimation for the AI calls we capture as `$ai_generation` MANUALLY
 * (i.e. outside the Vercel AI SDK, whose `withTracing` already computes cost).
 *
 * PostHog's LLM analytics only auto-prices models it recognizes. Groq Whisper
 * (speech-to-text) and OpenAI `gpt-image-2` (avatar image gen) are NOT
 * auto-priced, so their `$ai_total_cost_usd` stayed empty — these helpers fill
 * it in at the call sites (see routes/transcribe.ts and routes/avatar.ts).
 *
 * ⚠️ LIST PRICES captured 2026-06 — verify against the providers if costs look
 * off, and add new rows when a model / size / quality is introduced. Unknown
 * inputs return `undefined` on purpose (never guess a price).
 * Sources:
 *   - Groq Whisper (per hour of audio):  https://groq.com/pricing
 *   - OpenAI images (gpt-image-2):        https://platform.openai.com/docs/pricing
 */

// --- Groq Whisper -----------------------------------------------------------
// Billed per HOUR of audio, with a 10-second floor per ASR request.
const GROQ_WHISPER_USD_PER_HOUR: Record<string, number> = {
  'whisper-large-v3-turbo': 0.04,
  'whisper-large-v3': 0.111,
};

/** Groq bills a minimum of 10 seconds of audio per ASR request. */
const GROQ_ASR_MIN_SECONDS = 10;

/**
 * Estimated USD cost of one Groq Whisper transcription.
 * @param model            STT model id (e.g. 'whisper-large-v3-turbo').
 * @param durationSeconds  Audio length in seconds (from Whisper's verbose_json).
 *                         Missing/short durations are floored at 10s.
 * @returns USD cost, or `undefined` for an unknown model.
 */
export function whisperCostUsd(
  model: string,
  durationSeconds: number | undefined,
): number | undefined {
  const perHour = GROQ_WHISPER_USD_PER_HOUR[model];
  if (perHour === undefined) return undefined;
  const billedSeconds = Math.max(durationSeconds ?? 0, GROQ_ASR_MIN_SECONDS);
  return (billedSeconds / 3600) * perHour;
}

// --- OpenAI image generation ------------------------------------------------
// gpt-image-2 is token-based under the hood, but the cost is stable per image
// for a fixed size + quality. Keyed `model:size:quality`. (Avatars are always
// 1024x1024 / low; the other rows are list estimates for completeness.)
const OPENAI_IMAGE_USD_PER_IMAGE: Record<string, number> = {
  'gpt-image-2:1024x1024:low': 0.006,
  'gpt-image-2:1024x1024:medium': 0.053,
  'gpt-image-2:1024x1024:high': 0.211,
};

/**
 * Estimated USD cost of an OpenAI image generation.
 * @param model    Image model id (e.g. 'gpt-image-2').
 * @param size     Image size (e.g. '1024x1024').
 * @param quality  Image quality (e.g. 'low').
 * @param count    Number of images generated (default 1).
 * @returns USD cost, or `undefined` for an unknown model/size/quality.
 */
export function imageCostUsd(
  model: string,
  size: string,
  quality: string,
  count = 1,
): number | undefined {
  const unit = OPENAI_IMAGE_USD_PER_IMAGE[`${model}:${size}:${quality}`];
  if (unit === undefined) return undefined;
  return unit * count;
}
