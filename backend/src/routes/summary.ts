import { Hono } from 'hono';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  GOOGLE_GEMINI_API_KEY: string;
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
};

export const summaryRoutes = new Hono<{ Bindings: Bindings }>();

summaryRoutes.use('/*', authMiddleware);

summaryRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<SummaryRequest>();
    const { contact, facts, hotTopics } = body;

    const google = createGoogleGenerativeAI({
      apiKey: c.env.GOOGLE_GEMINI_API_KEY,
    });

    const factsText = facts.map((fact) => `${fact.factKey}: ${fact.factValue}`).join('\n');
    const activeTopics = hotTopics.filter((topic) => topic.status === 'active');
    const topicsText = activeTopics.map((topic) => topic.title).join(', ');

    const prompt = `Génère un résumé de 2-3 phrases maximum décrivant cette personne.
Le résumé doit être naturel, comme si tu présentais quelqu'un à un ami.

Prénom: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}

Informations connues:
${factsText || 'Aucune information'}

${activeTopics.length > 0 ? `Sujets actuels: ${topicsText}` : ''}

Règles:
- 2-3 phrases maximum
- Commence par le métier/entreprise si connu
- Mentionne un trait personnel (hobby, sport, origine)
- Si pertinent, mentionne comment vous vous êtes rencontrés
- Ton naturel et chaleureux
- Pas de liste, que du texte fluide`;

    const { text } = await generateText({
      model: google('gemini-3-flash-preview'),
      prompt,
      maxOutputTokens: 200,
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
