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

const PROMPT_TEMPLATES: Record<string, {
	intro: (firstName: string) => string;
	activeTopics: string;
	recentNotes: string;
	resolvedTopics: string;
	profileInfo: string;
	rules: string;
	format: string;
	examples: string;
	noInfo: string;
}> = {
	fr: {
		intro: (firstName) => `Tu génères des questions naturelles à poser à ${firstName} lors de la prochaine rencontre.`,
		activeTopics: 'ACTUALITÉS ACTIVES',
		recentNotes: 'DERNIÈRES NOTES (résumés)',
		resolvedTopics: 'ACTUALITÉS RÉCEMMENT RÉSOLUES',
		profileInfo: 'INFORMATIONS SUR LE PROFIL',
		rules: `RÈGLES ABSOLUES:
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

IMPORTANT: Mieux vaut 1 bonne question que 3 questions artificielles ou répétitives.`,
		format: 'FORMAT DE RÉPONSE:\nRetourne entre 1 et 3 questions, une par ligne, sans numérotation ni tirets.',
		examples: `Exemples:
Comment s'est passé ton entretien chez Google ?
Alors le déménagement à Lyon, c'est calé pour mars ?`,
		noInfo: "Si aucune info pertinente n'est disponible, retourne une ligne vide.",
	},
	en: {
		intro: (firstName) => `Generate natural questions to ask ${firstName} during your next conversation.`,
		activeTopics: 'ACTIVE TOPICS',
		recentNotes: 'RECENT NOTES (summaries)',
		resolvedTopics: 'RECENTLY RESOLVED TOPICS',
		profileInfo: 'PROFILE INFORMATION',
		rules: `ABSOLUTE RULES:
1. Generate between 1 and 3 questions MAXIMUM based on available information
2. PRIORITY: active topics with upcoming dates
3. If NO active topics: use important profile info (work, family, hobbies)
4. If a topic was resolved positively, suggest congratulating them
5. Natural wording, like talking to a friend (informal)
6. DON'T PAD: if you only have one relevant piece of info, generate ONE question
7. DON'T REPEAT the same information in multiple questions
8. NEVER invent questions about unmentioned topics
9. Questions should invite sharing, not be yes/no questions
10. Maximum 15 words per question

IMPORTANT: Better 1 good question than 3 artificial or repetitive ones.`,
		format: 'RESPONSE FORMAT:\nReturn between 1 and 3 questions, one per line, without numbering or dashes.',
		examples: `Examples:
How did your interview at Google go?
So the move to London, is it set for March?`,
		noInfo: 'If no relevant info is available, return an empty line.',
	},
	es: {
		intro: (firstName) => `Genera preguntas naturales para hacerle a ${firstName} en tu próximo encuentro.`,
		activeTopics: 'TEMAS ACTIVOS',
		recentNotes: 'NOTAS RECIENTES (resúmenes)',
		resolvedTopics: 'TEMAS RECIENTEMENTE RESUELTOS',
		profileInfo: 'INFORMACIÓN DEL PERFIL',
		rules: `REGLAS ABSOLUTAS:
1. Genera entre 1 y 3 preguntas MÁXIMO según la información disponible
2. PRIORIDAD: temas activos con fechas próximas
3. Si NO hay temas activos: usa info importante del perfil (trabajo, familia, pasiones)
4. Si un tema se resolvió positivamente, sugiere felicitar
5. Formulación natural, como hablarías a un amigo (tuteo)
6. NO RELLENES: si solo tienes una info relevante, genera UNA sola pregunta
7. NO REPITAS la misma información en varias preguntas
8. NUNCA inventes preguntas sobre temas no mencionados
9. Las preguntas deben invitar a compartir, no ser preguntas de sí/no
10. Máximo 15 palabras por pregunta

IMPORTANTE: Mejor 1 buena pregunta que 3 artificiales o repetitivas.`,
		format: 'FORMATO DE RESPUESTA:\nDevuelve entre 1 y 3 preguntas, una por línea, sin numeración ni guiones.',
		examples: `Ejemplos:
¿Cómo te fue en la entrevista en Google?
¿Entonces la mudanza a Madrid, ya está confirmada para marzo?`,
		noInfo: 'Si no hay info relevante disponible, devuelve una línea vacía.',
	},
	it: {
		intro: (firstName) => `Genera domande naturali da fare a ${firstName} durante il prossimo incontro.`,
		activeTopics: 'ARGOMENTI ATTIVI',
		recentNotes: 'NOTE RECENTI (riassunti)',
		resolvedTopics: 'ARGOMENTI RISOLTI DI RECENTE',
		profileInfo: 'INFORMAZIONI DEL PROFILO',
		rules: `REGOLE ASSOLUTE:
1. Genera tra 1 e 3 domande MASSIMO in base alle informazioni disponibili
2. PRIORITÀ: argomenti attivi con date vicine
3. Se NON ci sono argomenti attivi: usa info importanti del profilo (lavoro, famiglia, passioni)
4. Se un argomento è stato risolto positivamente, suggerisci di congratularsi
5. Formulazione naturale, come parleresti a un amico (dare del tu)
6. NON RIEMPIRE: se hai solo un'info rilevante, genera UNA sola domanda
7. NON RIPETERE la stessa informazione in più domande
8. MAI inventare domande su argomenti non menzionati
9. Le domande devono invitare a condividere, non essere domande sì/no
10. Massimo 15 parole per domanda

IMPORTANTE: Meglio 1 buona domanda che 3 artificiali o ripetitive.`,
		format: 'FORMATO DI RISPOSTA:\nRestituisci tra 1 e 3 domande, una per riga, senza numerazione né trattini.',
		examples: `Esempi:
Come è andato il colloquio da Google?
Allora il trasloco a Milano, è confermato per marzo?`,
		noInfo: 'Se non ci sono info rilevanti disponibili, restituisci una riga vuota.',
	},
	de: {
		intro: (firstName) => `Generiere natürliche Fragen, die du ${firstName} bei eurem nächsten Treffen stellen kannst.`,
		activeTopics: 'AKTIVE THEMEN',
		recentNotes: 'LETZTE NOTIZEN (Zusammenfassungen)',
		resolvedTopics: 'KÜRZLICH GELÖSTE THEMEN',
		profileInfo: 'PROFILINFORMATIONEN',
		rules: `ABSOLUTE REGELN:
1. Generiere zwischen 1 und 3 Fragen MAXIMUM basierend auf verfügbaren Informationen
2. PRIORITÄT: aktive Themen mit nahenden Terminen
3. Wenn KEINE aktiven Themen: nutze wichtige Profilinfos (Arbeit, Familie, Leidenschaften)
4. Wenn ein Thema positiv gelöst wurde, schlage vor zu gratulieren
5. Natürliche Formulierung, wie man mit einem Freund spricht (duzen)
6. NICHT AUFFÜLLEN: wenn du nur eine relevante Info hast, generiere EINE Frage
7. WIEDERHOLE NICHT dieselbe Information in mehreren Fragen
8. ERFINDE NIE Fragen zu nicht erwähnten Themen
9. Fragen sollten zum Teilen einladen, keine Ja/Nein-Fragen sein
10. Maximal 15 Wörter pro Frage

WICHTIG: Lieber 1 gute Frage als 3 künstliche oder repetitive.`,
		format: 'ANTWORTFORMAT:\nGib zwischen 1 und 3 Fragen zurück, eine pro Zeile, ohne Nummerierung oder Striche.',
		examples: `Beispiele:
Wie lief dein Vorstellungsgespräch bei Google?
Und der Umzug nach Berlin, steht der für März fest?`,
		noInfo: 'Wenn keine relevanten Infos verfügbar sind, gib eine leere Zeile zurück.',
	},
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
		const template = PROMPT_TEMPLATES[language] || PROMPT_TEMPLATES.fr;

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

		const prompt = `${template.intro(contact.firstName)}

${sortedActiveTopics.length > 0 ? `${template.activeTopics}:
${formatActiveTopics(sortedActiveTopics)}
` : ''}
${recentNotes && recentNotes.length > 0 ? `${template.recentNotes}:
${formatRecentNotes(recentNotes)}
` : ''}
${recentlyResolvedTopics.length > 0 ? `${template.resolvedTopics}:
${formatResolvedTopics(recentlyResolvedTopics)}
` : ''}
${facts.length > 0 ? `${template.profileInfo}:
${formatFacts(facts)}
` : ''}

${template.rules}

${template.format}

${template.examples}

${template.noInfo}
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
