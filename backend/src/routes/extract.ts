import { Hono } from 'hono';
import { generateObject } from 'ai';
import { z } from 'zod';
import { format } from 'date-fns';
import { authMiddleware } from '../middleware/auth';
import { wrapUserInput, getSecurityInstructions } from '../lib/security';
import { createAIModel, getAIProviderName, getAIModel } from '../lib/ai-provider';
import { measurePerformance } from '../lib/performance-logger';
import { getLangfuseClient } from '../lib/telemetry';
import { evaluateExtraction } from '../lib/evaluators';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  OPENAI_API_KEY?: string;
  XAI_API_KEY: string;
  CEREBRAS_API_KEY?: string;
  AI_PROVIDER?: 'openai' | 'grok' | 'cerebras';
  ENABLE_PERFORMANCE_LOGGING?: boolean;
  ENABLE_LANGFUSE?: string;
  ENABLE_EVALUATION?: string;
  EVALUATION_SAMPLING_RATE?: string;
};

type ExtractionRequest = {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
  }>;
  existingGroups?: Array<{
    id: string;
    name: string;
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
    hotTopics: Array<{
      id: string;
      title: string;
      context?: string;
    }>;
  };
  language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  noteTitle: z.string().describe('Titre court de 2-4 mots résumant le contexte de la note (ex: "Café rattrapage", "Soirée Marc", "Appel pro")'),
  contactInfo: z.object({
    phone: z.string().nullable().describe('Numéro de téléphone si mentionné'),
    email: z.string().nullable().describe('Adresse email si mentionnée'),
    birthday: z.object({
      day: z.number().describe('Jour du mois (1-31)'),
      month: z.number().describe('Mois (1-12)'),
      year: z.number().nullable().describe('Année si mentionnée'),
    }).nullable().describe('Date d\'anniversaire si mentionnée'),
  }).describe('Coordonnées de contact détectées'),
  hotTopics: z.array(
    z.object({
      title: z.string().describe('Titre court du sujet (ex: "Entretien Google", "Déménagement Lyon")'),
      context: z.string().describe('1-2 phrases de contexte avec les détails importants'),
      eventDate: z.string().nullable().describe('OBLIGATOIRE si une date est mentionnée (relative ou absolue). Format: YYYY-MM-DD. Exemples: "la semaine prochaine" doit être converti en date ISO, "en juin" devient "2026-06-01". null UNIQUEMENT si aucune date mentionnée.'),
    })
  ).describe('NOUVELLES actualités/sujets à suivre mentionnés dans la note (projets, événements, situations en cours)'),
  resolvedTopics: z.array(
    z.object({
      existingTopicId: z.string().describe('ID du hot topic existant'),
      resolution: z.string().describe('Description concrète de ce qui s\'est passé (ex: "Elle a été prise, commence en mars", "Trouvé 3 pièces à Belleville")'),
    })
  ).describe('Hot topics existants qui sont résolus selon cette note, avec leur résolution détaillée'),
});

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  fr: 'Tu DOIS répondre en français uniquement.',
  en: 'You MUST respond in English only.',
  es: 'DEBES responder solo en español.',
  it: 'DEVI rispondere solo in italiano.',
  de: 'Du MUSST nur auf Deutsch antworten.',
};

export const extractRoutes = new Hono<{ Bindings: Bindings }>();

extractRoutes.use('/*', authMiddleware);

