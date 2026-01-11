import { Hono } from 'hono';
import { generateText } from 'ai';
import { z } from 'zod';
import { createCerebras } from '@ai-sdk/cerebras';
import { authMiddleware } from '../middleware/auth';
import { wrapUserInput, getSecurityInstructions } from '../lib/security';
import { measurePerformance } from '../lib/performance-logger';
import { evaluateDetection } from '../lib/evaluators';
import { getLangfuseClient } from '../lib/telemetry';

type Bindings = {
  CEREBRAS_API_KEY: string;
  DETECT_CONTACT_MODEL?: string;
  XAI_API_KEY?: string;
  ENABLE_PERFORMANCE_LOGGING?: string | boolean;
  ENABLE_LANGFUSE?: string;
  ENABLE_EVALUATION?: string;
  EVALUATION_SAMPLING_RATE?: string;
};

type DetectContactRequest = {
  transcription: string;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    nickname?: string;
    aiSummary?: string;
    hotTopics: Array<{
      title: string;
      context?: string;
    }>;
  }>;
  language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const avatarHintsSchema = z.object({
  physical: z.string().nullable().describe('Description physique si mentionnée (cheveux, yeux, corpulence, âge estimé)'),
  personality: z.string().nullable().describe('Trait de personnalité dominant (chaleureux, dynamique, calme, drôle...)'),
  interest: z.string().nullable().describe('Hobby ou passion principale mentionnée'),
  context: z.string().nullable().describe('Contexte professionnel ou social (collègue, coach, voisin...)'),
});

const detectionSchema = z.object({
  contactId: z.string().nullable().describe('ID du contact existant si identifié, null sinon'),
  firstName: z.string().describe('Prénom du protagoniste principal'),
  lastName: z.string().nullable().describe('Nom de famille si mentionné explicitement'),
  gender: z.enum(['male', 'female', 'unknown']).describe('Genre de la personne déduit du prénom'),
  suggestedNickname: z.string().nullable().describe('Surnom suggéré si pas de nom de famille (ex: "Paul Google", "Marie running")'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Niveau de confiance dans la détection'),
  isNew: z.boolean().describe('true si le contact n\'existe pas dans la liste'),
  candidateIds: z.array(z.string()).describe('IDs des contacts candidats en cas d\'ambiguïté'),
  avatarHints: avatarHintsSchema.optional().describe('Indices pour générer un avatar personnalisé'),
});

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  fr: 'Réponds en français.',
  en: 'Respond in English.',
  es: 'Responde en español.',
  it: 'Rispondi in italiano.',
  de: 'Antworte auf Deutsch.',
};

const DEFAULT_MODEL = 'llama3.1-8b';

type DetectionResult = z.infer<typeof detectionSchema>;

