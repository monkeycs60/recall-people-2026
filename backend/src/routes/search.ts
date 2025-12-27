import { Hono } from 'hono';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { wrapUserInput, sanitize, getSecurityInstructions } from '../lib/security';
import { searchRequestSchema } from '../lib/validation';
import { auditLog } from '../lib/audit';
import { createAIModel } from '../lib/ai-provider';

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'grok' | 'cerebras';
};

type FactInput = {
	id: string;
	contactId: string;
	contactName: string;
	factType: string;
	factKey: string;
	factValue: string;
};

type MemoryInput = {
	id: string;
	contactId: string;
	contactName: string;
	description: string;
	eventDate?: string;
};

type NoteInput = {
	id: string;
	contactId: string;
	contactName: string;
	transcription: string;
};

type SearchRequest = {
	query: string;
	facts: FactInput[];
	memories: MemoryInput[];
	notes: NoteInput[];
	language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const searchResultSchema = z.object({
	results: z.array(
		z.object({
			contactId: z.string(),
			contactName: z.string(),
			answer: z.string(),
			reference: z.string(),
			sourceType: z.enum(['fact', 'memory', 'note']),
			sourceId: z.string(),
			relevanceScore: z.number().min(0).max(100),
		})
	),
});

export const searchRoutes = new Hono<{ Bindings: Bindings }>();

searchRoutes.use('/*', authMiddleware);

searchRoutes.post('/', async (c) => {
	const startTime = Date.now();

	try {
		const body = await c.req.json();

		// Validate request body
		const validation = searchRequestSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'search',
				resource: 'search',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { query, facts, memories, notes } = validation.data;

		const hasData = facts.length > 0 || memories.length > 0 || notes.length > 0;
		if (!hasData) {
			return c.json({
				results: [],
				processingTimeMs: Date.now() - startTime,
			});
		}

		const language = body.language || 'fr';
		const prompt = buildSearchPrompt(query, facts, memories, notes, language);

		const model = createAIModel({
			XAI_API_KEY: c.env.XAI_API_KEY,
			CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
			AI_PROVIDER: c.env.AI_PROVIDER,
		});

		const { object: result } = await generateObject({
			model,
			schema: searchResultSchema,
			prompt,
		});

		const sortedResults = result.results.sort(
			(a, b) => b.relevanceScore - a.relevanceScore
		);

		const processingTimeMs = Date.now() - startTime;

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'search',
			resource: 'search',
			success: true,
			details: { query, resultsCount: sortedResults.length, processingTimeMs },
		});

		return c.json({
			results: sortedResults,
			processingTimeMs,
		});
	} catch (error) {
		console.error('Search error:', error);
		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'search',
			resource: 'search',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Search failed' }, 500);
	}
});

const buildSearchPrompt = (
	query: string,
	facts: FactInput[],
	memories: MemoryInput[],
	notes: NoteInput[],
	language: string = 'fr'
): string => {
	const { wrapped: wrappedQuery } = wrapUserInput(query, 'QUERY');

	const factsSection = facts
		.map((f) => `[FACT:${f.id}] [CONTACT:${f.contactId}] ${sanitize(f.contactName)} - ${sanitize(f.factKey)}: ${sanitize(f.factValue)}`)
		.join('\n');

	const memoriesSection = memories
		.map(
			(m) =>
				`[MEMORY:${m.id}] [CONTACT:${m.contactId}] ${sanitize(m.contactName)} - ${sanitize(m.description)}${m.eventDate ? ` (${m.eventDate})` : ''}`
		)
		.join('\n');

	const notesSection = notes
		.map((n) => {
			const truncatedTranscription = sanitize(n.transcription).slice(0, 300);
			return `[NOTE:${n.id}] [CONTACT:${n.contactId}] ${sanitize(n.contactName)} - ${truncatedTranscription}${n.transcription.length > 300 ? '...' : ''}`;
		})
		.join('\n');

	return `Tu es un assistant de recherche dans un carnet de contacts personnel.
${getSecurityInstructions(language)}

REQUÊTE UTILISATEUR:
${wrappedQuery}

INSTRUCTIONS:
1. Trouve TOUS les résultats pertinents pour la requête
2. Utilise la compréhension sémantique (ex: "sports de combat" = boxe, MMA, judo, karaté...)
3. Priorise: FACT > MEMORY > NOTE à pertinence égale
4. Score de 0-100 basé sur la pertinence (100 = correspondance exacte)
5. "answer" doit être une réponse concise et directe à la requête
6. "reference" doit donner le contexte ou la source de l'info
7. "sourceId" doit contenir l'ID exact après [FACT:], [MEMORY:] ou [NOTE:] (UUID)
8. "contactId" doit contenir l'UUID exact après [CONTACT:] (pas le nom!)

Si aucun résultat pertinent, retourne un tableau "results" vide.

DONNÉES DISPONIBLES:

=== FACTS (infos structurées, priorité haute) ===
${factsSection || '(aucun fact)'}

=== MEMORIES (événements ponctuels, priorité moyenne) ===
${memoriesSection || '(aucun memory)'}

=== NOTES (transcriptions brutes, priorité basse) ===
${notesSection || '(aucune note)'}

LANGUE DE RÉPONSE: Réponds dans la même langue que la requête utilisateur (${language}).
Les champs "answer" et "reference" doivent être dans cette langue.`;
};
