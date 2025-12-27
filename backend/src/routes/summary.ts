import { Hono } from 'hono';
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';

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
		const { contact, facts, hotTopics } = body;

		const language = body.language || 'fr';
		const langConfig =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		const xai = createXai({
			apiKey: c.env.XAI_API_KEY,
		});

		// Catégoriser les facts par importance
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

		const activeTopics = hotTopics.filter(
			(topic) => topic.status === 'active'
		);

		const formatFacts = (factList: typeof facts) =>
			factList
				.map((fact) => `- ${fact.factKey}: ${fact.factValue}`)
				.join('\n');

		const prompt = `Tu es un assistant qui aide à se souvenir des gens. Génère un résumé concis et mémorable de cette personne.
    Réponds dans la langue : ${language}.

PERSONNE: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}

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

${
	activeTopics.length > 0
		? `ACTUALITÉS (sujets en cours - PRIORITAIRE):\n${activeTopics
				.map(
					(topic) =>
						`- ${topic.title}${topic.context ? `: ${topic.context}` : ''}`
				)
				.join('\n')}`
		: ''
}

OBJECTIF: ${langConfig.objective}

HIÉRARCHIE D'IMPORTANCE:
1. Trait distinctif personnel = ce qui rend la personne mémorable
2. Métier/entreprise = identité professionnelle
3. Comment on s'est rencontrés = contexte relationnel
4. ACTUALITÉS en cours (si présentes) = info la plus utile pour reprendre contact

FORMAT:
- 2, 3 ou 4 phrases fluides, ton neutre et professionnel, genre présentation objective
- Commence par l'info la plus importante et termine ton résumé par la plus pertinente pour une prochaine interaction
- Si actualité en cours, l'intégrer naturellement (ex: "qui prépare actuellement son marathon")
- Évite les formules génériques, sois spécifique
- environ 200 caractères
- Ne précise pas le nombre de caractères
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
