import { Hono } from 'hono';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	GOOGLE_GEMINI_API_KEY: string;
};

type FactInput = {
	factType: string;
	factValue: string;
};

type SimilarityRequest = {
	facts: FactInput[];
};

const similaritySchema = z.object({
	similarities: z.array(
		z.object({
			value1: z.string(),
			value2: z.string(),
			factType: z.string(),
			score: z.number().min(0).max(1),
		})
	),
});

export const similarityRoutes = new Hono<{ Bindings: Bindings }>();

similarityRoutes.use('/*', authMiddleware);

similarityRoutes.post('/batch', async (c) => {
	try {
		const body = await c.req.json<SimilarityRequest>();
		const { facts } = body;

		if (!facts || facts.length === 0) {
			return c.json({ error: 'No facts provided' }, 400);
		}

		// Group facts by type for comparison
		const factsByType: Record<string, string[]> = {};
		for (const fact of facts) {
			if (!factsByType[fact.factType]) {
				factsByType[fact.factType] = [];
			}
			const normalizedValue = fact.factValue.toLowerCase().trim();
			if (!factsByType[fact.factType].includes(normalizedValue)) {
				factsByType[fact.factType].push(normalizedValue);
			}
		}

		// Filter types with at least 2 unique values (otherwise no comparison needed)
		const typesWithMultipleValues = Object.entries(factsByType).filter(
			([_, values]) => values.length >= 2
		);

		if (typesWithMultipleValues.length === 0) {
			return c.json({ success: true, similarities: [] });
		}

		const google = createGoogleGenerativeAI({
			apiKey: c.env.GOOGLE_GEMINI_API_KEY,
		});

		const prompt = buildSimilarityPrompt(typesWithMultipleValues);

		const { object: result } = await generateObject({
			model: google('gemini-2.5-flash-preview-09-2025'),
			schema: similaritySchema,
			prompt,
		});

		return c.json({
			success: true,
			similarities: result.similarities,
		});
	} catch (error) {
		console.error('Similarity calculation error:', error);
		return c.json({ error: 'Similarity calculation failed' }, 500);
	}
});

const buildSimilarityPrompt = (factsByType: [string, string[]][]): string => {
	const typesAndValues = factsByType
		.map(([factType, values]) => {
			return `${factType}: ${values
				.map((value) => `"${value}"`)
				.join(', ')}`;
		})
		.join('\n');

	return `Tu es un assistant qui calcule des scores de similarité entre valeurs.

TYPES ET VALEURS À COMPARER:
${typesAndValues}

RÈGLES:
- Compare UNIQUEMENT les valeurs au sein du MÊME type (ne compare pas un hobby avec un sport)
- Score 1.0 = valeurs identiques ou quasi-identiques
- Score 0.7-0.9 = très similaire (ex: tennis/padel, banquier/trader, Paris/Île-de-France)
- Score 0.4-0.6 = même catégorie générale (ex: tennis/natation = sports, comptable/RH = bureau)
- Score 0.1-0.3 = faible lien
- Score 0.0 = aucun lien

IMPORTANT:
- Génère TOUTES les paires possibles pour chaque type
- N'oublie aucune comparaison
- Renvoie le factType original pour chaque paire`;
};
