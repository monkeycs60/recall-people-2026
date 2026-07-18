import { Hono } from 'hono';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';
import { suggestedQuestionsRequestSchema } from '../lib/validation';
import { auditLog } from '../lib/audit';
import { createTracedAIModel, getAIModel } from '../lib/ai-provider';
import { getLangfuseClient } from '../lib/telemetry';
import { captureServerException } from '../lib/posthog';

type Bindings = {
	OPENAI_API_KEY?: string;
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'openai' | 'grok' | 'cerebras';
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
		intro: (firstName) => `Tu aides l'utilisateur à préparer sa prochaine conversation avec ${firstName}. Ton job : lui souffler 1 à 3 questions plausibles qu'il pourrait vraiment poser, comme un bon ami qui se souvient des détails. Pas du contenu généré : des questions ancrées dans ce que tu sais, avec un ton humain.`,
		activeTopics: 'ACTUALITÉS ACTIVES',
		recentNotes: 'DERNIÈRES NOTES (transcription complète)',
		resolvedTopics: 'ACTUALITÉS RÉCEMMENT RÉSOLUES',
		profileInfo: 'INFORMATIONS SUR LE PROFIL',
		rules: `RÈGLES:
1. Vise 3 questions, une par catégorie : [ask], [followUp], [remember]. Si tu n'as pas assez de matière pour remplir une catégorie naturellement, mieux vaut en donner 1 ou 2 bonnes que 3 bidons.
2. Définition des catégories :
   - [ask] : curiosité sur un sujet vivant, un projet en cours, un truc qui arrive bientôt
   - [followUp] : relancer sur un truc évoqué la dernière fois (un événement passé, un projet en attente, un sujet déjà discuté)
   - [remember] : montrer qu'on se souvient d'un détail perso (passion, lieu, anecdote) — pas forcément une question, peut être une accroche
3. PRIORITÉ aux actualités actives avec date proche, puis aux notes récentes, puis aux infos du profil
4. Si une actualité est résolue positivement, propose de féliciter
5. Tu en mode ami, naturel, contracté ("t'as", "ça donne quoi", "du coup") — PAS "Comment va ton projet de X ?" qui sonne IA
6. Ancre chaque question dans un DÉTAIL concret (nom de boîte, lieu, prénom, contexte). Pas de question générique.
7. Maximum 18 mots par question
8. Ne répète JAMAIS la même info dans 2 questions
9. N'invente JAMAIS un sujet, une date, un lieu ou une personne qui n'est pas dans la matière fournie
10. Les questions doivent inviter à partager (pas oui/non)
11. Si une actualité fournit une date ISO, ne la transforme jamais en "demain", "aujourd'hui", etc. Utilise une date naturelle ("3 juin") ou omets la date. Jamais de format ISO dans la question.

❌ À ÉVITER (trop IA, trop bateau) :
"Comment avance ton projet de X ?"
"As-tu eu des nouvelles concernant Y ?"
"Que penses-tu de Z ?"
"Tu fais quoi en ce moment ?"

✅ STYLE VISÉ :
"T'as eu le retour de Lumina sur le pilot follow-up de vendredi ?"
"Du coup le 18 juin avec Pauline, c'est confirmé ?"
"T'as posé tes cartons à Lyon finalement ?"`,
		format: `FORMAT DE RÉPONSE:
Une question par ligne, préfixée par sa catégorie entre crochets. Sans numérotation ni tirets.
Exemple :
[ask] Ta question ici
[followUp] Ta question ici
[remember] Ta question ici`,
		examples: `Exemples concrets:
[ask] T'as eu un retour sur le pilot follow-up pour vendredi ?
[followUp] Du coup le workshop du 18 juin, t'as bouclé l'agenda ?
[remember] T'as fini par trouver un coworking sympa près de Part-Dieu ?`,
		noInfo: "Si aucune info pertinente n'est disponible, retourne une ligne vide.",
	},
	en: {
		intro: (firstName) => `Help the user prep their next conversation with ${firstName}. Your job: suggest 1 to 3 plausible questions they could actually ask, like a good friend who remembers the details. Not generated content — questions anchored in what you know, with a human tone.`,
		activeTopics: 'ACTIVE TOPICS',
		recentNotes: 'RECENT NOTES (full transcription)',
		resolvedTopics: 'RECENTLY RESOLVED TOPICS',
		profileInfo: 'PROFILE INFORMATION',
		rules: `RULES:
1. Aim for 3 questions, one per category: [ask], [followUp], [remember]. If you don't have enough material to fill a category naturally, give 1 or 2 good ones rather than 3 weak ones.
2. Category definitions:
   - [ask] : curiosity about a live topic, ongoing project, something coming up soon
   - [followUp] : circling back on something mentioned last time (a past event, pending project, topic already discussed)
   - [remember] : showing you remember a personal detail (passion, place, anecdote) — doesn't have to be a question, can be an opener
3. PRIORITY to active topics with near-term dates, then recent notes, then profile info
4. If a topic resolved positively, suggest congratulating
5. Friend mode, natural, contracted ("how'd that go", "what's the deal with", "any update on") — NOT "How is your X project going?" which sounds AI
6. Anchor every question in a CONCRETE detail (company name, place, first name, context). No generic questions.
7. Max 18 words per question
8. NEVER repeat the same info across questions
9. NEVER invent a topic, date, place, or person not in the provided material
10. Questions must invite sharing (no yes/no)
11. If a topic provides an ISO date, never rewrite it as "tomorrow", "today", etc. Use a natural date ("June 3") or omit. Never output ISO format.

❌ AVOID (too AI, too bland):
"How is your X project going?"
"Have you heard anything about Y?"
"What do you think about Z?"
"What have you been up to?"

✅ AIM FOR:
"Did Lumina get back to you on the pilot follow-up for Friday?"
"So the June 18 workshop with Pauline, that locked in?"
"Did you end up finding a place in London?"`,
		format: `RESPONSE FORMAT:
One question per line, prefixed with its category in brackets. No numbering or dashes.
Example:
[ask] Your question here
[followUp] Your question here
[remember] Your question here`,
		examples: `Concrete examples:
[ask] Did you hear back on the pilot follow-up for Friday?
[followUp] So the June 18 workshop, did you lock in the agenda?
[remember] Did you ever find a decent coworking spot near Part-Dieu?`,
		noInfo: 'If no relevant info is available, return an empty line.',
	},
	es: {
		intro: (firstName) => `Ayuda al usuario a preparar su próxima conversación con ${firstName}. Tu trabajo: sugerirle 1 a 3 preguntas plausibles que podría hacer de verdad, como un buen amigo que se acuerda de los detalles. Nada de contenido generado: preguntas ancladas en lo que sabes, con tono humano.`,
		activeTopics: 'TEMAS ACTIVOS',
		recentNotes: 'NOTAS RECIENTES (transcripción completa)',
		resolvedTopics: 'TEMAS RECIENTEMENTE RESUELTOS',
		profileInfo: 'INFORMACIÓN DEL PERFIL',
		rules: `REGLAS:
1. Apunta a 3 preguntas, una por categoría: [ask], [followUp], [remember]. Si no tienes suficiente material para llenar una categoría de forma natural, mejor 1 o 2 buenas que 3 flojas.
2. Definición de categorías:
   - [ask] : curiosidad sobre un tema vivo, proyecto en curso, algo que viene pronto
   - [followUp] : retomar algo mencionado la última vez (evento pasado, proyecto pendiente, tema ya hablado)
   - [remember] : mostrar que recuerdas un detalle personal (pasión, lugar, anécdota) — no tiene que ser pregunta, puede ser apertura
3. PRIORIDAD a temas activos con fechas cercanas, después notas recientes, después info de perfil
4. Si un tema se resolvió positivamente, sugiere felicitar
5. Modo amigo, natural, contraído — NO "¿Cómo va tu proyecto de X?" que suena a IA
6. Ancla cada pregunta en un DETALLE concreto (nombre de empresa, lugar, nombre, contexto). Nada genérico.
7. Máximo 18 palabras por pregunta
8. NUNCA repitas la misma info en varias preguntas
9. NUNCA inventes tema, fecha, lugar o persona que no esté en la materia
10. Las preguntas deben invitar a compartir (no sí/no)
11. Si un tema da una fecha ISO, nunca la cambies por "mañana", "hoy", etc. Usa fecha natural ("3 de junio") u omítela. Nunca formato ISO.

❌ A EVITAR (demasiado IA, demasiado plano):
"¿Cómo va tu proyecto de X?"
"¿Has tenido noticias de Y?"
"¿Qué piensas sobre Z?"

✅ ESTILO BUSCADO:
"¿Te respondió Lumina sobre el pilot follow-up del viernes?"
"Entonces el workshop del 18 de junio, ¿está confirmado?"
"¿Acabaste encontrando un coworking guay cerca de Part-Dieu?"`,
		format: `FORMATO DE RESPUESTA:
Una pregunta por línea, prefijada con su categoría entre corchetes. Sin numeración ni guiones.
Ejemplo:
[ask] Tu pregunta aquí
[followUp] Tu pregunta aquí
[remember] Tu pregunta aquí`,
		examples: `Ejemplos concretos:
[ask] ¿Tuviste respuesta sobre el pilot follow-up del viernes?
[followUp] Entonces el workshop del 18 de junio, ¿cerraste la agenda?
[remember] ¿Encontraste al final un coworking decente cerca de Part-Dieu?`,
		noInfo: 'Si no hay info relevante disponible, devuelve una línea vacía.',
	},
	it: {
		intro: (firstName) => `Aiuta l'utente a preparare la sua prossima conversazione con ${firstName}. Il tuo compito: suggerire da 1 a 3 domande plausibili che potrebbe davvero porre, come un buon amico che si ricorda i dettagli. Non contenuto generato: domande ancorate a ciò che sai, con tono umano.`,
		activeTopics: 'ARGOMENTI ATTIVI',
		recentNotes: 'NOTE RECENTI (trascrizione completa)',
		resolvedTopics: 'ARGOMENTI RISOLTI DI RECENTE',
		profileInfo: 'INFORMAZIONI DEL PROFILO',
		rules: `REGOLE:
1. Punta a 3 domande, una per categoria: [ask], [followUp], [remember]. Se non hai abbastanza materiale per riempire una categoria in modo naturale, meglio 1 o 2 buone che 3 deboli.
2. Definizione delle categorie:
   - [ask] : curiosità su un argomento vivo, progetto in corso, qualcosa che arriva presto
   - [followUp] : riprendere qualcosa menzionato l'ultima volta (evento passato, progetto in sospeso, argomento già discusso)
   - [remember] : mostrare di ricordare un dettaglio personale (passione, luogo, aneddoto) — non deve essere una domanda, può essere un'apertura
3. PRIORITÀ agli argomenti attivi con date vicine, poi note recenti, poi info del profilo
4. Se un argomento è stato risolto positivamente, suggerisci di congratularsi
5. Modalità amico, naturale, contratta — NON "Come va il tuo progetto di X?" che suona IA
6. Ancora ogni domanda in un DETTAGLIO concreto (nome azienda, luogo, nome, contesto). Niente di generico.
7. Massimo 18 parole per domanda
8. MAI ripetere la stessa info in più domande
9. MAI inventare argomento, data, luogo o persona che non sia nel materiale
10. Le domande devono invitare a condividere (no sì/no)
11. Se un argomento dà una data ISO, mai trasformarla in "domani", "oggi", ecc. Usa data naturale ("3 giugno") o omettila. Mai formato ISO.

❌ DA EVITARE (troppo IA, troppo piatto):
"Come va il tuo progetto di X?"
"Hai avuto notizie di Y?"
"Cosa pensi di Z?"

✅ STILE PUNTATO:
"Ti ha risposto Lumina sul pilot follow-up di venerdì?"
"Quindi il workshop del 18 giugno, è confermato?"
"Hai trovato alla fine un coworking decente vicino Part-Dieu?"`,
		format: `FORMATO DI RISPOSTA:
Una domanda per riga, preceduta dalla categoria tra parentesi quadre. Senza numerazione né trattini.
Esempio:
[ask] La tua domanda qui
[followUp] La tua domanda qui
[remember] La tua domanda qui`,
		examples: `Esempi concreti:
[ask] Hai avuto risposta sul pilot follow-up per venerdì?
[followUp] Quindi il workshop del 18 giugno, hai chiuso l'agenda?
[remember] Hai trovato alla fine un coworking decente vicino Part-Dieu?`,
		noInfo: 'Se non ci sono info rilevanti, restituisci una riga vuota.',
	},
	de: {
		intro: (firstName) => `Hilf dem Nutzer, sein nächstes Gespräch mit ${firstName} vorzubereiten. Deine Aufgabe: 1 bis 3 plausible Fragen vorschlagen, die er wirklich stellen könnte, wie ein guter Freund, der sich an Details erinnert. Kein generierter Content: Fragen, die in dem verankert sind, was du weißt, mit menschlichem Ton.`,
		activeTopics: 'AKTIVE THEMEN',
		recentNotes: 'LETZTE NOTIZEN (vollständige Transkription)',
		resolvedTopics: 'KÜRZLICH GELÖSTE THEMEN',
		profileInfo: 'PROFILINFORMATIONEN',
		rules: `REGELN:
1. Ziel sind 3 Fragen, eine pro Kategorie: [ask], [followUp], [remember]. Wenn du nicht genug Material hast, um eine Kategorie natürlich zu füllen, lieber 1 oder 2 gute als 3 schwache.
2. Kategoriedefinitionen:
   - [ask] : Neugier auf ein lebendiges Thema, laufendes Projekt, etwas das bald ansteht
   - [followUp] : Auf etwas zurückkommen, was beim letzten Mal erwähnt wurde (vergangenes Ereignis, anhängiges Projekt, schon besprochenes Thema)
   - [remember] : Zeigen, dass du dich an ein persönliches Detail erinnerst (Leidenschaft, Ort, Anekdote) — muss keine Frage sein, kann ein Aufhänger sein
3. PRIORITÄT bei aktiven Themen mit nahem Datum, dann letzte Notizen, dann Profilinfos
4. Wenn ein Thema positiv gelöst wurde, schlage vor zu gratulieren
5. Freundes-Modus, natürlich, kontrahiert — NICHT "Wie läuft dein X-Projekt?" das klingt nach KI
6. Verankere jede Frage in einem KONKRETEN Detail (Firmenname, Ort, Name, Kontext). Nichts Generisches.
7. Max. 18 Wörter pro Frage
8. NIE die gleiche Info in mehreren Fragen wiederholen
9. NIE Thema, Datum, Ort oder Person erfinden, die nicht im Material steht
10. Fragen müssen zum Teilen einladen (kein Ja/Nein)
11. Wenn ein Thema ein ISO-Datum liefert, formuliere es nie als "morgen", "heute", usw. Verwende ein natürliches Datum ("3. Juni") oder lass es weg. Nie ISO-Format.

❌ ZU VERMEIDEN (zu KI, zu flach):
"Wie läuft dein X-Projekt?"
"Hast du was von Y gehört?"
"Was hältst du von Z?"

✅ STIL-ZIEL:
"Hat Lumina sich wegen des Pilot-Follow-ups für Freitag gemeldet?"
"Also der Workshop am 18. Juni, ist der fix?"
"Hast du am Ende ein gutes Coworking nahe Part-Dieu gefunden?"`,
		format: `ANTWORTFORMAT:
Eine Frage pro Zeile, mit der Kategorie in eckigen Klammern. Ohne Nummerierung oder Striche.
Beispiel:
[ask] Deine Frage hier
[followUp] Deine Frage hier
[remember] Deine Frage hier`,
		examples: `Konkrete Beispiele:
[ask] Hat sich Lumina wegen des Pilot-Follow-ups für Freitag gemeldet?
[followUp] Also der Workshop am 18. Juni, hast du die Agenda durch?
[remember] Hast du am Ende ein gutes Coworking nahe Part-Dieu gefunden?`,
		noInfo: 'Wenn keine relevanten Infos verfügbar sind, gib eine leere Zeile zurück.',
	},
};

