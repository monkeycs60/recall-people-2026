import { Hono } from 'hono';
import { createXai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';
import { iceBreakersRequestSchema } from '../lib/validation';
import { auditLog } from '../lib/audit';

type Bindings = {
	XAI_API_KEY: string;
};

type IceBreakersRequest = {
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
	{ instruction: string; withHotTopics: string; withoutHotTopics: string }
> = {
	fr: {
		instruction: 'Réponds en français uniquement.',
		withHotTopics:
			'Génère 2 questions basées sur les actualités/hot topics, puis 1 question de secours basée sur ses loisirs/passions/vie personnelle.',
		withoutHotTopics:
			'Génère 3 questions basées sur ses loisirs, passions, enfants, ou vie personnelle.',
	},
	en: {
		instruction: 'Respond in English only.',
		withHotTopics:
			'Generate 2 questions based on the news/hot topics, then 1 fallback question based on their hobbies/passions/personal life.',
		withoutHotTopics:
			'Generate 3 questions based on their hobbies, passions, children, or personal life.',
	},
	es: {
		instruction: 'Responde solo en español.',
		withHotTopics:
			'Genera 2 preguntas basadas en las noticias/temas actuales, luego 1 pregunta de respaldo basada en sus hobbies/pasiones/vida personal.',
		withoutHotTopics:
			'Genera 3 preguntas basadas en sus hobbies, pasiones, hijos o vida personal.',
	},
	it: {
		instruction: 'Rispondi solo in italiano.',
		withHotTopics:
			'Genera 2 domande basate sulle novità/argomenti attuali, poi 1 domanda di riserva basata sui suoi hobby/passioni/vita personale.',
		withoutHotTopics:
			'Genera 3 domande basate sui suoi hobby, passioni, figli o vita personale.',
	},
	de: {
		instruction: 'Antworte nur auf Deutsch.',
		withHotTopics:
			'Generiere 2 Fragen basierend auf den Neuigkeiten/aktuellen Themen, dann 1 Ausweichfrage basierend auf ihren Hobbys/Leidenschaften/Privatleben.',
		withoutHotTopics:
			'Generiere 3 Fragen basierend auf ihren Hobbys, Leidenschaften, Kindern oder Privatleben.',
	},
};

export const iceBreakersRoutes = new Hono<{ Bindings: Bindings }>();

iceBreakersRoutes.use('/*', authMiddleware);

iceBreakersRoutes.post('/', async (c) => {
	try {
		const body = await c.req.json();

		// Validate request body
		const validation = iceBreakersRequestSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				userId: c.get('user')?.id,
				action: 'extract',
				resource: 'extract',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { contact, facts, hotTopics } = validation.data;
		const language = validation.data.language || 'fr';
		const langConfig =
			LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr;

		const xai = createXai({
			apiKey: c.env.XAI_API_KEY,
		});

		const activeTopics = hotTopics.filter(
			(topic) => topic.status === 'active'
		);

		const hasHotTopics = activeTopics.length > 0;

		const personalTypes = [
			'hobby',
			'sport',
			'children',
			'partner',
			'pet',
			'origin',
			'location',
		];

		const personalFacts = facts.filter((fact) =>
			personalTypes.includes(fact.factType)
		);

		const formatFacts = (factList: typeof facts) =>
			factList
				.map((fact) => `- ${fact.factKey}: ${fact.factValue}`)
				.join('\n');

		const prompt = `Tu es un assistant qui aide à relancer des conversations avec des proches. ${langConfig.instruction}

PERSONNE: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}

${
	hasHotTopics
		? `ACTUALITÉS EN COURS (sujets chauds):\n${activeTopics
				.map(
					(topic) =>
						`- ${topic.title}${topic.context ? `: ${topic.context}` : ''}`
				)
				.join('\n')}`
		: ''
}

${personalFacts.length > 0 ? `VIE PERSONNELLE:\n${formatFacts(personalFacts)}` : ''}

OBJECTIF: ${hasHotTopics ? langConfig.withHotTopics : langConfig.withoutHotTopics}

RÈGLES:
- Chaque question doit être naturelle, comme si tu parlais à un ami
- Utilise le tutoiement
- Les questions doivent inviter à partager des nouvelles, pas juste "oui/non"
- Sois chaleureux et authentique
- Maximum 15 mots par question

FORMAT DE RÉPONSE:
Retourne EXACTEMENT 3 questions, une par ligne, sans numérotation ni tirets.
Exemple:
Alors ce marathon, la préparation avance bien ?
Et les enfants, ils s'adaptent à la nouvelle école ?
Tu as eu le temps de reprendre la guitare récemment ?
`;

		const { text } = await generateText({
			model: xai('grok-4-1-fast'),
			prompt,
		});

		const iceBreakers = text
			.trim()
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.slice(0, 3);

		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: true,
			details: { language, contact: contact.firstName, count: iceBreakers.length },
		});

		return c.json({
			success: true,
			iceBreakers,
		});
	} catch (error) {
		console.error('Ice breakers generation error:', error);
		await auditLog(c, {
			userId: c.get('user')?.id,
			action: 'extract',
			resource: 'extract',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Ice breakers generation failed' }, 500);
	}
});
