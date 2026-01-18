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
	OPENAI_API_KEY?: string;
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'openai' | 'grok' | 'cerebras';
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
			OPENAI_API_KEY: c.env.OPENAI_API_KEY,
			XAI_API_KEY: c.env.XAI_API_KEY,
			CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
			AI_PROVIDER: c.env.AI_PROVIDER,
		};

		console.log('[Summary] Using AI provider:', c.env.AI_PROVIDER || 'openai');

		const langInstruction =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		const allTranscriptions = transcriptions.join('\n\n');

		const prompt = `Tu génères un résumé factuel et concis de ${contactName}.
${langInstruction}

NOTES (ordonnées chronologiquement de la plus ancienne à la plus récente):
${allTranscriptions}

RÈGLES ABSOLUES:
1. Résumé de 2-4 phrases maximum
2. Utilise des DATES ABSOLUES en texte complet (pas "récemment" mais "en janvier 2026", "le 25 janvier 2026")
3. FORMATAGE DES DATES: Écris les dates en texte complet avec le nom du mois (ex: "25 janvier 2026", "3 mars 2026"), JAMAIS en format numérique (pas de "25/01/2026" ou "03/03/2026")
4. N'invente RIEN - base-toi uniquement sur les notes fournies
5. Mentionne la situation actuelle (travail, projets en cours)
6. Mentionne les événements à venir importants s'il y en a
7. Si les notes sont contradictoires, privilégie l'info la plus récente
8. Style factuel et concis: "Travaille chez X. Entretien prévu le 25 janvier 2026. A un enfant qui fait Y."
9. Ne dis PAS "selon les notes" ou "d'après les informations"
10. Si jamais tu évoques l'utilisateur (le narrateur), utilise 'l'utilisateur' pour le désigner

EXEMPLE BON:
"Marie est consultante chez Deloitte, en recherche d'un nouveau poste (entretien chez Google le 25 janvier 2026). Elle déménage à Lyon en mars 2026. Mère de Lucas qui fait du foot."

EXEMPLE MAUVAIS:
"Marie est une personne dynamique qui travaille beaucoup. Elle a plein de projets passionnants récemment."
"Marie a un entretien le 25/01/2026." (dates numériques interdites)

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
