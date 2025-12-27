import { Hono } from 'hono';
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';
import { sanitize, SECURITY_INSTRUCTIONS_FR } from '../lib/security';

type Bindings = {
	XAI_API_KEY: string;
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
		const body = await c.req.json<SummaryRequest>();
		const { contact, facts } = body;

		const language = body.language || 'fr';
		const langConfig =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		const xai = createXai({
			apiKey: c.env.XAI_API_KEY,
		});

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
				.map((fact) => `- ${sanitize(fact.factKey)}: ${sanitize(fact.factValue)}`)
				.join('\n');

		const prompt = `Tu es un assistant qui aide à se souvenir des gens. Génère un résumé concis et mémorable de cette personne.
${SECURITY_INSTRUCTIONS_FR}
Réponds dans la langue : ${language}.

PERSONNE: ${sanitize(contact.firstName)}${contact.lastName ? ` ${sanitize(contact.lastName)}` : ''}

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

HIÉRARCHIE D'IMPORTANCE:
1. Trait distinctif personnel = ce qui rend la personne mémorable
2. Métier/entreprise = identité professionnelle
3. Comment on s'est rencontrés = contexte relationnel

FORMAT:
- 2 ou 3 phrases fluides, ton neutre et professionnel, genre présentation objective
- Commence par l'info la plus importante
- Évite les formules génériques, sois spécifique
- environ 150 caractères
- Ne précise pas le nombre de caractères
- NE MENTIONNE PAS les actualités ou sujets en cours (ils sont traités séparément)
`;

		const { text } = await generateText({
			model: xai('grok-4-1-fast'),
			prompt,
		});

		return c.json({
			success: true,
			summary: text.trim(),
		});
	} catch (error) {
		console.error('Summary generation error:', error);
		return c.json({ error: 'Summary generation failed' }, 500);
	}
});
