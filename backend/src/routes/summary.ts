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
};

export const summaryRoutes = new Hono<{ Bindings: Bindings }>();

summaryRoutes.use('/*', authMiddleware);

summaryRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<SummaryRequest>();
    const { contact, facts, hotTopics } = body;

    const xai = createXai({
      apiKey: c.env.XAI_API_KEY,
    });

    // Catégoriser les facts par importance
    const professionalTypes = ['work', 'company', 'education'];
    const contextTypes = ['how_met', 'where_met', 'shared_ref'];
    const personalTypes = ['hobby', 'sport', 'origin', 'location', 'partner', 'children'];

    const professionalFacts = facts.filter((fact) => professionalTypes.includes(fact.factType));
    const contextFacts = facts.filter((fact) => contextTypes.includes(fact.factType));
    const personalFacts = facts.filter((fact) => personalTypes.includes(fact.factType));

    const activeTopics = hotTopics.filter((topic) => topic.status === 'active');

    const formatFacts = (factList: typeof facts) =>
      factList.map((fact) => `- ${fact.factKey}: ${fact.factValue}`).join('\n');

    const prompt = `Tu es un assistant qui aide à se souvenir des gens. Génère un résumé concis et mémorable de cette personne.

PERSONNE: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}

${professionalFacts.length > 0 ? `PROFESSIONNEL:\n${formatFacts(professionalFacts)}` : ''}

${contextFacts.length > 0 ? `CONTEXTE DE RENCONTRE:\n${formatFacts(contextFacts)}` : ''}

${personalFacts.length > 0 ? `PERSONNEL:\n${formatFacts(personalFacts)}` : ''}

${activeTopics.length > 0 ? `ACTUALITÉS (sujets en cours - PRIORITAIRE):\n${activeTopics.map((topic) => `- ${topic.title}${topic.context ? `: ${topic.context}` : ''}`).join('\n')}` : ''}

OBJECTIF: Écrire 2-3 phrases qui permettent de se rappeler rapidement qui est cette personne avant de la revoir.

HIÉRARCHIE D'IMPORTANCE:
1. ACTUALITÉS en cours (si présentes) = info la plus utile pour reprendre contact
2. Comment on s'est rencontrés = contexte relationnel
3. Métier/entreprise = identité professionnelle
4. Trait distinctif personnel = ce qui rend la personne mémorable

FORMAT:
- 2 à 3 phrases fluides, ton naturel comme si tu briefais un ami
- Commence par l'info la plus pertinente pour une prochaine interaction
- Si actualité en cours, l'intégrer naturellement (ex: "qui prépare actuellement son marathon")
- Évite les formules génériques, sois spécifique
- Maximum 200 caractères`;

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
