import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
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

// Helper function to clean JSON from markdown code blocks
const cleanJsonResponse = (text: string): string => {
  // Remove markdown code blocks if present
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = text.match(codeBlockRegex);

  if (match) {
    return match[1].trim();
  }

  return text.trim();
};

export const extractRoutes = new Hono<{ Bindings: Bindings }>();

extractRoutes.use('/*', authMiddleware);

extractRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<ExtractionRequest>();
    const { transcription, existingContacts, currentContact } = body;

    if (!transcription) {
      return c.json({ error: 'No transcription provided' }, 400);
    }

    const anthropic = new Anthropic({
      apiKey: c.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildExtractionPrompt(
      transcription,
      existingContacts,
      currentContact
    );

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const cleanedText = cleanJsonResponse(content.text);
    const extraction = JSON.parse(cleanedText);

    return c.json({
      success: true,
      extraction,
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

  return `Tu es un assistant qui extrait des informations sur des personnes à partir de notes vocales transcrites en français.

CONTACTS EXISTANTS DE L'UTILISATEUR:
${contactsContext || '(aucun contact existant)'}
${currentContactContext}

TRANSCRIPTION DE LA NOTE VOCALE:
"${transcription}"

TÂCHE:
1. Identifie la personne mentionnée dans la note (compare avec les contacts existants)
2. Extrais les informations factuelles (job, entreprise, ville, relations familiales, anniversaire, centres d'intérêt, téléphone, email)
3. Génère un résumé court de la note

RÈGLES IMPORTANTES:
- Si le prénom mentionné correspond à PLUSIEURS contacts existants, mets needsDisambiguation: true et liste les IDs possibles dans suggestedMatches
- Si le prénom ne correspond à AUCUN contact existant, mets id: null (c'est un nouveau contact)
- Si le prénom correspond à UN SEUL contact, mets son ID et needsDisambiguation: false
- Pour les facts, utilise action: "add" si c'est une nouvelle info, "update" si ça modifie une info existante
- Sois CONSERVATEUR : n'extrais QUE ce qui est explicitement dit, pas d'inférences
- Les relations (femme, mari, fils, fille, frère, sœur, collègue, boss) ont le factType "relationship"
- Le factKey doit être en français et lisible (ex: "Poste", "Entreprise", "Fils", "Ville")

RÉPONDS UNIQUEMENT EN JSON VALIDE (pas de markdown, pas de commentaires):
{
  "contactIdentified": {
    "id": "string ou null si nouveau contact",
    "firstName": "Prénom extrait de la transcription",
    "lastName": "Nom de famille si mentionné, sinon null",
    "confidence": "high|medium|low",
    "needsDisambiguation": true|false,
    "suggestedMatches": ["id1", "id2"]
  },
  "facts": [
    {
      "factType": "job|company|city|relationship|birthday|interest|phone|email|custom",
      "factKey": "Label en français (ex: Poste, Entreprise, Fils)",
      "factValue": "La valeur extraite",
      "action": "add|update",
      "previousValue": "Ancienne valeur si update et connue, sinon null"
    }
  ],
  "note": {
    "summary": "Résumé en 1-2 phrases maximum",
    "keyPoints": ["Point clé 1", "Point clé 2"]
  }
}`;
};
