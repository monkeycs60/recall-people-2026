import { Hono } from 'hono';
import { generateText, Output } from 'ai';
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

const PROMPT_TEMPLATES: Record<string, {
	intro: (contactName: string) => string;
	notesHeader: string;
	rules: string;
	goodExample: string;
	badExample: string;
	summaryLabel: string;
}> = {
	fr: {
		intro: (contactName) => `Tu génères un résumé factuel et concis de ${contactName}.`,
		notesHeader: 'NOTES (ordonnées chronologiquement de la plus ancienne à la plus récente)',
		rules: `RÈGLES ABSOLUES:
1. Résumé de 2-4 phrases maximum
2. Utilise des DATES ABSOLUES en texte complet (pas "récemment" mais "en janvier 2026", "le 25 janvier 2026")
3. FORMATAGE DES DATES: Écris les dates en texte complet avec le nom du mois (ex: "25 janvier 2026", "3 mars 2026"), JAMAIS en format numérique (pas de "25/01/2026" ou "03/03/2026")
4. N'invente RIEN - base-toi uniquement sur les notes fournies
5. N'INVENTE PAS DE DATES - ne mentionne une date que si elle est EXPLICITEMENT présente dans les notes (ex: "en mars 2026", "le 25 janvier", "dans 6 jours"). Si un événement est mentionné SANS date, décris-le SANS date. La date de création de la note N'EST PAS la date de l'événement.
6. Mentionne la situation actuelle (travail, projets en cours)
7. Mentionne les événements à venir importants s'il y en a
8. Si les notes sont contradictoires, privilégie l'info la plus récente
9. Style mémo humain avant de revoir la personne: concret, utile, sans lyrisme
10. Ne dis PAS "selon les notes" ou "d'après les informations"
11. Si jamais tu évoques l'utilisateur (le narrateur), utilise 'l'utilisateur' pour le désigner
12. Ne fais PAS une fiche à libellés ("Profil:", "Sujet actuel:", "Relation:"). Écris des phrases naturelles.
13. Si possible, garde une phrase pour le contexte durable et une phrase pour ce qu'il faut suivre maintenant.`,
		goodExample: `EXEMPLE BON:
"Marie est consultante chez Deloitte, en recherche d'un nouveau poste (entretien chez Google le 25 janvier 2026). Elle déménage à Lyon en mars 2026. Mère de Lucas qui fait du foot."`,
		badExample: `EXEMPLE MAUVAIS:
"Marie est une personne dynamique qui travaille beaucoup. Elle a plein de projets passionnants récemment."
"Marie a un entretien le 25/01/2026." (dates numériques interdites)`,
		summaryLabel: 'Résumé:',
	},
	en: {
		intro: (contactName) => `Generate a factual and concise summary of ${contactName}.`,
		notesHeader: 'NOTES (ordered chronologically from oldest to most recent)',
		rules: `ABSOLUTE RULES:
1. Summary of 2-4 sentences maximum
2. Use ABSOLUTE DATES in full text (not "recently" but "in January 2026", "on January 25, 2026")
3. DATE FORMAT: Write dates in full text with the month name (e.g., "January 25, 2026", "March 3, 2026"), NEVER in numeric format (no "01/25/2026" or "03/03/2026")
4. DON'T invent ANYTHING - only use information from the provided notes
5. DO NOT INVENT DATES - only mention a date if it is EXPLICITLY present in the notes (e.g., "in March 2026", "on January 25", "in 6 days"). If an event is mentioned WITHOUT a date, describe it WITHOUT a date. The note creation date is NOT the event date.
6. Mention the current situation (work, ongoing projects)
7. Mention important upcoming events if any
8. If notes are contradictory, prefer the most recent information
9. Factual and concise style: "Works at X. Interview scheduled for January 25, 2026. Has a child who does Y."
10. DON'T say "according to the notes" or "based on the information"
11. If you mention the user (the narrator), use 'the user' to refer to them`,
		goodExample: `GOOD EXAMPLE:
"Marie is a consultant at Deloitte, looking for a new position (interview at Google on January 25, 2026). She is moving to London in March 2026. Mother of Lucas who plays football."`,
		badExample: `BAD EXAMPLE:
"Marie is a dynamic person who works hard. She has lots of exciting projects recently."
"Marie has an interview on 01/25/2026." (numeric dates forbidden)`,
		summaryLabel: 'Summary:',
	},
	es: {
		intro: (contactName) => `Genera un resumen factual y conciso de ${contactName}.`,
		notesHeader: 'NOTAS (ordenadas cronológicamente de la más antigua a la más reciente)',
		rules: `REGLAS ABSOLUTAS:
1. Resumen de 2-4 oraciones máximo
2. Usa FECHAS ABSOLUTAS en texto completo (no "recientemente" sino "en enero de 2026", "el 25 de enero de 2026")
3. FORMATO DE FECHAS: Escribe las fechas en texto completo con el nombre del mes (ej: "25 de enero de 2026", "3 de marzo de 2026"), NUNCA en formato numérico (no "25/01/2026" ni "03/03/2026")
4. NO inventes NADA - baséate únicamente en las notas proporcionadas
5. NO INVENTES FECHAS - solo menciona una fecha si está EXPLÍCITAMENTE presente en las notas (ej: "en marzo de 2026", "el 25 de enero", "en 6 días"). Si un evento se menciona SIN fecha, descríbelo SIN fecha. La fecha de creación de la nota NO es la fecha del evento.
6. Menciona la situación actual (trabajo, proyectos en curso)
7. Menciona los eventos importantes próximos si los hay
8. Si las notas son contradictorias, prefiere la información más reciente
9. Estilo factual y conciso: "Trabaja en X. Entrevista prevista para el 25 de enero de 2026. Tiene un hijo que hace Y."
10. NO digas "según las notas" o "de acuerdo con la información"
11. Si mencionas al usuario (el narrador), usa 'el usuario' para referirte a él`,
		goodExample: `EJEMPLO BUENO:
"Marie es consultora en Deloitte, buscando un nuevo puesto (entrevista en Google el 25 de enero de 2026). Se muda a Madrid en marzo de 2026. Madre de Lucas que juega al fútbol."`,
		badExample: `EJEMPLO MALO:
"Marie es una persona dinámica que trabaja mucho. Tiene muchos proyectos emocionantes recientemente."
"Marie tiene una entrevista el 25/01/2026." (fechas numéricas prohibidas)`,
		summaryLabel: 'Resumen:',
	},
	it: {
		intro: (contactName) => `Genera un riassunto fattuale e conciso di ${contactName}.`,
		notesHeader: 'NOTE (ordinate cronologicamente dalla più vecchia alla più recente)',
		rules: `REGOLE ASSOLUTE:
1. Riassunto di 2-4 frasi massimo
2. Usa DATE ASSOLUTE in testo completo (non "recentemente" ma "a gennaio 2026", "il 25 gennaio 2026")
3. FORMATO DATE: Scrivi le date in testo completo con il nome del mese (es: "25 gennaio 2026", "3 marzo 2026"), MAI in formato numerico (no "25/01/2026" o "03/03/2026")
4. NON inventare NULLA - basati solo sulle note fornite
5. NON INVENTARE DATE - menziona una data solo se è ESPLICITAMENTE presente nelle note (es: "a marzo 2026", "il 25 gennaio", "tra 6 giorni"). Se un evento è menzionato SENZA data, descrivilo SENZA data. La data di creazione della nota NON è la data dell'evento.
6. Menziona la situazione attuale (lavoro, progetti in corso)
7. Menziona gli eventi importanti in arrivo se ce ne sono
8. Se le note sono contraddittorie, preferisci l'informazione più recente
9. Stile fattuale e conciso: "Lavora da X. Colloquio previsto per il 25 gennaio 2026. Ha un figlio che fa Y."
10. NON dire "secondo le note" o "in base alle informazioni"
11. Se menzioni l'utente (il narratore), usa 'l'utente' per riferirti a lui`,
		goodExample: `ESEMPIO BUONO:
"Marie è consulente presso Deloitte, in cerca di una nuova posizione (colloquio da Google il 25 gennaio 2026). Si trasferisce a Milano a marzo 2026. Madre di Lucas che gioca a calcio."`,
		badExample: `ESEMPIO CATTIVO:
"Marie è una persona dinamica che lavora molto. Ha tanti progetti emozionanti di recente."
"Marie ha un colloquio il 25/01/2026." (date numeriche vietate)`,
		summaryLabel: 'Riassunto:',
	},
	de: {
		intro: (contactName) => `Erstelle eine sachliche und prägnante Zusammenfassung von ${contactName}.`,
		notesHeader: 'NOTIZEN (chronologisch geordnet von der ältesten zur neuesten)',
		rules: `ABSOLUTE REGELN:
1. Zusammenfassung von maximal 2-4 Sätzen
2. Verwende ABSOLUTE DATEN im vollen Textformat (nicht "kürzlich" sondern "im Januar 2026", "am 25. Januar 2026")
3. DATUMSFORMAT: Schreibe Daten im vollen Textformat mit dem Monatsnamen (z.B.: "25. Januar 2026", "3. März 2026"), NIEMALS im numerischen Format (kein "25.01.2026" oder "03.03.2026")
4. Erfinde NICHTS - basiere dich nur auf die bereitgestellten Notizen
5. ERFINDE KEINE DATEN - erwähne ein Datum nur, wenn es EXPLIZIT in den Notizen steht (z.B.: "im März 2026", "am 25. Januar", "in 6 Tagen"). Wenn ein Ereignis OHNE Datum erwähnt wird, beschreibe es OHNE Datum. Das Erstellungsdatum der Notiz ist NICHT das Datum des Ereignisses.
6. Erwähne die aktuelle Situation (Arbeit, laufende Projekte)
7. Erwähne wichtige bevorstehende Ereignisse, falls vorhanden
8. Wenn die Notizen widersprüchlich sind, bevorzuge die neueste Information
9. Sachlicher und prägnanter Stil: "Arbeitet bei X. Vorstellungsgespräch geplant für den 25. Januar 2026. Hat ein Kind, das Y macht."
10. Sage NICHT "laut den Notizen" oder "basierend auf den Informationen"
11. Wenn du den Benutzer (den Erzähler) erwähnst, verwende 'der Benutzer' um auf ihn zu verweisen`,
		goodExample: `GUTES BEISPIEL:
"Marie ist Beraterin bei Deloitte, auf der Suche nach einer neuen Stelle (Vorstellungsgespräch bei Google am 25. Januar 2026). Sie zieht im März 2026 nach Berlin. Mutter von Lucas, der Fußball spielt."`,
		badExample: `SCHLECHTES BEISPIEL:
"Marie ist eine dynamische Person, die viel arbeitet. Sie hat viele aufregende Projekte in letzter Zeit."
"Marie hat ein Vorstellungsgespräch am 25.01.2026." (numerische Daten verboten)`,
		summaryLabel: 'Zusammenfassung:',
	},
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

		console.log('[Summary] Using AI provider:', c.env.AI_PROVIDER || 'cerebras');

		const template = PROMPT_TEMPLATES[language] || PROMPT_TEMPLATES.fr;

		const allTranscriptions = transcriptions.join('\n\n');

		const prompt = `${template.intro(contactName)}

${template.notesHeader}:
${allTranscriptions}

${template.rules}

${template.goodExample}

${template.badExample}

${template.summaryLabel}`;

		console.log('[Summary] Prompt length:', prompt.length);
		console.log('[Summary] Creating AI model...');

		const model = createAIModel(providerConfig);

		console.log('[Summary] Calling generateText with Output.object...');

		const { output } = await generateText({
			model,
			output: Output.object({ schema: summarySchema }),
			prompt,
		});

		const summary = output!.text;
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
