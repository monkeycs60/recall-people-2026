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
	language?: 'fr' | 'en' | 'es' | 'it' | 'de';
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

const PROMPT_TEMPLATES: Record<string, {
	intro: string;
	question: string;
	contacts: string;
	rules: string;
	format: string;
	examples: string;
	noteLabels: {
		noteId: string;
		title: string;
		date: string;
		content: string;
		noNotes: string;
	};
}> = {
	fr: {
		intro: "Tu es un assistant qui aide l'utilisateur à se souvenir de ses conversations avec ses proches.",
		question: "QUESTION DE L'UTILISATEUR",
		contacts: 'CONTACTS ET NOTES DISPONIBLES',
		rules: `RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT avec les informations présentes dans les notes
2. Si tu ne trouves pas l'info, indique clairement qu'aucune information n'a été trouvée (noInfoFound: true)
3. Cite les sources : pour chaque information utilisée, indique quelle note (noteId, noteTitle, noteDate)
4. Utilise un ton naturel et conversationnel
5. N'invente JAMAIS d'information - mieux vaut dire "je n'ai pas trouvé" que d'inventer
6. Si la question concerne plusieurs contacts, réponds pour chacun
7. Pour chaque source, extrais un court extrait pertinent de la note qui a servi à répondre`,
		format: `FORMAT DE RÉPONSE :
- answer: Réponse en langage naturel (vide si noInfoFound est true)
- sources: Liste des notes utilisées avec leurs métadonnées et extraits pertinents
- relatedContactId: ID du contact principal mentionné (null si aucun ou plusieurs)
- noInfoFound: true si aucune information trouvée, false sinon`,
		examples: `EXEMPLES DE BONNES RÉPONSES :
- Question: "De quoi j'ai parlé avec Marie ?"
  Réponse: "D'après ta note du 10 janvier, tu as parlé avec Marie de son projet de startup..."

- Question: "C'est quand l'anniversaire de Lucas ?"
  Si pas d'info: "Je n'ai pas trouvé d'information sur l'anniversaire de Lucas dans tes notes."

- Question: "Qui a parlé de Google ?"
  Réponse: "Marie a mentionné Google dans ta note du 10 janvier - elle passe un entretien..."`,
		noteLabels: {
			noteId: 'Note ID',
			title: 'Titre',
			date: 'Date',
			content: 'Contenu',
			noNotes: '(Aucune note)',
		},
	},
	en: {
		intro: 'You are an assistant that helps the user remember their conversations with their loved ones.',
		question: 'USER QUESTION',
		contacts: 'AVAILABLE CONTACTS AND NOTES',
		rules: `ABSOLUTE RULES:
1. Answer ONLY with information present in the notes
2. If you don't find the info, clearly indicate that no information was found (noInfoFound: true)
3. Cite sources: for each piece of information used, indicate which note (noteId, noteTitle, noteDate)
4. Use a natural and conversational tone
5. NEVER invent information - it's better to say "I didn't find" than to make things up
6. If the question concerns multiple contacts, answer for each one
7. For each source, extract a short relevant excerpt from the note that was used to answer`,
		format: `RESPONSE FORMAT:
- answer: Natural language response (empty if noInfoFound is true)
- sources: List of notes used with their metadata and relevant excerpts
- relatedContactId: ID of the main contact mentioned (null if none or multiple)
- noInfoFound: true if no information found, false otherwise`,
		examples: `EXAMPLES OF GOOD RESPONSES:
- Question: "What did I talk about with Marie?"
  Response: "According to your note from January 10, you talked with Marie about her startup project..."

- Question: "When is Lucas's birthday?"
  If no info: "I didn't find any information about Lucas's birthday in your notes."

- Question: "Who mentioned Google?"
  Response: "Marie mentioned Google in your note from January 10 - she has an interview..."`,
		noteLabels: {
			noteId: 'Note ID',
			title: 'Title',
			date: 'Date',
			content: 'Content',
			noNotes: '(No notes)',
		},
	},
	es: {
		intro: 'Eres un asistente que ayuda al usuario a recordar sus conversaciones con sus seres queridos.',
		question: 'PREGUNTA DEL USUARIO',
		contacts: 'CONTACTOS Y NOTAS DISPONIBLES',
		rules: `REGLAS ABSOLUTAS:
1. Responde ÚNICAMENTE con la información presente en las notas
2. Si no encuentras la info, indica claramente que no se encontró información (noInfoFound: true)
3. Cita las fuentes: para cada información utilizada, indica qué nota (noteId, noteTitle, noteDate)
4. Usa un tono natural y conversacional
5. NUNCA inventes información - es mejor decir "no encontré" que inventar
6. Si la pregunta concierne a varios contactos, responde para cada uno
7. Para cada fuente, extrae un breve extracto relevante de la nota que sirvió para responder`,
		format: `FORMATO DE RESPUESTA:
- answer: Respuesta en lenguaje natural (vacío si noInfoFound es true)
- sources: Lista de notas utilizadas con sus metadatos y extractos relevantes
- relatedContactId: ID del contacto principal mencionado (null si ninguno o varios)
- noInfoFound: true si no se encontró información, false en caso contrario`,
		examples: `EJEMPLOS DE BUENAS RESPUESTAS:
- Pregunta: "¿De qué hablé con Marie?"
  Respuesta: "Según tu nota del 10 de enero, hablaste con Marie sobre su proyecto de startup..."

- Pregunta: "¿Cuándo es el cumpleaños de Lucas?"
  Si no hay info: "No encontré información sobre el cumpleaños de Lucas en tus notas."

- Pregunta: "¿Quién habló de Google?"
  Respuesta: "Marie mencionó Google en tu nota del 10 de enero - tiene una entrevista..."`,
		noteLabels: {
			noteId: 'ID de Nota',
			title: 'Título',
			date: 'Fecha',
			content: 'Contenido',
			noNotes: '(Sin notas)',
		},
	},
	it: {
		intro: 'Sei un assistente che aiuta l\'utente a ricordare le sue conversazioni con i suoi cari.',
		question: 'DOMANDA DELL\'UTENTE',
		contacts: 'CONTATTI E NOTE DISPONIBILI',
		rules: `REGOLE ASSOLUTE:
1. Rispondi SOLO con le informazioni presenti nelle note
2. Se non trovi l'info, indica chiaramente che non sono state trovate informazioni (noInfoFound: true)
3. Cita le fonti: per ogni informazione utilizzata, indica quale nota (noteId, noteTitle, noteDate)
4. Usa un tono naturale e conversazionale
5. NON inventare MAI informazioni - è meglio dire "non ho trovato" che inventare
6. Se la domanda riguarda più contatti, rispondi per ciascuno
7. Per ogni fonte, estrai un breve estratto pertinente dalla nota che è servita a rispondere`,
		format: `FORMATO DI RISPOSTA:
- answer: Risposta in linguaggio naturale (vuoto se noInfoFound è true)
- sources: Lista delle note utilizzate con i loro metadati ed estratti pertinenti
- relatedContactId: ID del contatto principale menzionato (null se nessuno o più)
- noInfoFound: true se non sono state trovate informazioni, false altrimenti`,
		examples: `ESEMPI DI BUONE RISPOSTE:
- Domanda: "Di cosa ho parlato con Marie?"
  Risposta: "Secondo la tua nota del 10 gennaio, hai parlato con Marie del suo progetto di startup..."

- Domanda: "Quand'è il compleanno di Lucas?"
  Se non c'è info: "Non ho trovato informazioni sul compleanno di Lucas nelle tue note."

- Domanda: "Chi ha parlato di Google?"
  Risposta: "Marie ha menzionato Google nella tua nota del 10 gennaio - ha un colloquio..."`,
		noteLabels: {
			noteId: 'ID Nota',
			title: 'Titolo',
			date: 'Data',
			content: 'Contenuto',
			noNotes: '(Nessuna nota)',
		},
	},
	de: {
		intro: 'Du bist ein Assistent, der dem Benutzer hilft, sich an seine Gespräche mit seinen Liebsten zu erinnern.',
		question: 'BENUTZERFRAGE',
		contacts: 'VERFÜGBARE KONTAKTE UND NOTIZEN',
		rules: `ABSOLUTE REGELN:
1. Antworte NUR mit Informationen, die in den Notizen vorhanden sind
2. Wenn du die Info nicht findest, gib klar an, dass keine Information gefunden wurde (noInfoFound: true)
3. Zitiere Quellen: für jede verwendete Information gib an, welche Notiz (noteId, noteTitle, noteDate)
4. Verwende einen natürlichen und gesprächigen Ton
5. Erfinde NIEMALS Informationen - es ist besser zu sagen "Ich habe nicht gefunden" als zu erfinden
6. Wenn die Frage mehrere Kontakte betrifft, antworte für jeden
7. Für jede Quelle extrahiere einen kurzen relevanten Auszug aus der Notiz, die zur Antwort gedient hat`,
		format: `ANTWORTFORMAT:
- answer: Antwort in natürlicher Sprache (leer wenn noInfoFound true ist)
- sources: Liste der verwendeten Notizen mit ihren Metadaten und relevanten Auszügen
- relatedContactId: ID des hauptsächlich erwähnten Kontakts (null wenn keiner oder mehrere)
- noInfoFound: true wenn keine Information gefunden wurde, sonst false`,
		examples: `BEISPIELE FÜR GUTE ANTWORTEN:
- Frage: "Worüber habe ich mit Marie gesprochen?"
  Antwort: "Laut deiner Notiz vom 10. Januar hast du mit Marie über ihr Startup-Projekt gesprochen..."

- Frage: "Wann hat Lucas Geburtstag?"
  Wenn keine Info: "Ich habe keine Information über Lucas' Geburtstag in deinen Notizen gefunden."

- Frage: "Wer hat Google erwähnt?"
  Antwort: "Marie hat Google in deiner Notiz vom 10. Januar erwähnt - sie hat ein Vorstellungsgespräch..."`,
		noteLabels: {
			noteId: 'Notiz-ID',
			title: 'Titel',
			date: 'Datum',
			content: 'Inhalt',
			noNotes: '(Keine Notizen)',
		},
	},
};

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
		const { question, contacts, language = 'fr' } = body;

		console.log('[Ask] Request received:', {
			question,
			contactsCount: contacts?.length || 0,
			language,
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

		const template = PROMPT_TEMPLATES[language] || PROMPT_TEMPLATES.fr;

		// Prepare contacts and notes data for the prompt
		const contactsData = contacts
			.map((contact) => {
				const fullName = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}`;
				const notesText = contact.notes
					.map(
						(note) =>
							`  - ${template.noteLabels.noteId}: ${note.id}
     ${template.noteLabels.title}: ${note.title}
     ${template.noteLabels.date}: ${note.createdAt}
     ${template.noteLabels.content}: ${note.transcription}`
					)
					.join('\n\n');

				return `Contact: ${fullName} (ID: ${contact.id})
Notes:
${notesText || `  ${template.noteLabels.noNotes}`}`;
			})
			.join('\n\n---\n\n');

		const prompt = `${template.intro}

${template.question} :
"${question}"

${template.contacts} :
${contactsData}

${template.rules}

${template.format}

${template.examples}`;

		console.log('[Ask] Prompt length:', prompt.length);
		console.log('[Ask] Creating AI model...');

		const model = createAIModel(providerConfig);

		// Create Langfuse generation span
		const generation = trace?.generation({
			name: 'ask-generation',
			model: c.env.AI_PROVIDER || 'openai',
			input: { question, contactsCount: contacts.length, language },
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
				language,
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
