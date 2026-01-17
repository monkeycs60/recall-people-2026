import { Hono } from 'hono';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { createAIModel, AIProviderConfig } from '../lib/ai-provider';
import { auditLog } from '../lib/audit';
import { getLangfuseClient } from '../lib/telemetry';

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	OPENAI_API_KEY?: string;
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'openai' | 'grok' | 'cerebras';
	ENABLE_LANGFUSE?: string;
};

type Contact = {
	id: string;
	firstName: string;
	lastName?: string;
	notes: Array<{
		id: string;
		title: string;
		transcription: string;
		createdAt: string;
	}>;
};

type AskRequest = {
	question: string;
	contacts: Contact[];
};

const sourceSchema = z.object({
	noteId: z.string().describe("L'ID de la note source"),
	noteTitle: z.string().describe('Le titre de la note'),
	noteDate: z.string().describe('La date de la note au format ISO'),
	contactId: z.string().describe("L'ID du contact concerné"),
	contactName: z.string().describe('Le nom complet du contact'),
	relevantExcerpt: z
		.string()
		.describe('Un extrait pertinent de la note qui a servi à répondre'),
});

const askResponseSchema = z.object({
	answer: z
		.string()
		.describe(
			'Réponse en langage naturel basée UNIQUEMENT sur les informations des notes'
		),
	sources: z
		.array(sourceSchema)
		.describe('Liste des sources utilisées pour répondre'),
	relatedContactId: z
		.string()
		.nullable()
		.describe(
			"L'ID du contact principal mentionné dans la question, null si non applicable"
		),
	noInfoFound: z
		.boolean()
		.describe("true si aucune information n'a été trouvée dans les notes"),
});

type Variables = {
	user: import('@prisma/client').User;
};

export const askRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

askRoutes.use('/*', authMiddleware);

askRoutes.post('/', async (c) => {
	const langfuse = getLangfuseClient();
	const trace = langfuse?.trace({
		name: 'ask-question',
		metadata: { route: '/api/ask' },
	});

	console.log('[Ask] Starting question answering...');

	try {
		const body = await c.req.json<AskRequest>();
		const { question, contacts } = body;

		console.log('[Ask] Request received:', {
			question,
			contactsCount: contacts?.length || 0,
		});

		if (!question || question.trim().length === 0) {
			console.log('[Ask] Error: No question provided');
			trace?.update({ output: { error: 'No question provided' } });
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'ask',
				resource: 'ask',
				success: false,
				details: { error: 'No question provided' },
			});
			return c.json({ error: 'No question provided' }, 400);
		}

		if (!contacts || contacts.length === 0) {
			console.log('[Ask] Error: No contacts provided');
			trace?.update({ output: { error: 'No contacts provided' } });
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'ask',
				resource: 'ask',
				success: false,
				details: { error: 'No contacts provided' },
			});
			return c.json({ error: 'No contacts provided' }, 400);
		}

		const providerConfig: AIProviderConfig = {
			OPENAI_API_KEY: c.env.OPENAI_API_KEY,
			XAI_API_KEY: c.env.XAI_API_KEY,
			CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
			AI_PROVIDER: c.env.AI_PROVIDER,
		};

		console.log('[Ask] Using AI provider:', c.env.AI_PROVIDER || 'openai');

		// Prepare contacts and notes data for the prompt
		const contactsData = contacts
			.map((contact) => {
				const fullName = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}`;
				const notesText = contact.notes
					.map(
						(note) =>
							`  - Note ID: ${note.id}
     Titre: ${note.title}
     Date: ${note.createdAt}
     Contenu: ${note.transcription}`
					)
					.join('\n\n');

				return `Contact: ${fullName} (ID: ${contact.id})
Notes:
${notesText || '  (Aucune note)'}`;
			})
			.join('\n\n---\n\n');

		const prompt = `Tu es un assistant qui aide l'utilisateur à se souvenir de ses conversations avec ses proches.

QUESTION DE L'UTILISATEUR :
"${question}"

CONTACTS ET NOTES DISPONIBLES :
${contactsData}

RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT avec les informations présentes dans les notes
2. Si tu ne trouves pas l'info, indique clairement qu'aucune information n'a été trouvée (noInfoFound: true)
3. Cite les sources : pour chaque information utilisée, indique quelle note (noteId, noteTitle, noteDate)
4. Utilise un ton naturel et conversationnel
5. N'invente JAMAIS d'information - mieux vaut dire "je n'ai pas trouvé" que d'inventer
6. Si la question concerne plusieurs contacts, réponds pour chacun
7. Pour chaque source, extrais un court extrait pertinent de la note qui a servi à répondre

FORMAT DE RÉPONSE :
- answer: Réponse en langage naturel (vide si noInfoFound est true)
- sources: Liste des notes utilisées avec leurs métadonnées et extraits pertinents
- relatedContactId: ID du contact principal mentionné (null si aucun ou plusieurs)
- noInfoFound: true si aucune information trouvée, false sinon

EXEMPLES DE BONNES RÉPONSES :
- Question: "De quoi j'ai parlé avec Marie ?"
  Réponse: "D'après ta note du 10 janvier, tu as parlé avec Marie de son projet de startup..."

- Question: "C'est quand l'anniversaire de Lucas ?"
  Si pas d'info: "Je n'ai pas trouvé d'information sur l'anniversaire de Lucas dans tes notes."

- Question: "Qui a parlé de Google ?"
  Réponse: "Marie a mentionné Google dans ta note du 10 janvier - elle passe un entretien..."`;

		console.log('[Ask] Prompt length:', prompt.length);
		console.log('[Ask] Creating AI model...');

		const model = createAIModel(providerConfig);

		// Create Langfuse generation span
		const generation = trace?.generation({
			name: 'ask-generation',
			model: c.env.AI_PROVIDER || 'openai',
			input: { question, contactsCount: contacts.length },
		});

		console.log('[Ask] Calling generateObject...');

		const { object } = await generateObject({
			model,
			schema: askResponseSchema,
			prompt,
		});

		console.log('[Ask] Success! Generated response:', {
			answer: object.answer.substring(0, 100) + '...',
			sourcesCount: object.sources.length,
			noInfoFound: object.noInfoFound,
		});

		// Update Langfuse generation with output
		generation?.end({ output: object });
		trace?.update({ output: { success: true, ...object } });

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'ask',
			resource: 'ask',
			success: true,
			details: {
				question: question.substring(0, 50),
				sourcesCount: object.sources.length,
				noInfoFound: object.noInfoFound,
			},
		});

		return c.json({
			success: true,
			...object,
		});
	} catch (error) {
		console.error('[Ask] Error caught:', error);
		console.error('[Ask] Error type:', typeof error);
		console.error('[Ask] Error name:', error instanceof Error ? error.name : 'N/A');
		console.error(
			'[Ask] Error message:',
			error instanceof Error ? error.message : String(error)
		);
		console.error(
			'[Ask] Error stack:',
			error instanceof Error ? error.stack : 'N/A'
		);

		trace?.update({ output: { error: String(error) } });

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'ask',
			resource: 'ask',
			success: false,
			details: { error: String(error) },
		});

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		return c.json(
			{ error: 'Question answering failed', details: errorMessage },
			500
		);
	}
});
