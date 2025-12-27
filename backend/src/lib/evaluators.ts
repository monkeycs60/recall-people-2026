import { generateObject } from 'ai';
import { z } from 'zod';
import { createXai } from '@ai-sdk/xai';

/**
 * LLM-as-a-Judge Evaluators for Quality Measurement
 *
 * These evaluators use cheap, fast LLMs (like Grok 4.1 Fast) to automatically
 * evaluate the quality of AI outputs. They're designed to be cost-effective
 * with sampling strategies to reduce evaluation costs.
 */

/**
 * Evaluation result schema
 */
const evaluationSchema = z.object({
	score: z.number().min(0).max(10).describe('Quality score from 0-10'),
	reasoning: z
		.string()
		.describe('Brief explanation of the score (max 200 chars)'),
	issues: z
		.array(z.string())
		.describe('List of specific issues found (if any)'),
	strengths: z
		.array(z.string())
		.describe('List of specific strengths found (if any)'),
});

export type EvaluationResult = z.infer<typeof evaluationSchema>;

/**
 * Configuration for evaluators
 */
export type EvaluatorConfig = {
	XAI_API_KEY: string;
	samplingRate?: number; // 0-1, default 0.25 (25%)
	enableEvaluation?: boolean; // default false
};

/**
 * Check if we should evaluate this request based on sampling rate
 * @param samplingRate - Probability of evaluation (0-1)
 * @returns true if we should evaluate
 */
function shouldEvaluate(samplingRate: number = 0.25): boolean {
	return Math.random() < samplingRate;
}

/**
 * Evaluate extraction quality: Does the extracted data match the transcription?
 *
 * Measures:
 * - Completeness: All mentioned contacts are extracted
 * - Accuracy: Extracted info is correct
 * - No hallucinations: Nothing invented
 * - Context preservation: Relationships and notes are preserved
 *
 * @param transcription - Original transcription
 * @param extraction - AI-generated extraction
 * @param config - Evaluator configuration
 * @returns Evaluation result or null if skipped
 */
export async function evaluateExtraction(
	transcription: string,
	extraction: object,
	config: EvaluatorConfig
): Promise<EvaluationResult | null> {
	// Skip if evaluation is disabled
	if (!config.enableEvaluation) {
		return null;
	}

	// Apply sampling to reduce costs (default 25%)
	if (!shouldEvaluate(config.samplingRate)) {
		return null;
	}

	try {
		// Use Grok 4.1 Fast (very cheap) for evaluation
		const grok = createXai({
			apiKey: config.XAI_API_KEY,
		});

		const evaluatorModel = grok('grok-4-1-fast');

		const prompt = `Tu es un évaluateur de qualité pour un système d'extraction d'informations.

Ta tâche : Évaluer si l'extraction JSON correspond fidèlement à la transcription audio.

TRANSCRIPTION ORIGINALE:
${transcription}

EXTRACTION GÉNÉRÉE:
${JSON.stringify(extraction, null, 2)}

Évalue la qualité selon ces critères:
1. COMPLÉTUDE: Tous les contacts mentionnés sont extraits?
2. EXACTITUDE: Les informations extraites sont correctes?
3. PAS D'HALLUCINATIONS: Rien n'a été inventé?
4. CONTEXTE PRÉSERVÉ: Les relations et notes sont bien capturées?

Donne un score de 0 à 10:
- 10: Parfait, extraction fidèle à 100%
- 7-9: Très bon, quelques détails manquants
- 4-6: Moyen, erreurs ou omissions importantes
- 0-3: Mauvais, hallucinations ou infos incorrectes

Sois strict et objectif.`;

		const { object: evaluation } = await generateObject({
			model: evaluatorModel,
			schema: evaluationSchema,
			prompt,
		});

		return evaluation;
	} catch (error) {
		console.error('Evaluation failed:', error);
		return null;
	}
}

/**
 * Evaluate summary quality: Is the summary helpful and accurate?
 *
 * Measures:
 * - Relevance: Summary captures key points
 * - Conciseness: Not too long, not too short
 * - Accuracy: No false information
 * - Usefulness: Helps understand the contact
 *
 * @param contactData - Original contact data (facts, hot topics)
 * @param summary - AI-generated summary
 * @param config - Evaluator configuration
 * @returns Evaluation result or null if skipped
 */
export async function evaluateSummary(
	contactData: { facts: any[]; hotTopics: any[] },
	summary: string,
	config: EvaluatorConfig
): Promise<EvaluationResult | null> {
	// Skip if evaluation is disabled
	if (!config.enableEvaluation) {
		return null;
	}

	// Apply sampling (25% by default)
	if (!shouldEvaluate(config.samplingRate)) {
		return null;
	}

	try {
		const grok = createXai({
			apiKey: config.XAI_API_KEY,
		});

		const evaluatorModel = grok('grok-4-1-fast');

		const prompt = `Tu es un évaluateur de qualité pour des résumés de contacts.

DONNÉES DU CONTACT:
Facts: ${JSON.stringify(contactData.facts, null, 2)}
Hot Topics: ${JSON.stringify(contactData.hotTopics, null, 2)}

RÉSUMÉ GÉNÉRÉ:
${summary}

Évalue la qualité selon ces critères:
1. PERTINENCE: Le résumé capture les points clés?
2. CONCISION: Ni trop long, ni trop court?
3. EXACTITUDE: Pas d'infos fausses?
4. UTILITÉ: Aide à comprendre le contact?

Score de 0 à 10 (sois strict et objectif).`;

		const { object: evaluation } = await generateObject({
			model: evaluatorModel,
			schema: evaluationSchema,
			prompt,
		});

		return evaluation;
	} catch (error) {
		console.error('Evaluation failed:', error);
		return null;
	}
}

/**
 * Get evaluation statistics for monitoring
 * This can be called periodically to see average quality scores
 */
export function logEvaluationToLangfuse(
	evaluation: EvaluationResult,
	traceId: string,
	observationId: string
) {
	// This would use LangFuse SDK to log the evaluation as a score
	// For now, just log to console
	console.log(`[EVALUATION] Trace ${traceId}: Score ${evaluation.score}/10`);
	console.log(`[EVALUATION] Reasoning: ${evaluation.reasoning}`);

	if (evaluation.issues.length > 0) {
		console.log(`[EVALUATION] Issues: ${evaluation.issues.join(', ')}`);
	}

	// TODO: Integrate with LangFuse Scores API
	// https://langfuse.com/docs/scores/custom
}