function parseDetectionResponse(rawResponse: string): DetectionResult {
  // Try to extract JSON from the response
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`No JSON found in response: ${rawResponse.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Invalid JSON in response: ${jsonMatch[0].slice(0, 200)}`);
  }

  // Validate and coerce with Zod
  const result = detectionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`);
  }

  return result.data;
}

function normalizeFirstName(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function validateDetection(
  detection: DetectionResult,
  contacts: DetectContactRequest['contacts']
): DetectionResult {
  const detectedFirstName = normalizeFirstName(detection.firstName);

  // If contactId is provided, verify it matches the firstName
  if (detection.contactId) {
    const matchedContact = contacts.find((contact) => contact.id === detection.contactId);

    if (matchedContact) {
      const contactFirstName = normalizeFirstName(matchedContact.firstName);

      // If firstName matches, the detection is valid
      if (contactFirstName === detectedFirstName) {
        return detection;
      }
    }

    // contactId doesn't match firstName - this is a hallucination
    // Try to find the correct contact by firstName
    const correctContact = contacts.find(
      (contact) => normalizeFirstName(contact.firstName) === detectedFirstName
    );

    if (correctContact) {
      // Found the correct contact - fix the ID
      return {
        ...detection,
        contactId: correctContact.id,
        isNew: false,
        candidateIds: [],
      };
    }

    // No contact with this firstName exists - mark as new
    return {
      ...detection,
      contactId: null,
      isNew: true,
      candidateIds: [],
    };
  }

  // No contactId provided - check if firstName exists in contacts
  if (!detection.isNew) {
    const matchingContacts = contacts.filter(
      (contact) => normalizeFirstName(contact.firstName) === detectedFirstName
    );

    if (matchingContacts.length === 1) {
      // Exactly one match - set the correct contactId
      return {
        ...detection,
        contactId: matchingContacts[0].id,
        isNew: false,
        candidateIds: [],
      };
    }

    if (matchingContacts.length > 1) {
      // Multiple matches - ambiguity
      return {
        ...detection,
        contactId: null,
        isNew: false,
        candidateIds: matchingContacts.map((contact) => contact.id),
      };
    }

    // No matches but isNew is false - fix it
    return {
      ...detection,
      contactId: null,
      isNew: true,
      candidateIds: [],
    };
  }

  // isNew is true and no contactId - verify firstName doesn't exist
  const existingContact = contacts.find(
    (contact) => normalizeFirstName(contact.firstName) === detectedFirstName
  );

  if (existingContact) {
    // Actually exists - fix the detection
    return {
      ...detection,
      contactId: existingContact.id,
      isNew: false,
      candidateIds: [],
    };
  }

  return detection;
}

export const detectContactRoutes = new Hono<{ Bindings: Bindings }>();

detectContactRoutes.use('/*', authMiddleware);

detectContactRoutes.post('/', async (c) => {
  const langfuse = getLangfuseClient();
  const trace = langfuse?.trace({
    name: 'detect-contact',
    metadata: { route: '/api/detect-contact' },
  });

  try {
    const body = await c.req.json<DetectContactRequest>();
    const { transcription, contacts } = body;

    if (!transcription) {
      trace?.update({ output: { error: 'No transcription provided' } });
      return c.json({ error: 'No transcription provided' }, 400);
    }

    if (!c.env.CEREBRAS_API_KEY) {
      trace?.update({ output: { error: 'CEREBRAS_API_KEY missing' } });
      return c.json({ error: 'CEREBRAS_API_KEY is required for detect-contact' }, 500);
    }

    const language = body.language || 'fr';
    const modelName = c.env.DETECT_CONTACT_MODEL || DEFAULT_MODEL;
    const prompt = buildDetectionPrompt(transcription, contacts, language);

    const cerebras = createCerebras({
      apiKey: c.env.CEREBRAS_API_KEY,
    });

    const model = cerebras(modelName);

    // Create Langfuse generation span
    const generation = trace?.generation({
      name: 'detect-contact-generation',
      model: modelName,
      input: { transcription, contactsCount: contacts.length },
    });

    let rawResponse: string;
    try {
      const result = await measurePerformance(
        () => generateText({
          model,
          prompt,
          experimental_telemetry: {
            isEnabled: c.env.ENABLE_LANGFUSE === 'true',
            metadata: {
              route: '/detect-contact',
              language,
              contactsCount: contacts.length,
            },
          },
        }),
        {
          route: '/detect-contact',
          provider: 'cerebras',
          model: modelName,
          operationType: 'text-generation',
          inputSize: new TextEncoder().encode(prompt).length,
          metadata: { language, contactsCount: contacts.length },
          enabled: c.env.ENABLE_PERFORMANCE_LOGGING === 'true' || c.env.ENABLE_PERFORMANCE_LOGGING === true,
        }
      );
      rawResponse = result.text;
    } catch (llmError) {
      const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);
      console.error('[detect-contact] LLM call failed:', {
        error: errorMessage,
        model: modelName,
        transcriptionLength: transcription.length,
        contactsCount: contacts.length,
      });
      trace?.update({ output: { error: `LLM error: ${errorMessage}` } });
      return c.json({ error: `LLM call failed: ${errorMessage}` }, 500);
    }

    // Parse JSON from response
    let detection;
    try {
      detection = parseDetectionResponse(rawResponse);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('[detect-contact] JSON parsing failed:', {
        error: errorMessage,
        rawResponse: rawResponse.slice(0, 500),
      });
      trace?.update({ output: { error: `Parse error: ${errorMessage}`, rawResponse: rawResponse.slice(0, 500) } });
      return c.json({ error: `Failed to parse LLM response: ${errorMessage}` }, 500);
    }

    // Validate and correct hallucinated IDs
    const validatedDetection = validateDetection(detection, contacts);

    // Update Langfuse generation with output
    generation?.end({ output: validatedDetection });

    // Run evaluation in background (non-blocking)
    if (c.env.XAI_API_KEY && c.executionCtx) {
      c.executionCtx.waitUntil(
        evaluateDetection(
          transcription,
          contacts,
          validatedDetection,
          {
            XAI_API_KEY: c.env.XAI_API_KEY,
            enableEvaluation: c.env.ENABLE_EVALUATION === 'true',
            samplingRate: parseFloat(c.env.EVALUATION_SAMPLING_RATE || '0.25'),
          }
        ).then((evaluation) => {
          if (evaluation && trace) {
            trace.score({
              name: 'detection-quality',
              value: evaluation.score / 10,
              comment: evaluation.reasoning,
            });
          }
        })
      );
    }

    const result = {
      contactId: validatedDetection.contactId,
      firstName: validatedDetection.firstName,
      lastName: validatedDetection.lastName,
      gender: validatedDetection.gender,
      suggestedNickname: validatedDetection.suggestedNickname,
      confidence: validatedDetection.confidence,
      isNew: validatedDetection.isNew,
      candidateIds: validatedDetection.candidateIds,
      avatarHints: validatedDetection.avatarHints || null,
    };

    trace?.update({ output: { success: true, detection: result } });

    return c.json({
      success: true,
      detection: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[detect-contact] Unexpected error:', {
      error: errorMessage,
      stack: errorStack,
    });
    trace?.update({ output: { error: `Unexpected: ${errorMessage}` } });
    return c.json({ error: `Contact detection failed: ${errorMessage}` }, 500);
  }
});

function buildDetectionPrompt(
  transcription: string,
  contacts: DetectContactRequest['contacts'],
  language: string
): string {
  const { wrapped: wrappedTranscription } = wrapUserInput(transcription, 'TRANSCRIPTION');

  const contactsList = contacts.map((contact) => {
    const name = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}${contact.nickname ? ` (${contact.nickname})` : ''}`;
    const summary = contact.aiSummary || 'Aucun résumé';
    const topics = contact.hotTopics.length > 0
      ? contact.hotTopics.map((topic) => {
          if (topic.context) {
            return `${topic.title} (${topic.context})`;
          }
          return topic.title;
        }).join(', ')
      : 'Aucun';
    return `- [ID: ${contact.id}] ${name}\n  Résumé: ${summary}\n  Sujets actuels: ${topics}`;
  }).join('\n');

  return `Tu es un assistant qui identifie le contact principal d'une note vocale.
${getSecurityInstructions(language)}
${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr}

${wrappedTranscription}

CONTACTS EXISTANTS:
${contactsList || 'Aucun contact existant.'}

RÈGLES D'IDENTIFICATION:

1. PROTAGONISTE PRINCIPAL:
   - Identifie LA personne dont on parle principalement dans la note
   - Ignore les mentions secondaires (ex: "Marie m'a parlé de son frère Paul" → protagoniste = Marie)
   - Le prénom doit être un VRAI prénom (pas "contact", "ami", "collègue", "quelqu'un")
   - ATTENTION aux pronoms "elle/lui/il": cherche QUI est cette personne en utilisant les sujets actuels des contacts
     Ex: "Elle m'a raconté son date avec François" + contact Inès a sujet "Date François" → protagoniste = Inès

2. UTILISATION DES SUJETS ACTUELS:
   - Les sujets actuels contiennent des indices précieux sur les contacts
   - Si un nom mentionné dans la transcription apparaît dans un sujet d'un contact, ce contact est probablement le protagoniste
   - Ex: transcription parle de "François" + Inès a sujet "Date François" → le protagoniste est Inès (pas François)

3. SI UN CONTACT EXISTANT CORRESPOND:
   - Le prénom du protagoniste DOIT correspondre EXACTEMENT à un prénom dans la liste (firstName)
   - Compare avec le résumé et les sujets actuels pour confirmer l'identité
   - Si 2+ contacts ont le même prénom: utilise le contexte pour choisir le bon
   - Si le contexte ne permet pas de trancher: retourne tous les IDs candidats dans candidateIds
   - contactId = UNIQUEMENT un ID de la liste ci-dessus (jamais inventé)
   - isNew = false

4. SI AMBIGUÏTÉ (plusieurs contacts possibles):
   - contactId = null
   - candidateIds = liste des IDs des contacts candidats (UNIQUEMENT des IDs de la liste ci-dessus)
   - confidence = "medium" ou "low"
   - isNew = false

5. SI NOUVEAU CONTACT:
   - VÉRIFIE que le prénom du protagoniste N'EXISTE PAS dans la liste des contacts
   - Si le prénom n'est dans AUCUN firstName de la liste → isNew = true
   - contactId = null
   - candidateIds = [] (vide)
   - Si le nom de famille est mentionné: lastName = le nom
   - Sinon: génère un suggestedNickname intelligent basé sur l'info principale
     Exemples: "Paul Google" (entreprise), "Marie running" (hobby), "Sophie RH" (métier)

6. GÉNÉRATION DU NICKNAME:
   - Combine le prénom avec l'info la plus distinctive
   - Priorise: entreprise > métier > hobby/sport > lieu
   - Format court: "Prénom Info" (2-3 mots max)
   - Ne génère un nickname QUE si lastName est null et isNew est true

RÈGLE CRITIQUE: Ne JAMAIS inventer un contactId. Si le prénom n'existe pas dans la liste → isNew = true et contactId = null.

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.

7. DÉTECTION DU GENRE:
   - Déduis le genre à partir du prénom (male/female/unknown)
   - Utilise tes connaissances des prénoms français et internationaux
   - En cas de doute ou prénom épicène (ex: Camille, Dominique, Claude) → "unknown"
   - Le genre aide à personnaliser l'avatar du contact

8. INDICES POUR L'AVATAR (avatarHints):
   Extrais UNIQUEMENT les informations EXPLICITEMENT mentionnées dans la transcription:
   - physical: description physique (cheveux, yeux, corpulence, âge estimé, traits distinctifs)
     Ex: "cheveux bruns courts", "barbe", "la trentaine", "grand et mince"
   - personality: trait de personnalité DOMINANT qui ressort de la transcription
     Ex: "chaleureux", "dynamique", "calme", "drôle", "sérieux", "timide"
   - interest: hobby ou passion principale mentionnée
     Ex: "tennis", "cuisine", "jeux vidéo", "randonnée", "musique"
   - context: contexte professionnel ou social
     Ex: "collègue développeur", "coach sportif", "voisin", "ami d'enfance"

   RÈGLES IMPORTANTES:
   - Si rien n'est mentionné pour un champ → null (ne PAS inventer)
   - Privilégie les infos les plus marquantes/distinctives
   - Formule en anglais pour le prompt de génération d'image

Exemple pour un contact existant identifié:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": "warm and cheerful", "interest": "yoga", "context": "colleague at marketing team"}}

Exemple pour un nouveau contact sans nom de famille:
{"contactId": null, "firstName": "Paul", "lastName": null, "gender": "male", "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": [], "avatarHints": {"physical": "short brown hair, beard, early 30s", "personality": "energetic", "interest": "tech and startups", "context": "software engineer"}}

Exemple avec ambiguïté:
{"contactId": null, "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"], "avatarHints": {"physical": null, "personality": null, "interest": "running", "context": null}}

Exemple avec pronom et indice dans les sujets:
Transcription: "Elle m'a raconté son date avec François"
Contact Inès avec sujet "Date François"
→ {"contactId": "ines-id", "firstName": "Inès", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": null, "interest": null, "context": null}}`;
}
