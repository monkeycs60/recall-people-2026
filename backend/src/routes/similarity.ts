import { Hono } from 'hono';
import { createXai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { similarityRequestSchema } from '../lib/validation';
import { auditLog } from '../lib/audit';

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	XAI_API_KEY: string;
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
		const body = await c.req.json();

		// Validate request body
		const validation = similarityRequestSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'extract',
				resource: 'extract',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { facts } = validation.data;

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

		const typesWithMultipleValues = Object.entries(factsByType).filter(
			([_, values]) => values.length >= 2
		);

		if (typesWithMultipleValues.length === 0) {
			return c.json({ success: true, similarities: [] });
		}

		const xai = createXai({
			apiKey: c.env.XAI_API_KEY,
		});

		const prompt = buildSimilarityPrompt(typesWithMultipleValues);

		const { object: result } = await generateObject({
			model: xai('grok-4-1-fast'),
			schema: similaritySchema,
			prompt,
		});

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: true,
			details: { count: result.similarities.length },
		});

		return c.json({
			success: true,
			similarities: result.similarities,
		});
	} catch (error) {
		console.error('Similarity calculation error:', error);
		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: false,
			details: { error: String(error) },
		});
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
- Score 0.85-0.99 = très similaire (ex: "ski" et "ski de fond", "tennis" et "padel")
- Score 0.5-0.84 = même catégorie mais différent (ex: "ski" et "natation" = sports différents)
- Score 0.0-0.49 = peu ou pas de lien

IMPORTANT:
- Sois STRICT sur les scores élevés (>0.85) : réserve-les aux choses vraiment similaires
- "Semi-marathon" et "ski" ne sont PAS similaires (score < 0.5)
- Génère TOUTES les paires possibles pour chaque type
- N'oublie aucune comparaison
- Renvoie le factType original pour chaque paire`;
};
