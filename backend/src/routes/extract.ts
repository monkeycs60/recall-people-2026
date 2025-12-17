import { Hono } from 'hono';
import { createAnthropic } from '@ai-sdk/anthropic';
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
    hotTopics: Array<{
      id: string;
      title: string;
      context?: string;
    }>;
  };
};

const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  noteTitle: z.string().describe('Titre court de 2-4 mots résumant le contexte de la note (ex: "Café rattrapage", "Soirée Marc", "Appel pro")'),
  facts: z.array(
    z.object({
      factType: z.enum([
        'work', 'company', 'education', 'location', 'origin', 'partner',
        'children', 'hobby', 'sport', 'language', 'pet', 'birthday',
        'how_met', 'where_met', 'shared_ref', 'trait', 'gift_idea',
        'gift_given', 'contact', 'relationship', 'other',
      ]),
      factKey: z.string().describe('Label lisible en français'),
      factValue: z.string().describe('La valeur extraite'),
      action: z.enum(['add', 'update']),
      previousValue: z.string().nullable(),
    })
  ),
  hotTopics: z.array(
    z.object({
      title: z.string().describe('Titre court du sujet (ex: "Examen de droit", "Recherche appart")'),
      context: z.string().describe('1-2 phrases de contexte'),
    })
  ).describe('NOUVEAUX sujets temporels/actionnables mentionnés dans la note'),
  resolvedTopicIds: z.array(z.string()).describe('IDs des sujets chauds existants qui semblent résolus/terminés selon la note'),
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

    const anthropic = createAnthropic({
      apiKey: c.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildExtractionPrompt(transcription, currentContact);

    const { object: extraction } = await generateObject({
			model: anthropic('claude-opus-4-5-20251101'),
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
      noteTitle: extraction.noteTitle,
      facts: extraction.facts,
      hotTopics: extraction.hotTopics,
      resolvedTopicIds: extraction.resolvedTopicIds,
      note: {
        summary: extraction.hotTopics.length > 0
          ? extraction.hotTopics.map((topic) => topic.context).join(' ')
          : 'Note vocale enregistrée.',
        keyPoints: extraction.hotTopics.map((topic) => topic.title),
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
  let currentContactContext = '';
  let existingHotTopicsContext = '';

  if (currentContact) {
    currentContactContext = `
CONTACT ACTUELLEMENT SÉLECTIONNÉ:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}
- Infos existantes:
${currentContact.facts.map((fact) => `  • ${fact.factKey}: ${fact.factValue}`).join('\n')}`;

    if (currentContact.hotTopics && currentContact.hotTopics.length > 0) {
      existingHotTopicsContext = `
SUJETS CHAUDS EXISTANTS (à analyser pour détection de résolution):
${currentContact.hotTopics.map((topic) => `  • [ID: ${topic.id}] "${topic.title}"${topic.context ? ` - ${topic.context}` : ''}`).join('\n')}`;
    }
  }

  return `Tu es un assistant qui extrait des informations structurées à partir de notes vocales en français.
${currentContactContext}
${existingHotTopicsContext}

TRANSCRIPTION DE LA NOTE VOCALE:
"${transcription}"

RÈGLES D'EXTRACTION:

1. IDENTIFICATION DU CONTACT:
   - Extrais le prénom de la personne dont on parle dans la note
   - ATTENTION: Le prénom doit être un VRAI prénom français ou international (Marie, Jean, Sophie, Mohamed, etc.)
   - NE JAMAIS extraire de mots qui ne sont pas des prénoms ("si", "la", "le", "un", "elle", "il", "on", etc.)
   - Les prénoms composés comptent comme UN prénom (Jean-Luc, Marie-Claire, Pierre-Antoine)
   - Si aucun prénom clair n'est mentionné, utilise "Contact" comme placeholder
   - Nom de famille SEULEMENT si explicitement mentionné comme tel
   - En cas de doute entre plusieurs mots, choisis celui qui ressemble le plus à un prénom courant

2. TITRE DE LA NOTE:
   - Génère un titre court (2-4 mots) décrivant le contexte
   - Exemples: "Café rattrapage", "Après soirée Marc", "Appel pro", "Déjeuner networking"

3. FACTS (Profil permanent - infos stables):
   Catégories:
   - work: métier/poste (factKey="Métier")
   - company: entreprise (factKey="Entreprise")
   - education: formation/école (factKey="Formation")
   - location: lieu de vie (factKey="Ville")
   - origin: nationalité/origine (factKey="Origine")
   - partner: conjoint (factKey="Conjoint")
   - children: enfants avec prénoms (factKey="Enfants")
   - hobby: loisirs (factKey="Loisir")
   - sport: sports (factKey="Sport")
   - language: langues (factKey="Langue")
   - pet: animaux (factKey="Animal")
   - birthday: anniversaire (factKey="Anniversaire")
   - how_met: comment connu (factKey="Rencontre")
   - where_met: lieu de rencontre (factKey="Lieu rencontre")
   - shared_ref: références communes/inside jokes (factKey="Référence")
   - trait: signe distinctif (factKey="Trait")
   - gift_idea: idées cadeaux (factKey="Idée cadeau")
   - gift_given: cadeaux faits (factKey="Cadeau fait")
   - contact: coordonnées (factKey="Contact")

4. HOT TOPICS (Sujets chauds - temporaires/actionnables):
   NOUVEAUX sujets à créer:
   - Projets en cours: "Cherche un appart", "Prépare un examen"
   - Événements à suivre: "Mariage prévu en juin"
   - Situations: "Problème au travail", "En recherche d'emploi"

5. DÉTECTION DE RÉSOLUTION DE SUJETS EXISTANTS:
   Si des SUJETS CHAUDS EXISTANTS (listés ci-dessus) semblent RÉSOLUS ou TERMINÉS selon la transcription:
   - Retourne leurs IDs dans resolvedTopicIds
   - Exemples de résolution:
     • "Semi-marathon de Niko" → résolu si la note dit "Niko a couru son semi en 1h40"
     • "Recherche d'emploi" → résolu si la note dit "Il a trouvé un job"
     • "Examen de droit" → résolu si la note dit "Elle a eu son examen"
   - Ne marque comme résolu QUE si la transcription indique CLAIREMENT que c'est terminé

RÈGLES:
- facts = infos PERMANENTES du profil
- hotTopics = NOUVEAUX sujets TEMPORAIRES à suivre (pas ceux existants)
- resolvedTopicIds = IDs des sujets existants qui sont maintenant TERMINÉS
- N'extrais QUE ce qui est EXPLICITEMENT mentionné
- action="add" pour nouvelle info, "update" si modification d'un fact existant`;
};
