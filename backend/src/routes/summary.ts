import { Hono } from 'hono';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { createAIModel, AIProviderConfig } from '../lib/ai-provider';
import { evaluateSummary } from '../lib/evaluators';

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'grok' | 'cerebras';
	ENABLE_EVALUATION?: string;
	EVALUATION_SAMPLING_RATE?: string;
};

type SummaryRequest = {
	contactName: string;
	transcriptions: string[];
	language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const summarySchema = z.object({
	text: z.string().describe('Le résumé factuel de la personne (2-3 phrases)'),
});

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
	fr: 'Réponds en français.',
	en: 'Respond in English.',
	es: 'Responde en español.',
	it: 'Rispondi in italiano.',
	de: 'Antworte auf Deutsch.',
};

export const summaryRoutes = new Hono<{ Bindings: Bindings }>();

summaryRoutes.use('/*', authMiddleware);

summaryRoutes.post('/', async (c) => {
	console.log('[Summary] Starting summary generation...');

	try {
		const body = await c.req.json<SummaryRequest>();
		const { contactName, transcriptions, language = 'fr' } = body;

		console.log('[Summary] Request received:', {
			contactName,
			transcriptionsCount: transcriptions?.length || 0,
			language,
		});

		if (!transcriptions || transcriptions.length === 0) {
			console.log('[Summary] Error: No transcriptions provided');
			return c.json({ error: 'No transcriptions provided' }, 400);
		}

		const providerConfig: AIProviderConfig = {
			XAI_API_KEY: c.env.XAI_API_KEY,
			CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
			AI_PROVIDER: c.env.AI_PROVIDER,
		};

		console.log('[Summary] Using AI provider:', c.env.AI_PROVIDER || 'grok');

		const langInstruction =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		const allTranscriptions = transcriptions.join('\n\n');

		const prompt = `Résume cette personne en 2-3 phrases STRICTEMENT basées sur les notes ci-dessous.
${langInstruction}

RÈGLES ABSOLUES:
- UNIQUEMENT les faits explicitement mentionnés dans les notes
- AUCUN adjectif, AUCUNE interprétation, AUCUNE supposition
- Style straight to the point: "Travaille chez X. Fait du Y. A un Z."
- Ne dis PAS "selon les notes" ou "d'après"
- JAMAIS de dates relatives ("la semaine dernière", "le mois dernier", "hier")
  → Utilise "récemment" ou la date exacte si connue
- Si jamais tu évoques l'utilisateur (le narrateur, celui qui fait la note audio), utilise 'l'utilisateur' pour le désigner.

GESTION DE LA TEMPORALITÉ:
- Les notes sont ordonnées de la plus ANCIENNE à la plus RÉCENTE
- Chaque note commence par sa date entre crochets [date]
- EN CAS DE CONTRADICTION: seule l'info la plus récente compte
- Si une note récente annule/contredit une info ancienne, N'INCLUS PAS l'info obsolète
- Exemple: si une note dit "lance un projet X" puis une note plus récente dit "abandonne le projet X", ne mentionne PAS le lancement du projet

NOTES SUR ${contactName}:
${allTranscriptions}


Résumé:`;

		console.log('[Summary] Prompt length:', prompt.length);
		console.log('[Summary] Creating AI model...');

		const model = createAIModel(providerConfig);

		console.log('[Summary] Calling generateObject...');

		const { object } = await generateObject({
			model,
			schema: summarySchema,
			prompt,
		});

		const summary = object.text;
		console.log('[Summary] Success! Generated summary:', summary);

		// Run evaluation in background (non-blocking)
		if (c.env.XAI_API_KEY && c.executionCtx) {
			c.executionCtx.waitUntil(
				evaluateSummary(contactName, transcriptions, summary, {
					XAI_API_KEY: c.env.XAI_API_KEY,
					enableEvaluation: c.env.ENABLE_EVALUATION === 'true',
					samplingRate: parseFloat(
						c.env.EVALUATION_SAMPLING_RATE || '0.25'
					),
				}).then((evaluation) => {
					if (evaluation) {
						console.log(
							`[Summary Eval] Score: ${evaluation.score}/10 - ${evaluation.reasoning}`
						);
						if (evaluation.issues.length > 0) {
							console.log(
								`[Summary Eval] Issues: ${evaluation.issues.join(', ')}`
							);
						}
					}
				})
			);
		}

		return c.json({
			success: true,
			summary,
		});
	} catch (error) {
		console.error('[Summary] Error caught:', error);
		console.error('[Summary] Error type:', typeof error);
		console.error(
			'[Summary] Error name:',
			error instanceof Error ? error.name : 'N/A'
		);
		console.error(
			'[Summary] Error message:',
			error instanceof Error ? error.message : String(error)
		);
		console.error(
			'[Summary] Error stack:',
			error instanceof Error ? error.stack : 'N/A'
		);

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		return c.json(
			{ error: 'Summary generation failed', details: errorMessage },
			500
		);
	}
});
