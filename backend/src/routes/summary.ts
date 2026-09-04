import { Hono } from 'hono';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { createTracedAIModel, AIProviderConfig, getStructuredOutputSettings } from '../lib/ai-provider';
import { evaluateSummary } from '../lib/evaluators';
import { captureServerException } from '../lib/posthog';
import type { User } from '@prisma/client';

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

type Variables = {
	user: User;
};

type SummaryRequest = {
	contactName: string;
	transcriptions: string[];
	language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const summarySchema = z.object({
	text: z.string().describe('Résumé ultra-concis: 1 phrase courte par défaut, 2 phrases maximum si indispensable'),
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
		intro: (contactName) => `Tu génères un résumé factuel ultra-concis de ${contactName}.`,
		notesHeader: 'NOTES (ordonnées chronologiquement de la plus ancienne à la plus récente)',
		rules: `RÈGLES ABSOLUES:
1. Résumé ultra-court: 1 phrase factuelle par défaut, 2 phrases maximum seulement si indispensable. Vise 120-180 caractères.
2. Utilise des DATES ABSOLUES en texte complet (pas "récemment" mais "en janvier 2026", "le 25 janvier 2026")
3. FORMATAGE DES DATES: Écris les dates en texte complet avec le nom du mois (ex: "25 janvier 2026", "3 mars 2026"), JAMAIS en format numérique (pas de "25/01/2026" ou "03/03/2026")
4. N'invente RIEN - base-toi uniquement sur les notes fournies
5. N'INVENTE PAS DE DATES - ne mentionne une date que si elle est EXPLICITEMENT présente dans les notes (ex: "en mars 2026", "le 25 janvier", "dans 6 jours"). Si un événement est mentionné SANS date, décris-le SANS date. La date de création de la note N'EST PAS la date de l'événement.
6. Priorise les essentiels durables: rôle, contexte de relation, situation stable, préférences vraiment utiles.
7. Ne priorise pas les suivis datés: la carte 90 jours les couvre déjà. Mentionne une date seulement si elle explique un contexte durable.
8. Si les notes sont contradictoires, privilégie l'info la plus récente
9. Style mémo humain avant de revoir la personne: concret, utile, sans lyrisme
10. Ne dis PAS "selon les notes" ou "d'après les informations"
11. Si jamais tu évoques l'utilisateur (le narrateur), utilise 'l'utilisateur' pour le désigner
12. Ne fais PAS une fiche à libellés ("Profil:", "Sujet actuel:", "Relation:"). Écris des phrases naturelles.
13. Si possible, garde une seule phrase centrée sur le contexte durable utile avant de revoir la personne
14. Si les notes mentionnent le contexte de rencontre (où, via qui, à quel événement), intègre-le brièvement sans l'étirer
15. Ignore les sections de notes qui sont déjà des suggestions ou questions à poser. Ne les transforme PAS en faits.
16. N'écris pas "l'utilisateur pourra". Formule directement le mémo comme une mémoire de contexte, sans appel à l'action.
17. Oublie les hobbies ou préférences vagues s'ils n'aident pas à comprendre la personne.
18. Ne dis pas "vous avez rencontré" ni "tu as rencontré". Pour le contexte de rencontre, écris plutôt "Rencontré lors de..." ou "Croisé via...".`,
		goodExample: `EXEMPLE BON:
"Responsable research chez Lumina Labs, rencontrée à un petit-déjeuner produit; préfère les échanges concis et les cafés calmes."`,
		badExample: `EXEMPLE MAUVAIS:
"Marie est une personne dynamique qui travaille beaucoup. Elle a plein de projets passionnants récemment."
"Marie a un entretien le 25/01/2026." (dates numériques interdites)`,
		summaryLabel: 'Résumé:',
	},
	en: {
		intro: (contactName) => `Generate an ultra-concise factual summary of ${contactName}.`,
		notesHeader: 'NOTES (ordered chronologically from oldest to most recent)',
		rules: `ABSOLUTE RULES:
1. Ultra-short summary: 1 factual sentence by default, 2 sentences maximum only if essential. Aim for 120-180 characters.
2. Use ABSOLUTE DATES in full text (not "recently" but "in January 2026", "on January 25, 2026")
3. DATE FORMAT: Write dates in full text with the month name (e.g., "January 25, 2026", "March 3, 2026"), NEVER in numeric format (no "01/25/2026" or "03/03/2026")
4. DON'T invent ANYTHING - only use information from the provided notes
5. DO NOT INVENT DATES - only mention a date if it is EXPLICITLY present in the notes (e.g., "in March 2026", "on January 25", "in 6 days"). If an event is mentioned WITHOUT a date, describe it WITHOUT a date. The note creation date is NOT the event date.
6. Prioritize durable essentials: role, relationship context, stable life context, and genuinely useful preferences.
7. Do not prioritize dated follow-ups; the 90-day card already handles them. Mention a date only if it explains durable context.
8. If notes are contradictory, prefer the most recent information
9. Factual and concise style: "Works at X. Met through Y. Prefers concise email."
10. DON'T say "according to the notes" or "based on the information"
11. If you mention the user (the narrator), use 'the user' to refer to them`,
		goodExample: `GOOD EXAMPLE:
"Customer research lead at Lumina Labs, met at a product breakfast; prefers concise emails and quiet coffee."`,
		badExample: `BAD EXAMPLE:
"Marie is a dynamic person who works hard. She has lots of exciting projects recently."
"Marie has an interview on 01/25/2026." (numeric dates forbidden)`,
		summaryLabel: 'Summary:',
	},
	es: {
		intro: (contactName) => `Genera un resumen factual y conciso de ${contactName}.`,
		notesHeader: 'NOTAS (ordenadas cronológicamente de la más antigua a la más reciente)',
		rules: `REGLAS ABSOLUTAS:
1. Resumen ultracorto: 1 oración factual por defecto, 2 oraciones máximo solo si es imprescindible. Apunta a 120-180 caracteres.
2. Usa FECHAS ABSOLUTAS en texto completo (no "recientemente" sino "en enero de 2026", "el 25 de enero de 2026")
3. FORMATO DE FECHAS: Escribe las fechas en texto completo con el nombre del mes (ej: "25 de enero de 2026", "3 de marzo de 2026"), NUNCA en formato numérico (no "25/01/2026" ni "03/03/2026")
4. NO inventes NADA - baséate únicamente en las notas proporcionadas
5. NO INVENTES FECHAS - solo menciona una fecha si está EXPLÍCITAMENTE presente en las notas (ej: "en marzo de 2026", "el 25 de enero", "en 6 días"). Si un evento se menciona SIN fecha, descríbelo SIN fecha. La fecha de creación de la nota NO es la fecha del evento.
6. Prioriza los esenciales duraderos: rol, contexto de relación, situación estable y preferencias realmente útiles.
7. No priorices seguimientos fechados: la tarjeta de 90 días ya los cubre. Menciona una fecha solo si explica un contexto duradero.
8. Si las notas son contradictorias, prefiere la información más reciente
9. Estilo factual y conciso: "Trabaja en X. La conociste por Y. Prefiere emails concisos."
10. NO digas "según las notas" o "de acuerdo con la información"
11. Si mencionas al usuario (el narrador), usa 'el usuario' para referirte a él`,
		goodExample: `EJEMPLO BUENO:
"Responsable de research en Lumina Labs, conocida en un desayuno de producto; prefiere emails concisos y cafés tranquilos."`,
		badExample: `EJEMPLO MALO:
"Marie es una persona dinámica que trabaja mucho. Tiene muchos proyectos emocionantes recientemente."
"Marie tiene una entrevista el 25/01/2026." (fechas numéricas prohibidas)`,
		summaryLabel: 'Resumen:',
	},
	it: {
		intro: (contactName) => `Genera un riassunto fattuale e conciso di ${contactName}.`,
		notesHeader: 'NOTE (ordinate cronologicamente dalla più vecchia alla più recente)',
		rules: `REGOLE ASSOLUTE:
1. Riassunto ultra-breve: 1 frase fattuale di default, 2 frasi massimo solo se indispensabile. Punta a 120-180 caratteri.
2. Usa DATE ASSOLUTE in testo completo (non "recentemente" ma "a gennaio 2026", "il 25 gennaio 2026")
3. FORMATO DATE: Scrivi le date in testo completo con il nome del mese (es: "25 gennaio 2026", "3 marzo 2026"), MAI in formato numerico (no "25/01/2026" o "03/03/2026")
4. NON inventare NULLA - basati solo sulle note fornite
5. NON INVENTARE DATE - menziona una data solo se è ESPLICITAMENTE presente nelle note (es: "a marzo 2026", "il 25 gennaio", "tra 6 giorni"). Se un evento è menzionato SENZA data, descrivilo SENZA data. La data di creazione della nota NON è la data dell'evento.
6. Dai priorità agli elementi durevoli: ruolo, contesto della relazione, situazione stabile e preferenze davvero utili.
7. Non dare priorità ai follow-up con data: la card 90 giorni li copre già. Menziona una data solo se spiega un contesto durevole.
8. Se le note sono contraddittorie, preferisci l'informazione più recente
9. Stile fattuale e conciso: "Lavora da X. Conosciuta tramite Y. Preferisce email concise."
10. NON dire "secondo le note" o "in base alle informazioni"
11. Se menzioni l'utente (il narratore), usa 'l'utente' per riferirti a lui`,
		goodExample: `ESEMPIO BUONO:
"Responsabile research da Lumina Labs, conosciuta a una colazione product; preferisce email concise e caffè tranquilli."`,
		badExample: `ESEMPIO CATTIVO:
"Marie è una persona dinamica che lavora molto. Ha tanti progetti emozionanti di recente."
"Marie ha un colloquio il 25/01/2026." (date numeriche vietate)`,
		summaryLabel: 'Riassunto:',
	},
	de: {
		intro: (contactName) => `Erstelle eine sachliche und prägnante Zusammenfassung von ${contactName}.`,
		notesHeader: 'NOTIZEN (chronologisch geordnet von der ältesten zur neuesten)',
		rules: `ABSOLUTE REGELN:
1. Ultrakurze Zusammenfassung: standardmäßig 1 sachlicher Satz, maximal 2 Sätze nur wenn nötig. Ziel: 120-180 Zeichen.
2. Verwende ABSOLUTE DATEN im vollen Textformat (nicht "kürzlich" sondern "im Januar 2026", "am 25. Januar 2026")
3. DATUMSFORMAT: Schreibe Daten im vollen Textformat mit dem Monatsnamen (z.B.: "25. Januar 2026", "3. März 2026"), NIEMALS im numerischen Format (kein "25.01.2026" oder "03.03.2026")
4. Erfinde NICHTS - basiere dich nur auf die bereitgestellten Notizen
5. ERFINDE KEINE DATEN - erwähne ein Datum nur, wenn es EXPLIZIT in den Notizen steht (z.B.: "im März 2026", "am 25. Januar", "in 6 Tagen"). Wenn ein Ereignis OHNE Datum erwähnt wird, beschreibe es OHNE Datum. Das Erstellungsdatum der Notiz ist NICHT das Datum des Ereignisses.
6. Priorisiere dauerhafte Kerndaten: Rolle, Beziehungskontext, stabile Lebenslage und wirklich nützliche Vorlieben.
7. Priorisiere keine datierten Follow-ups; die 90-Tage-Karte deckt sie bereits ab. Nenne ein Datum nur, wenn es dauerhaften Kontext erklärt.
8. Wenn die Notizen widersprüchlich sind, bevorzuge die neueste Information
9. Sachlicher und prägnanter Stil: "Arbeitet bei X. Über Y kennengelernt. Bevorzugt knappe E-Mails."
10. Sage NICHT "laut den Notizen" oder "basierend auf den Informationen"
11. Wenn du den Benutzer (den Erzähler) erwähnst, verwende 'der Benutzer' um auf ihn zu verweisen`,
		goodExample: `GUTES BEISPIEL:
"Research-Leiterin bei Lumina Labs, bei einem Produktfrühstück kennengelernt; bevorzugt knappe E-Mails und ruhige Cafés."`,
		badExample: `SCHLECHTES BEISPIEL:
"Marie ist eine dynamische Person, die viel arbeitet. Sie hat viele aufregende Projekte in letzter Zeit."
"Marie hat ein Vorstellungsgespräch am 25.01.2026." (numerische Daten verboten)`,
		summaryLabel: 'Zusammenfassung:',
	},
};

export const summaryRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

summaryRoutes.use('/*', authMiddleware);

summaryRoutes.post('/', async (c) => {
	console.log('[Summary] Starting summary generation...');

	try {
		const body = await c.req.json<SummaryRequest>();
		const { contactName, transcriptions, language = 'fr' } = body;

		console.log('[Summary] Request received:', {
			transcriptionsCount: transcriptions?.length || 0,
			transcriptionsLength: transcriptions?.reduce((total, value) => total + value.length, 0) || 0,
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

		const model = createTracedAIModel(providerConfig, {
			distinctId: c.get('user')?.id,
			properties: {
				feature: 'summary',
				route: '/api/summary',
				language,
			},
		});

		console.log('[Summary] Calling generateText with Output.object...');

		// gpt-oss-120b intermittently returns output that fails schema
		// validation (NoObjectGeneratedError); retrying makes it reliable.
		const MAX_GENERATION_ATTEMPTS = 3;
		let output: z.infer<typeof summarySchema> | undefined;
		for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
			try {
				const result = await generateText({
					model,
					output: Output.object({ schema: summarySchema }),
					prompt,
					...getStructuredOutputSettings(),
				});
				output = result.output;
				break;
			} catch (generationError) {
				if (attempt === MAX_GENERATION_ATTEMPTS) {
					throw generationError;
				}
				console.warn(
					`[Summary] Structured generation failed (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}), retrying:`,
					generationError instanceof Error
						? generationError.message
						: String(generationError)
				);
			}
		}

		const summary = output!.text;
		console.log('[Summary] Success! Generated summary:', { summaryLength: summary.length });

		// Run evaluation in background (non-blocking)
		if (c.env.ENABLE_EVALUATION === 'true' && c.env.OPENAI_API_KEY && c.executionCtx) {
			c.executionCtx.waitUntil(
				evaluateSummary(contactName, transcriptions, summary, {
					OPENAI_API_KEY: c.env.OPENAI_API_KEY,
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

		captureServerException(error, c.get('user')?.id, {
			feature: 'summary',
			route: '/api/summary',
			provider: c.env.AI_PROVIDER || 'cerebras',
			stage: 'generate-text',
		});

		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error';
		return c.json(
			{ error: 'Summary generation failed', details: errorMessage },
			500
		);
	}
});
