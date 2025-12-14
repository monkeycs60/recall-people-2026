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
    id: z.string().nullable().describe('ID du contact existant ou null si nouveau contact'),
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
    needsDisambiguation: z.boolean(),
    suggestedMatches: z.array(z.string()).describe('IDs des contacts possibles si ambiguïté'),
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

    const prompt = buildExtractionPrompt(
      transcription,
      existingContacts,
      currentContact
    );

    const { object: extraction } = await generateObject({
			model: google('gemini-2.5-flash-preview-09-2025'),
			schema: extractionSchema,
			prompt,
		});

    const formattedExtraction = {
      contactIdentified: extraction.contactIdentified,
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
  existingContacts: ExtractionRequest['existingContacts'],
  currentContact?: ExtractionRequest['currentContact']
): string => {
  const contactsContext = existingContacts
    .map(
      (contact) =>
        `- "${contact.firstName}${contact.lastName ? ' ' + contact.lastName : ''}" (id: ${contact.id}, tags: ${contact.tags.join(', ') || 'aucun'})`
    )
    .join('\n');

  const currentContactContext = currentContact
    ? `
CONTACT ACTUELLEMENT SÉLECTIONNÉ:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}
- Infos existantes:
${currentContact.facts.map((fact) => `  • ${fact.factKey}: ${fact.factValue}`).join('\n')}`
    : '';

  return `Tu es un assistant qui extrait des informations structurées à partir de notes vocales en français.

CONTACTS EXISTANTS DE L'UTILISATEUR:
${contactsContext || '(aucun contact existant)'}
${currentContactContext}

TRANSCRIPTION DE LA NOTE VOCALE:
"${transcription}"

RÈGLES D'EXTRACTION:

1. IDENTIFICATION DU CONTACT:
   - Si le prénom correspond à PLUSIEURS contacts existants → needsDisambiguation: true + liste les IDs dans suggestedMatches
   - Si le prénom ne correspond à AUCUN contact → id: null (nouveau contact)
   - Si le prénom correspond à UN SEUL contact → utilise son ID

2. FACTS (Informations structurées importantes à afficher en haut du profil):
   Catégories et exemples:
   - work: métier, poste, profession (ex: "Développeur", "Médecin", "Avocat")
   - company: entreprise, société, employeur (ex: "Google", "Cabinet Dupont")
   - hobby: loisirs, passions (ex: "Photographie", "Cuisine", "Jardinage")
   - sport: sports pratiqués (ex: "Tennis", "Football", "Yoga")
   - relationship: liens familiaux/sociaux (ex: factKey="Fils" factValue="Thomas", factKey="Ami de" factValue="Marc")
   - partner: conjoint uniquement (ex: factKey="Femme" factValue="Marie", factKey="Compagnon" factValue="décédé")
   - location: lieu de vie (ex: "Paris", "Lyon")
   - education: formation, école (ex: "HEC", "Ingénieur INSA")
   - birthday: date anniversaire (ex: "15 mars", "1985-03-15")
   - contact: téléphone, email (ex: "06 12 34 56 78")
   - other: autre info structurée importante

3. NOTEBLOCKS (Anecdotes et événements contextuels):
   Ce qui va dans noteBlocks (PAS dans facts):
   - Événements ponctuels: "Sa femme est décédée hier", "Il organise les obsèques dans 3 jours"
   - Anecdotes: "On s'est rencontrés au restaurant", "Il m'a parlé de son voyage"
   - Contexte temporel: "Il part en vacances la semaine prochaine"
   - Projets: "Il cherche un nouveau travail", "Il veut déménager"

   Chaque noteBlock doit être un résumé COURT (1 phrase max).
   Sépare les informations différentes en blocs distincts.

RÈGLES IMPORTANTES:
- Sois CONSERVATEUR: n'extrais QUE ce qui est explicitement dit
- Les facts sont des informations PERMANENTES ou SEMI-PERMANENTES sur la personne
- Les noteBlocks sont des événements, anecdotes, ou infos contextuelles/temporaires
- Pour facts, action="add" si nouvelle info, "update" si modification d'une info existante
- factKey doit être lisible et en français`;
};
