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
 * Evaluate search quality: Are the search results relevant and accurate?
 *
 * Measures:
 * - Relevance: Results match the user's query
 * - Accuracy: Answers correspond to source data (facts/memories/notes)
 * - Relevance scores: Scores are coherent and well-calibrated
 * - No hallucinations: Nothing invented that doesn't exist in sources
 *
 * @param query - User's search query
 * @param sourceData - Available data (facts, memories, notes)
 * @param searchResults - AI-generated search results
 * @param config - Evaluator configuration
 * @returns Evaluation result or null if skipped
 */
export async function evaluateSearch(
	query: string,
	sourceData: {
		facts: any[];
		memories: any[];
		notes: any[];
	},
	searchResults: any[],
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

		const prompt = `Tu es un évaluateur de qualité pour un moteur de recherche dans une base de contacts.

REQUÊTE DE L'UTILISATEUR:
"${query}"

DONNÉES DISPONIBLES (sources):
Facts: ${JSON.stringify(sourceData.facts, null, 2)}
Memories: ${JSON.stringify(sourceData.memories, null, 2)}
Notes: ${JSON.stringify(sourceData.notes, null, 2)}

RÉSULTATS GÉNÉRÉS PAR LE MOTEUR:
${JSON.stringify(searchResults, null, 2)}

Évalue la qualité selon ces critères:
1. PERTINENCE: Les résultats correspondent-ils à la requête?
2. EXACTITUDE: Les réponses proviennent-elles bien des sources?
3. SCORES COHÉRENTS: Les relevanceScore sont-ils bien calibrés?
4. PAS D'HALLUCINATIONS: Rien n'a été inventé qui n'existe pas dans les sources?

Score de 0 à 10:
- 10: Parfait, résultats très pertinents et exacts
- 7-9: Très bon, résultats utiles
- 4-6: Moyen, pertinence partielle ou imprécisions
- 0-3: Mauvais, résultats non pertinents ou hallucinations

Sois strict et objectif.`;

		const { object: evaluation } = await generateObject({
			model: evaluatorModel,
			schema: evaluationSchema,
			prompt,
		});

		return evaluation;
	} catch (error) {
		console.error('Search evaluation failed:', error);
		return null;
	}
}

/**
 * Evaluate contact detection quality: Is the detected contact correct?
 *
 * Measures:
 * - Correct protagonist: Did we identify the main person being discussed?
 * - Correct match: If existing contact, did we match the right one?
 * - Nickname quality: If new contact, is the nickname relevant?
 * - No hallucinations: Nothing invented
 *
 * @param transcription - Original transcription
 * @param contacts - Available contacts with context
 * @param detection - AI-generated detection
 * @param config - Evaluator configuration
 * @returns Evaluation result or null if skipped
 */
export async function evaluateDetection(
	transcription: string,
	contacts: Array<{
		id: string;
		firstName: string;
		lastName?: string;
		nickname?: string;
		aiSummary?: string;
		hotTopics: Array<{ title: string; context?: string }>;
	}>,
	detection: {
		contactId: string | null;
		firstName: string;
		lastName: string | null;
		suggestedNickname: string | null;
		confidence: string;
		isNew: boolean;
		candidateIds: string[];
	},
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

		const contactsSummary = contacts.map((contact) => {
			const name = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}${contact.nickname ? ` (${contact.nickname})` : ''}`;
			return `- [${contact.id}] ${name}: ${contact.aiSummary || 'Pas de résumé'}`;
		}).join('\n');

		const prompt = `Tu es un évaluateur de qualité pour un système de détection de contacts.

TRANSCRIPTION ORIGINALE:
"${transcription}"

CONTACTS DISPONIBLES:
${contactsSummary || 'Aucun contact'}

DÉTECTION GÉNÉRÉE:
${JSON.stringify(detection, null, 2)}

Évalue la qualité selon ces critères:
1. PROTAGONISTE CORRECT: Le prénom détecté correspond-il à la personne principale de la note?
2. MATCH CORRECT: Si contactId est fourni, est-ce le bon contact?
3. GESTION D'AMBIGUÏTÉ: Si plusieurs contacts possibles, candidateIds est-il correct?
4. NICKNAME PERTINENT: Si nouveau contact sans nom, le nickname suggéré est-il utile?
5. PAS D'HALLUCINATIONS: Rien n'a été inventé?

Score de 0 à 10:
- 10: Détection parfaite
- 7-9: Très bon, contact correctement identifié
- 4-6: Moyen, erreur d'identification ou ambiguïté mal gérée
- 0-3: Mauvais, mauvais contact ou hallucination

Sois strict et objectif.`;

		const { object: evaluation } = await generateObject({
			model: evaluatorModel,
			schema: evaluationSchema,
			prompt,
		});

		return evaluation;
	} catch (error) {
		console.error('Detection evaluation failed:', error);
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
