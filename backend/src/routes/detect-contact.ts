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

const detectionSchema = z.object({
  contactId: z.string().nullable().describe('ID du contact existant si identifié, null sinon'),
  firstName: z.string().describe('Prénom du protagoniste principal'),
  lastName: z.string().nullable().describe('Nom de famille si mentionné explicitement'),
  suggestedNickname: z.string().nullable().describe('Surnom suggéré si pas de nom de famille (ex: "Paul Google", "Marie running")'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Niveau de confiance dans la détection'),
  isNew: z.boolean().describe('true si le contact n\'existe pas dans la liste'),
  candidateIds: z.array(z.string()).describe('IDs des contacts candidats en cas d\'ambiguïté'),
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

    const { text: rawResponse } = await measurePerformance(
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

    // Parse JSON from response
    const detection = parseDetectionResponse(rawResponse);

    // Update Langfuse generation with output
    generation?.end({ output: detection });

    // Run evaluation in background (non-blocking)
    if (c.env.XAI_API_KEY && c.executionCtx) {
      c.executionCtx.waitUntil(
        evaluateDetection(
          transcription,
          contacts,
          detection,
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
      contactId: detection.contactId,
      firstName: detection.firstName,
      lastName: detection.lastName,
      suggestedNickname: detection.suggestedNickname,
      confidence: detection.confidence,
      isNew: detection.isNew,
      candidateIds: detection.candidateIds,
    };

    trace?.update({ output: { success: true, detection: result } });

    return c.json({
      success: true,
      detection: result,
    });
  } catch (error) {
    console.error('Detect contact error:', error);
    trace?.update({ output: { error: String(error) } });
    return c.json({ error: 'Contact detection failed' }, 500);
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
      ? contact.hotTopics.map((topic) => topic.title).join(', ')
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

2. SI UN CONTACT EXISTANT CORRESPOND:
   - Compare avec le résumé et les sujets actuels pour confirmer l'identité
   - Si 2+ contacts ont le même prénom: utilise le contexte pour choisir le bon
   - Si le contexte ne permet pas de trancher: retourne tous les IDs candidats dans candidateIds
   - contactId = ID du contact identifié (ou null si ambiguïté)
   - isNew = false

3. SI AMBIGUÏTÉ (plusieurs contacts possibles):
   - contactId = null
   - candidateIds = liste des IDs des contacts candidats
   - confidence = "medium" ou "low"
   - isNew = false

4. SI NOUVEAU CONTACT (prénom pas dans la liste):
   - contactId = null
   - candidateIds = [] (vide)
   - isNew = true
   - Si le nom de famille est mentionné: lastName = le nom
   - Sinon: génère un suggestedNickname intelligent basé sur l'info principale
     Exemples: "Paul Google" (entreprise), "Marie running" (hobby), "Sophie RH" (métier)

5. GÉNÉRATION DU NICKNAME:
   - Combine le prénom avec l'info la plus distinctive
   - Priorise: entreprise > métier > hobby/sport > lieu
   - Format court: "Prénom Info" (2-3 mots max)
   - Ne génère un nickname QUE si lastName est null et isNew est true

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après.

Exemple pour un contact existant identifié:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": []}

Exemple pour un nouveau contact sans nom de famille:
{"contactId": null, "firstName": "Paul", "lastName": null, "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": []}

Exemple avec ambiguïté:
{"contactId": null, "firstName": "Marie", "lastName": null, "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"]}`;
}
