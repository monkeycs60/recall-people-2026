import { Hono } from 'hono';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_GEMINI_API_KEY: string;
};

type ExtractionRequest = {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    tags: string[];
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
  };
};

const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  facts: z.array(
    z.object({
      factType: z.enum([
        'work',
        'company',
        'hobby',
        'sport',
        'relationship',
        'partner',
        'location',
        'education',
        'birthday',
        'contact',
        'other',
      ]),
      factKey: z.string().describe('Label lisible en français (ex: Poste, Tennis, Fils)'),
      factValue: z.string().describe('La valeur extraite'),
      action: z.enum(['add', 'update']),
      previousValue: z.string().nullable(),
    })
  ),
  noteBlocks: z.array(
    z.object({
      content: z.string().describe('Résumé court de cette information/anecdote'),
      eventDate: z.string().nullable().describe('Date de l\'événement si mentionnée (format: YYYY-MM-DD ou description relative)'),
    })
  ).describe('Anecdotes, événements, et informations contextuelles qui ne sont pas des facts structurés'),
});

export const extractRoutes = new Hono<{ Bindings: Bindings }>();

extractRoutes.use('/*', authMiddleware);

extractRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<ExtractionRequest>();
    const { transcription, existingContacts, currentContact } = body;

    if (!transcription) {
      return c.json({ error: 'No transcription provided' }, 400);
    }

    const google = createGoogleGenerativeAI({
      apiKey: c.env.GOOGLE_GEMINI_API_KEY,
    });

    const prompt = buildExtractionPrompt(transcription, currentContact);

    const { object: extraction } = await generateObject({
			model: google('gemini-2.5-flash-preview-09-2025'),
			schema: extractionSchema,
			prompt,
		});

    // Server-side matching: find contacts with same first name
    const extractedFirstName = extraction.contactIdentified.firstName.toLowerCase().trim();
    const matchingContacts = existingContacts.filter(
      (contact) => contact.firstName.toLowerCase().trim() === extractedFirstName
    );

    // Determine if we need disambiguation
    const needsDisambiguation = matchingContacts.length > 0;
    const suggestedMatches = matchingContacts.map((contact) => contact.id);

    // Generate suggested nickname based on the most distinctive fact
    let suggestedNickname: string | null = null;
    if (extraction.facts.length > 0) {
      const priorityOrder = ['work', 'company', 'sport', 'hobby', 'location', 'education'];
      const sortedFacts = [...extraction.facts].sort((factA, factB) => {
        const indexA = priorityOrder.indexOf(factA.factType);
        const indexB = priorityOrder.indexOf(factB.factType);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      const mainFact = sortedFacts[0];
      suggestedNickname = mainFact.factValue.split(' ')[0]; // First word of the value
    }

    const formattedExtraction = {
      contactIdentified: {
        id: null as string | null,
        firstName: extraction.contactIdentified.firstName,
        lastName: extraction.contactIdentified.lastName,
        confidence: extraction.contactIdentified.confidence,
        needsDisambiguation,
        suggestedMatches,
        suggestedNickname,
      },
      facts: extraction.facts,
      note: {
        summary: extraction.noteBlocks.length > 0
          ? extraction.noteBlocks.map((block) => block.content).join(' ')
          : 'Note vocale enregistrée.',
        keyPoints: extraction.noteBlocks.map((block) => block.content),
      },
    };

    return c.json({
      success: true,
      extraction: formattedExtraction,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return c.json({ error: 'Extraction failed' }, 500);
  }
});

const buildExtractionPrompt = (
  transcription: string,
  currentContact?: ExtractionRequest['currentContact']
): string => {
  const currentContactContext = currentContact
    ? `
CONTACT ACTUELLEMENT SÉLECTIONNÉ:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}
- Infos existantes:
${currentContact.facts.map((fact) => `  • ${fact.factKey}: ${fact.factValue}`).join('\n')}`
    : '';

  return `Tu es un assistant qui extrait des informations structurées à partir de notes vocales en français.
${currentContactContext}

TRANSCRIPTION DE LA NOTE VOCALE:
"${transcription}"

RÈGLES D'EXTRACTION:

1. IDENTIFICATION DU CONTACT:
   - Extrais le prénom COMPLET de la personne mentionnée (ex: "Jean-Luc", "Marie-Claire", "Pierre-Antoine")
   - Les prénoms composés avec trait d'union sont UN SEUL prénom (Jean-Luc = prénom, pas Jean = prénom + Luc = nom)
   - Extrais le nom de famille SEULEMENT s'il est explicitement mentionné comme tel

2. FACTS (Informations structurées PERMANENTES à afficher sur le profil):
   Catégories:
   - work: métier, poste, profession (factKey="Poste", factValue="Développeur")
   - company: entreprise, société (factKey="Entreprise", factValue="Google")
   - hobby: loisirs, passions (factKey="Loisir", factValue="Photographie")
   - sport: sports pratiqués (factKey="Sport", factValue="Tennis")
   - relationship: liens familiaux/sociaux (factKey="Fils", factValue="Thomas")
   - partner: conjoint (factKey="Femme" ou "Mari" ou "Compagnon", factValue=prénom ou statut)
   - location: lieu de vie (factKey="Ville", factValue="Paris")
   - education: formation (factKey="École", factValue="HEC")
   - birthday: anniversaire (factKey="Anniversaire", factValue="15 mars")
   - contact: coordonnées (factKey="Téléphone" ou "Email", factValue=valeur)
   - other: autre info structurée permanente

3. NOTEBLOCKS (Événements et anecdotes TEMPORAIRES):
   Ce qui va dans noteBlocks (PAS dans facts):
   - Événements: "Sa femme est décédée hier"
   - Anecdotes: "Rencontré au supermarché"
   - Projets: "Cherche un nouveau travail"
   - Contexte: "A eu une promotion récemment"

   Chaque bloc = 1 phrase courte. Sépare les infos différentes.

RÈGLES:
- N'extrais QUE ce qui est EXPLICITEMENT dit
- facts = infos PERMANENTES (métier, sport pratiqué, famille)
- noteBlocks = événements TEMPORAIRES/anecdotes
- action="add" pour nouvelle info, "update" si modification`;
};
