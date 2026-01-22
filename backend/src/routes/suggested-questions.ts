import { Hono } from 'hono';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';
import { suggestedQuestionsRequestSchema } from '../lib/validation';
import { auditLog } from '../lib/audit';
import { createAIModel, getAIModel } from '../lib/ai-provider';
import { getLangfuseClient } from '../lib/telemetry';

type Bindings = {
	OPENAI_API_KEY?: string;
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'openai' | 'grok' | 'cerebras';
	ENABLE_LANGFUSE?: string;
};

type SuggestedQuestionsRequest = {
	contact: {
		firstName: string;
		lastName?: string;
	};
	facts: Array<{
		factType: string;
		factKey: string;
		factValue: string;
	}>;
	hotTopics: Array<{
		title: string;
		context: string;
		status: string;
		eventDate?: string | null;
		resolution?: string | null;
		resolvedAt?: string | null;
	}>;
	recentNotes?: Array<{
		title: string;
		transcription: string;
		createdAt: string;
	}>;
	language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
	fr: 'Réponds en français uniquement.',
	en: 'Respond in English only.',
	es: 'Responde solo en español.',
	it: 'Rispondi solo in italiano.',
	de: 'Antworte nur auf Deutsch.',
};

type Variables = {
	user: import('@prisma/client').User;
};

export const suggestedQuestionsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

suggestedQuestionsRoutes.use('/*', authMiddleware);

suggestedQuestionsRoutes.post('/', async (c) => {
	const langfuse = getLangfuseClient();
	const trace = langfuse?.trace({
		name: 'suggested-questions',
		metadata: { route: '/api/suggested-questions' },
	});

	try {
		const body = await c.req.json();

		// Validate request body
		const validation = suggestedQuestionsRequestSchema.safeParse(body);
		if (!validation.success) {
			trace?.update({ output: { error: 'Validation failed', issues: validation.error.issues } });
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'extract',
				resource: 'extract',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { contact, facts, hotTopics, recentNotes } = validation.data;
		const language = validation.data.language || 'fr';
		const langInstruction =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		const activeTopics = hotTopics.filter(
			(topic) => topic.status === 'active'
		);

		const recentlyResolvedTopics = hotTopics.filter(
			(topic) => topic.status === 'resolved' && topic.resolvedAt
		);

		// Sort active topics by event date (closest first)
		const sortedActiveTopics = [...activeTopics].sort((a, b) => {
			if (!a.eventDate && !b.eventDate) return 0;
			if (!a.eventDate) return 1;
			if (!b.eventDate) return -1;
			return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
		});

		const formatActiveTopics = (topics: typeof activeTopics) =>
			topics
				.map((topic) => {
					let line = `- ${topic.title}`;
					if (topic.context) line += `: ${topic.context}`;
					if (topic.eventDate) line += ` (Date: ${topic.eventDate})`;
					return line;
				})
				.join('\n');

		const formatResolvedTopics = (topics: typeof recentlyResolvedTopics) =>
			topics
				.map((topic) => {
					let line = `- ${topic.title}`;
					if (topic.resolution) line += `: ${topic.resolution}`;
					return line;
				})
				.join('\n');

		const formatRecentNotes = (notes: typeof recentNotes) =>
			notes
				?.map((note) => {
					return `[${note.createdAt}] ${note.title || 'Note'}: ${note.transcription.substring(0, 150)}...`;
				})
				.join('\n\n') || '';

		const formatFacts = (factsArray: typeof facts) =>
			factsArray
				.map((fact) => `- ${fact.factKey}: ${fact.factValue}`)
				.join('\n');

		const prompt = `Tu génères des questions naturelles à poser à ${contact.firstName} lors de la prochaine rencontre.
${langInstruction}

${sortedActiveTopics.length > 0 ? `ACTUALITÉS ACTIVES:
${formatActiveTopics(sortedActiveTopics)}
` : ''}
${recentNotes && recentNotes.length > 0 ? `DERNIÈRES NOTES (résumés):
${formatRecentNotes(recentNotes)}
` : ''}
${recentlyResolvedTopics.length > 0 ? `ACTUALITÉS RÉCEMMENT RÉSOLUES:
${formatResolvedTopics(recentlyResolvedTopics)}
` : ''}
${facts.length > 0 ? `INFORMATIONS SUR LE PROFIL:
${formatFacts(facts)}
` : ''}

RÈGLES ABSOLUES:
1. Génère entre 1 et 3 questions MAXIMUM selon la matière disponible
2. PRIORITÉ : les actualités actives avec dates proches
3. Si PAS d'actualités : utilise les infos importantes du profil (travail, famille, passions)
4. Si une actualité est résolue positivement, suggère de féliciter
5. Formulation naturelle, comme on parlerait à un ami (tutoiement)
6. NE BRODE PAS : si tu n'as qu'une seule info pertinente, génère UNE seule question
7. NE RÉPÈTE PAS la même information dans plusieurs questions
8. N'invente JAMAIS de questions sur des sujets non mentionnés
9. Les questions doivent inviter à partager, pas être des questions oui/non
10. Maximum 15 mots par question

IMPORTANT: Mieux vaut 1 bonne question que 3 questions artificielles ou répétitives.

FORMAT DE RÉPONSE:
Retourne entre 1 et 3 questions, une par ligne, sans numérotation ni tirets.

Exemples:
Comment s'est passé ton entretien chez Google ?
Alors le déménagement à Lyon, c'est calé pour mars ?

Si aucune info pertinente n'est disponible, retourne une ligne vide.
`;

		const providerConfig = {
			OPENAI_API_KEY: c.env.OPENAI_API_KEY,
			XAI_API_KEY: c.env.XAI_API_KEY,
			CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
			AI_PROVIDER: c.env.AI_PROVIDER,
			ENABLE_LANGFUSE: c.env.ENABLE_LANGFUSE,
		};

		const model = createAIModel(providerConfig);
		const modelName = getAIModel(providerConfig);

		// Create Langfuse generation span
		const generation = trace?.generation({
			name: 'suggested-questions-generation',
			model: modelName,
			input: { contact: contact.firstName, hotTopicsCount: activeTopics.length },
		});

		const { text } = await generateText({
			model,
			prompt,
		});

		const suggestedQuestions = text
			.trim()
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0 && !line.match(/^[-•*\d\.]/)) // Filter out lines that start with list markers
			.slice(0, 3); // Maximum 3 questions

		// Update Langfuse generation with output
		generation?.end({ output: suggestedQuestions });
		trace?.update({ output: { success: true, suggestedQuestions } });

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: true,
			details: { language, contact: contact.firstName, count: suggestedQuestions.length },
		});

		return c.json({
			success: true,
			suggestedQuestions,
		});
	} catch (error) {
		console.error('Suggested questions generation error:', error);
		trace?.update({ output: { error: String(error) } });
		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Suggested questions generation failed' }, 500);
	}
});