extractRoutes.post('/', async (c) => {
  const langfuse = getLangfuseClient();
  const trace = langfuse?.trace({
    name: 'extract',
    metadata: { route: '/api/extract' },
  });

  try {
    const body = await c.req.json<ExtractionRequest>();
    const { transcription, existingContacts, currentContact } = body;

    if (!transcription) {
      trace?.update({ output: { error: 'No transcription provided' } });
      return c.json({ error: 'No transcription provided' }, 400);
    }

    const language = body.language || 'fr';
    const prompt = buildExtractionPrompt(transcription, currentContact, language);

    const providerConfig = {
      OPENAI_API_KEY: c.env.OPENAI_API_KEY,
      XAI_API_KEY: c.env.XAI_API_KEY,
      CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
      AI_PROVIDER: c.env.AI_PROVIDER,
      ENABLE_PERFORMANCE_LOGGING: c.env.ENABLE_PERFORMANCE_LOGGING,
      ENABLE_LANGFUSE: c.env.ENABLE_LANGFUSE,
    };

    const model = createAIModel(providerConfig);
    const modelName = getAIModel(providerConfig);

    // Create Langfuse generation span
    const generation = trace?.generation({
      name: 'extract-generation',
      model: modelName,
      input: { transcription: transcription.slice(0, 500), hasCurrentContact: !!currentContact },
    });

    const { object: extraction } = await measurePerformance(
      () => generateObject({
        model,
        schema: extractionSchema,
        prompt,
      }),
      {
        route: '/extract',
        provider: getAIProviderName(providerConfig),
        model: getAIModel(providerConfig),
        operationType: 'object-generation',
        inputSize: new TextEncoder().encode(prompt).length,
        metadata: { language, hasCurrentContact: !!currentContact },
        enabled: !!c.env.ENABLE_PERFORMANCE_LOGGING as boolean,
      }
    );

    // Server-side matching: find contacts with same first name
    const extractedFirstName = extraction.contactIdentified.firstName.toLowerCase().trim();
    const matchingContacts = existingContacts.filter(
      (contact) => contact.firstName.toLowerCase().trim() === extractedFirstName
    );

    // Determine if we need disambiguation
    const needsDisambiguation = matchingContacts.length > 0;
    const suggestedMatches = matchingContacts.map((contact) => contact.id);

    // For existing contacts, use their stored name instead of extracted name
    const formattedExtraction = {
      contactIdentified: {
        id: currentContact?.id || null,
        firstName: currentContact?.firstName || extraction.contactIdentified.firstName,
        lastName: currentContact?.lastName || extraction.contactIdentified.lastName,
        confidence: extraction.contactIdentified.confidence,
        needsDisambiguation: currentContact ? false : needsDisambiguation,
        suggestedMatches: currentContact ? [] : suggestedMatches,
      },
      noteTitle: extraction.noteTitle,
      contactInfo: {
        phone: extraction.contactInfo.phone || undefined,
        email: extraction.contactInfo.email || undefined,
        birthday: extraction.contactInfo.birthday ? {
          day: extraction.contactInfo.birthday.day,
          month: extraction.contactInfo.birthday.month,
          year: extraction.contactInfo.birthday.year || undefined,
        } : undefined,
      },
      hotTopics: extraction.hotTopics.map((topic) => {
        // Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY for V1 compatibility (suggestedDate)
        let suggestedDate: string | undefined;
        if (topic.eventDate) {
          const [year, month, day] = topic.eventDate.split('-');
          if (year && month && day) {
            suggestedDate = `${day}/${month}/${year}`;
          }
        }
        return {
          title: topic.title,
          context: topic.context,
          eventDate: topic.eventDate || undefined,
          suggestedDate, // V1 compatibility: DD/MM/YYYY format
        };
      }),
      resolvedTopics: extraction.resolvedTopics.map((topic) => ({
        existingTopicId: topic.existingTopicId,
        resolution: topic.resolution,
      })),
    };

    // Update Langfuse generation with output
    generation?.end({ output: formattedExtraction });
    trace?.update({ output: { success: true, extraction: formattedExtraction } });

    // Run evaluation in background (non-blocking)
    if (c.env.XAI_API_KEY && c.executionCtx) {
      c.executionCtx.waitUntil(
        evaluateExtraction(
          transcription,
          formattedExtraction,
          {
            XAI_API_KEY: c.env.XAI_API_KEY,
            enableEvaluation: c.env.ENABLE_EVALUATION === 'true',
            samplingRate: parseFloat(c.env.EVALUATION_SAMPLING_RATE || '0.25'),
          }
        ).then((evaluation) => {
          if (evaluation && trace) {
            trace.score({
              name: 'extraction-quality',
              value: evaluation.score / 10,
              comment: evaluation.reasoning,
            });
          }
        })
      );
    }

    return c.json({
      success: true,
      extraction: formattedExtraction,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    trace?.update({ output: { error: String(error) } });
    return c.json({ error: 'Extraction failed' }, 500);
  }
});

const buildExtractionPrompt = (
  transcription: string,
  currentContact?: ExtractionRequest['currentContact'],
  language: string = 'fr'
): string => {
  const { wrapped: wrappedTranscription } = wrapUserInput(transcription, 'TRANSCRIPTION');

  let currentContactContext = '';
  let existingHotTopicsContext = '';

  if (currentContact) {
    currentContactContext = `
CONTACT ACTUELLEMENT SÉLECTIONNÉ:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}`;

    if (currentContact.hotTopics && currentContact.hotTopics.length > 0) {
      existingHotTopicsContext = `
ACTUALITÉS EXISTANTES DE CE CONTACT:
${currentContact.hotTopics.map((topic) => `  • [ID: ${topic.id}] "${topic.title}"${topic.context ? ` - ${topic.context}` : ''}`).join('\n')}`;
    }
  }

  const currentDate = format(new Date(), 'yyyy-MM-dd');
  const nextWeekDate = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const twoMonthsDate = format(new Date(new Date().setMonth(new Date().getMonth() + 2)), 'yyyy-MM-dd');

  return `Tu es un assistant qui extrait les actualités importantes d'une note vocale.

DATE DE RÉFÉRENCE: ${currentDate} (pour calculer les dates mentionnées)

${getSecurityInstructions(language)}
${currentContactContext}
${existingHotTopicsContext}

LANGUE DE RÉPONSE:
${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr}

TRANSCRIPTION:
${wrappedTranscription}

TÂCHE:
1. Extrais les NOUVELLES actualités/sujets à suivre (projets, événements, situations en cours)
2. Détecte si des actualités existantes sont RÉSOLUES dans cette note
3. Détecte les infos de contact (téléphone, email, anniversaire) si mentionnées
4. Identifie le prénom de la personne dont on parle
5. Génère un titre court pour la note (2-4 mots, ex: "Café rattrapage", "Appel pro")

RÈGLES:

1. IDENTIFICATION DU CONTACT:
   - Extrais le prénom de la personne dont on parle
   - Le prénom doit être un VRAI prénom (Marie, Jean, Sophie, etc.)
   - Nom de famille SEULEMENT si explicitement mentionné
   - Si aucun prénom clair, utilise "Contact"

2. HOT TOPICS = quelque chose de TEMPORAIRE qu'on voudra suivre/redemander:
   - Projets en cours: "Cherche un appart", "Prépare un examen"
   - Événements à suivre: "Mariage", "Entretien d'embauche"
   - Situations temporaires: "Problème au travail", "En recherche d'emploi"

   PAS un hot topic:
   - Traits permanents: métier stable, hobbies réguliers
   - Infos statiques: lieu de vie, formation
   - Activités régulières: "fait du sport", "joue aux échecs"

3. DATES ABSOLUES (format ISO: YYYY-MM-DD) - CRITIQUE:
   Aujourd'hui c'est ${currentDate}. Tu DOIS calculer et retourner eventDate pour TOUTE mention de date.

   Calculs temporels (OBLIGATOIRE - calcule la date exacte):
   - "demain" → ${currentDate} + 1 jour
   - "dans X jours" → ${currentDate} + X jours
   - "la semaine prochaine" / "next week" → ${currentDate} + 7 jours
   - "dans 2 semaines" → ${currentDate} + 14 jours
   - "le mois prochain" / "next month" → premier jour du mois suivant
   - "dans 3 mois" → ${currentDate} + 3 mois

   Dates fixes:
   - "le 25 janvier" → 2026-01-25
   - "le 15/02" → 2026-02-15
   - "mi-février" → 2026-02-15
   - "fin mars" → 2026-03-31
   - "début avril" → 2026-04-01

   Périodes/saisons (utilise le premier jour):
   - "en juin" → 2026-06-01
   - "cet été" / "this summer" → 2026-07-01
   - "l'automne prochain" / "next fall" → 2026-09-01
   - "cet hiver" / "this winter" → 2026-12-01
   - "le printemps" / "spring" → 2026-03-01

   RÈGLE CRITIQUE - TOUJOURS RETOURNER eventDate:
   - Si une date quelconque est mentionnée (relative ou absolue), tu DOIS retourner eventDate en YYYY-MM-DD
   - Exemples où eventDate est OBLIGATOIRE:
     * "entretien la semaine prochaine" → eventDate = date calculée
     * "déménage dans 2 mois" → eventDate = date calculée
     * "mariage en juin" → eventDate = "2026-06-01"
     * "examen le 15" → eventDate = "2026-XX-15" (mois actuel ou suivant)
   - eventDate = null SEULEMENT si aucune date mentionnée OU date trop vague ("un jour", "bientôt", "peut-être")

4. RÉSOLUTION D'ACTUALITÉS EXISTANTES:
   Si une actualité existante est mentionnée avec une issue, marque-la résolue.

   RÈGLE CRITIQUE:
   - Extrais TOUS les détails concrets de la transcription
   - Inclus: résultats chiffrés, noms, lieux, dates, anecdotes
   - Si aucun détail → résolution = "Effectué"

   Exemples:
   • "Elle a eu son entretien chez Google" → "Effectué"
   • "Elle a été prise chez Google, commence en mars" → "Elle a été prise, commence en mars"
   • "Il a trouvé un appart dans le 11ème, 45m²" → "Trouvé dans le 11ème, 45m²"

5. INFOS DE CONTACT:
   - phone: numéro si mentionné
   - email: adresse si mentionnée
   - birthday: { day, month, year } si anniversaire mentionné (year peut être null)

RÈGLES ABSOLUES:
1. N'invente JAMAIS d'information non présente dans la transcription
2. Utilise des dates ABSOLUES (YYYY-MM-DD), jamais relatives
3. Si pas assez d'informations, retourne moins de résultats
4. Ne crée un hot topic QUE si c'est temporaire/actionnable

FORMAT JSON:
{
  "contactIdentified": {
    "firstName": string,
    "lastName": string | null,
    "confidence": "high" | "medium" | "low"
  },
  "contactInfo": {
    "phone": string | null,
    "email": string | null,
    "birthday": { "day": number, "month": number, "year": number | null } | null
  },
  "hotTopics": [
    {
      "title": "Titre court (3-5 mots)",
      "context": "1-2 phrases de contexte avec les détails importants",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "Description concrète de ce qui s'est passé"
    }
  ],
  "noteTitle": "2-4 mots résumant la note"
}

EXEMPLES CONCRETS DE HOT TOPICS AVEC DATES:

Exemple 1 - "Marie a un entretien chez Google la semaine prochaine":
{
  "hotTopics": [{
    "title": "Entretien Google",
    "context": "Elle passe un entretien d'embauche chez Google.",
    "eventDate": "${nextWeekDate}"
  }]
}

Exemple 2 - "Il déménage à Lyon dans 2 mois":
{
  "hotTopics": [{
    "title": "Déménagement Lyon",
    "context": "Il prépare son déménagement pour s'installer à Lyon.",
    "eventDate": "${twoMonthsDate}"
  }]
}

Exemple 3 - "Elle se marie en juin":
{
  "hotTopics": [{
    "title": "Mariage",
    "context": "Elle prépare son mariage prévu pour juin.",
    "eventDate": "2026-06-01"
  }]
}`;
};