type Variables = {
	user: import('@prisma/client').User;
};

export type SuggestedQuestionCategory = 'ask' | 'followUp' | 'remember';

export type SuggestedQuestion = {
	category: SuggestedQuestionCategory | null;
	text: string;
};

const CATEGORY_ALIASES: Record<string, SuggestedQuestionCategory> = {
	ask: 'ask',
	'ask about': 'ask',
	followup: 'followUp',
	'follow up': 'followUp',
	'follow-up': 'followUp',
	remember: 'remember',
};

export const parseSuggestedQuestionsText = (text: string): SuggestedQuestion[] => {
	const lines = text
		.trim()
		.split('\n')
		.map((line) => line.trim().replace(/^[-•*]?\s*\d+[\).\-\s]+/, '').replace(/^[-•*]\s+/, '').trim())
		.filter((line) => line.length > 0);

	const seenCategories = new Set<SuggestedQuestionCategory>();
	const result: SuggestedQuestion[] = [];

	for (const line of lines) {
		const match = line.match(/^\[(.+?)\]\s*(.+)$/);
		let category: SuggestedQuestionCategory | null = null;
		let body = line;

		if (match) {
			const tag = match[1].trim().toLowerCase();
			category = CATEGORY_ALIASES[tag] ?? null;
			body = match[2].trim();
		}

		if (!body) continue;
		if (category && seenCategories.has(category)) continue;
		if (category) seenCategories.add(category);

		result.push({ category, text: body });
		if (result.length === 3) break;
	}

	return result;
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
					return `[${note.createdAt}] ${note.title || 'Note'}:\n${note.transcription}`;
				})
				.join('\n\n---\n\n') || '';

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
		};

		const model = createTracedAIModel(providerConfig, {
			distinctId: c.get('user')?.id,
			properties: {
				feature: 'suggested-questions',
				route: '/api/suggested-questions',
				language,
			},
		});
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

		const suggestedQuestions: SuggestedQuestion[] = parseSuggestedQuestionsText(text);

		// Update Langfuse generation with output
		generation?.end({ output: suggestedQuestions });
		trace?.update({ output: { success: true, suggestedQuestions } });

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: true,
			details: { language, count: suggestedQuestions.length },
		});

		return c.json({
			success: true,
			suggestedQuestions,
		});
	} catch (error) {
		console.error('Suggested questions generation error:', error);
		trace?.update({ output: { error: String(error) } });
		captureServerException(error, c.get('user')?.id, {
			feature: 'suggested-questions',
			route: '/api/suggested-questions',
			provider: c.env.AI_PROVIDER || 'cerebras',
			stage: 'generate-text',
		});
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
