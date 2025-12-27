import { Hono } from 'hono';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';
import { sanitize, getSecurityInstructions } from '../lib/security';
import { summaryRequestSchema } from '../lib/validation';
import { auditLog } from '../lib/audit';
import {
	createAIModel,
	getAIProviderName,
	getAIModel,
} from '../lib/ai-provider';
import { measurePerformance } from '../lib/performance-logger';

type Bindings = {
	XAI_API_KEY: string;
	CEREBRAS_API_KEY?: string;
	AI_PROVIDER?: 'grok' | 'cerebras';
	ENABLE_PERFORMANCE_LOGGING?: boolean;
	ENABLE_LANGFUSE?: string;
};

type SummaryRequest = {
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
	}>;
	language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const LANGUAGE_INSTRUCTIONS: Record<
	string,
	{ instruction: string; objective: string }
> = {
	fr: {
		instruction: 'Réponds en français uniquement.',
		objective:
			'Écrire 2-3 phrases qui permettent de se rappeler rapidement qui est cette personne avant de la revoir.',
	},
	en: {
		instruction: 'Respond in English only.',
		objective:
			'Write 2-3 sentences to quickly remember who this person is before seeing them again.',
	},
	es: {
		instruction: 'Responde solo en español.',
		objective:
			'Escribe 2-3 frases para recordar rápidamente quién es esta persona antes de volver a verla.',
	},
	it: {
		instruction: 'Rispondi solo in italiano.',
		objective:
			'Scrivi 2-3 frasi per ricordare velocemente chi è questa persona prima di rivederla.',
	},
	de: {
		instruction: 'Antworte nur auf Deutsch.',
		objective:
			'Schreibe 2-3 Sätze, um sich schnell daran zu erinnern, wer diese Person ist, bevor man sie wiedersieht.',
	},
};

export const summaryRoutes = new Hono<{ Bindings: Bindings }>();

summaryRoutes.use('/*', authMiddleware);

summaryRoutes.post('/', async (c) => {
	try {
		const body = await c.req.json();

		// Validate request body
		const validation = summaryRequestSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'summary',
				resource: 'summary',
				success: false,
				details: {
					error: 'Validation failed',
					issues: validation.error.issues,
				},
			});
			return c.json(
				{ error: 'Invalid input', details: validation.error.issues },
				400
			);
		}

		const { contact, facts } = validation.data;
		const language = validation.data.language || 'fr';
		const langConfig =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		// Catégoriser les facts par importance (profil uniquement, pas d'actualités)
		const professionalTypes = ['work', 'company', 'education'];
		const contextTypes = ['how_met', 'where_met', 'shared_ref'];
		const personalTypes = [
			'hobby',
			'sport',
			'origin',
			'location',
			'partner',
			'children',
		];

		const professionalFacts = facts.filter((fact) =>
			professionalTypes.includes(fact.factType)
		);
		const contextFacts = facts.filter((fact) =>
			contextTypes.includes(fact.factType)
		);
		const personalFacts = facts.filter((fact) =>
			personalTypes.includes(fact.factType)
		);

		const formatFacts = (factList: typeof facts) =>
			factList
				.map(
					(fact) =>
						`- ${sanitize(fact.factKey)}: ${sanitize(fact.factValue)}`
				)
				.join('\n');

		const prompt = `Tu es un assistant qui aide à se souvenir des gens. Génère un résumé concis et mémorable de cette personne.
${getSecurityInstructions(language)}
Réponds dans la langue : ${language}.

PERSONNE: ${sanitize(contact.firstName)}${
			contact.lastName ? ` ${sanitize(contact.lastName)}` : ''
		}

${
	professionalFacts.length > 0
		? `PROFESSIONNEL:\n${formatFacts(professionalFacts)}`
		: ''
}

${
	contextFacts.length > 0
		? `CONTEXTE DE RENCONTRE:\n${formatFacts(contextFacts)}`
		: ''
}

${personalFacts.length > 0 ? `PERSONNEL:\n${formatFacts(personalFacts)}` : ''}

OBJECTIF: ${langConfig.objective}

RÈGLES STRICTES:
- NE JAMAIS INVENTER d'informations absentes des données ci-dessus
- Si aucune circonstance de rencontre n'est fournie, NE PAS en mentionner
- Se concentrer sur ce qui est réellement connu de la personne, n'invente pas d'adjectifs qualificatifs ou de descriptions

HIÉRARCHIE D'IMPORTANCE (uniquement si l'info existe):
1. Trait distinctif personnel (ce qui rend la personne mémorable) - seulement si explicitement fourni
2. Métier/entreprise - seulement si explicitement fourni
3. Hobbies - seulement si explicitement fourni
4. Contexte de rencontre = seulement si explicitement fourni OU relation avec l'utilisateur si explicitement mentionnée

FORMAT:
- 2 ou 3 phrases fluides, ton neutre et professionnel, genre présentation objective
- Commence par l'info la plus importante
- Évite les formules génériques, sois spécifique
- environ 150 caractères
- Ne précise pas le nombre de caractères
- NE MENTIONNE PAS les actualités ou sujets en cours (ils sont traités séparément)
`;

		const providerConfig = {
			XAI_API_KEY: c.env.XAI_API_KEY,
			CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
			AI_PROVIDER: c.env.AI_PROVIDER,
			ENABLE_PERFORMANCE_LOGGING: c.env.ENABLE_PERFORMANCE_LOGGING,
			ENABLE_LANGFUSE: c.env.ENABLE_LANGFUSE,
		};

		const model = createAIModel(providerConfig);

		const { text } = await measurePerformance(
			() =>
				generateText({
					model,
					prompt,
				}),
			{
				route: '/summary',
				provider: getAIProviderName(providerConfig),
				model: getAIModel(providerConfig),
				operationType: 'text-generation',
				inputSize: new TextEncoder().encode(prompt).length,
				metadata: { language, factsCount: facts.length },
				enabled: !!(c.env.ENABLE_PERFORMANCE_LOGGING as boolean),
			}
		);

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'summary',
			resource: 'summary',
			success: true,
			details: { language, contact: contact.firstName },
		});

		return c.json({
			success: true,
			summary: text.trim(),
		});
	} catch (error) {
		console.error('Summary generation error:', error);
		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'summary',
			resource: 'summary',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Summary generation failed' }, 500);
	}
});
