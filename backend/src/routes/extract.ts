import { Hono } from 'hono';
import { createXai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  XAI_API_KEY: string;
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
  resolvedTopics: z.array(
    z.object({
      id: z.string().describe('ID du sujet chaud existant'),
      resolution: z.string().describe('Ce qui s\'est passé / comment ça s\'est terminé (ex: "A couru le marathon en 3h12", "A eu son examen avec mention")'),
    })
  ).describe('Sujets chauds existants qui semblent résolus/terminés selon la note, avec leur résolution'),
  memories: z.array(
    z.object({
      description: z.string().describe('Description courte de l\'événement/souvenir (ex: "Saut à l\'élastique à Chamonix", "Week-end à la Baule ensemble")'),
      eventDate: z.string().nullable().describe('Date approximative si mentionnée (ex: "novembre 2024", "la semaine dernière")'),
      isShared: z.boolean().describe('true si c\'est un moment vécu ENSEMBLE avec le contact, false si c\'est quelque chose que le contact a fait seul'),
    })
  ).describe('Événements ponctuels/souvenirs marquants (PAS des loisirs réguliers). Ex: saut à l\'élastique, voyage, sortie exceptionnelle'),
  suggestedGroups: z.array(
    z.object({
      name: z.string().describe('Nom du groupe suggéré'),
      sourceFactType: z.enum([
        'company', 'how_met', 'where_met', 'sport', 'hobby'
      ]).describe('Le type de fact qui a déclenché cette suggestion'),
    })
  ).describe('Groupes suggérés basés sur les facts contextuels. UNIQUEMENT pour nouveaux contacts (pas de currentContact).'),
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

    const xai = createXai({
      apiKey: c.env.XAI_API_KEY,
    });

    const prompt = buildExtractionPrompt(transcription, currentContact);

    const { object: extraction } = await generateObject({
			model: xai('grok-4-1-fast'),
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
    // Only for NEW contacts (no currentContact provided)
    let suggestedNickname: string | null = null;
    if (!currentContact && extraction.facts.length > 0) {
      const priorityOrder = ['work', 'company', 'sport', 'hobby', 'location', 'education'];
      const sortedFacts = [...extraction.facts].sort((factA, factB) => {
        const indexA = priorityOrder.indexOf(factA.factType);
        const indexB = priorityOrder.indexOf(factB.factType);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      const mainFact = sortedFacts[0];
      suggestedNickname = mainFact.factValue.split(' ')[0]; // First word of the value
    }

    // Process suggested groups - match with existing or mark as new
    const processedGroups = (!currentContact && extraction.suggestedGroups)
      ? extraction.suggestedGroups.map((suggested) => {
          const existingGroup = body.existingGroups?.find(
            (group) => group.name.toLowerCase() === suggested.name.toLowerCase()
          );
          return {
            name: existingGroup?.name || suggested.name,
            isNew: !existingGroup,
            existingId: existingGroup?.id,
            sourceFactType: suggested.sourceFactType,
          };
        })
      : [];

    // For existing contacts, use their stored name instead of extracted name
    const formattedExtraction = {
      contactIdentified: {
        id: currentContact?.id || null,
        firstName: currentContact?.firstName || extraction.contactIdentified.firstName,
        lastName: currentContact?.lastName || extraction.contactIdentified.lastName,
        confidence: extraction.contactIdentified.confidence,
        needsDisambiguation: currentContact ? false : needsDisambiguation,
        suggestedMatches: currentContact ? [] : suggestedMatches,
        suggestedNickname,
      },
      noteTitle: extraction.noteTitle,
      facts: extraction.facts,
      hotTopics: extraction.hotTopics,
      resolvedTopics: extraction.resolvedTopics,
      memories: extraction.memories.map((memory) => ({
        description: memory.description,
        eventDate: memory.eventDate || undefined,
        isShared: memory.isShared,
      })),
      suggestedGroups: processedGroups,
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
   - Retourne leurs IDs dans resolvedTopics avec une résolution
   - La résolution décrit CE QUI S'EST PASSÉ / COMMENT ÇA S'EST TERMINÉ
   - Exemples:
     • Sujet: "Semi-marathon de Niko" + Note dit "Niko a couru son semi en 1h40"
       → { id: "...", resolution: "A couru le semi en 1h40" }
     • Sujet: "Recherche d'emploi" + Note dit "Il a trouvé un job chez Google"
       → { id: "...", resolution: "A trouvé un poste chez Google" }
     • Sujet: "Examen de droit" + Note dit "Elle a eu son examen avec 15/20"
       → { id: "...", resolution: "Réussi avec 15/20" }
   - Ne marque comme résolu QUE si la transcription indique CLAIREMENT que c'est terminé
   - La résolution doit être COURTE (quelques mots) mais INFORMATIVE

6. MEMORIES (Souvenirs / Événements ponctuels):
   DISTINCTION IMPORTANTE entre hobby (fact) et memory:
   - HOBBY/SPORT (fact): activité pratiquée RÉGULIÈREMENT ou comme loisir habituel
     Ex: "Il fait du running", "Elle joue aux échecs", "Il fait de l'escalade"
   - MEMORY: événement PONCTUEL, exceptionnel, une expérience unique
     Ex: "Il a fait un saut à l'élastique", "On est allés à la Baule ensemble", "Elle a fait un trek au Népal"

   Types de memories:
   - Sorties exceptionnelles: restaurant spécial, concert, événement
   - Voyages/excursions: week-end quelque part, vacances
   - Expériences uniques: saut en parachute, baptême de plongée
   - Moments partagés ensemble: "on a fait X ensemble"

   isShared = true si TU as vécu ça AVEC la personne
   isShared = false si la personne a fait ça de son côté

7. SUGGESTION DE GROUPES (uniquement si pas de currentContact fourni):
   Suggère des groupes basés sur les facts de type contextuel:
   - company: nom de l'entreprise → groupe (ex: "Affilae" → groupe "Affilae")
   - how_met: contexte de rencontre → groupe (ex: "meetup React" → groupe "Meetup React")
   - where_met: lieu de rencontre → groupe (ex: "salle de sport" → groupe "Sport")
   - sport: sport pratiqué → groupe (ex: "running" → groupe "Running")
   - hobby: loisir → groupe (ex: "échecs" → groupe "Échecs")
   Si currentContact est fourni, retourne un tableau vide pour suggestedGroups.

RÈGLES:
- facts = infos PERMANENTES du profil (hobbies = activités régulières)
- hotTopics = NOUVEAUX sujets TEMPORAIRES à suivre (pas ceux existants)
- resolvedTopics = sujets existants TERMINÉS avec leur résolution
- memories = événements PONCTUELS / souvenirs (PAS des hobbies réguliers)
- suggestedGroups = groupes suggérés UNIQUEMENT pour nouveaux contacts
- N'extrais QUE ce qui est EXPLICITEMENT mentionné
- action="add" pour nouvelle info, "update" si modification d'un fact existant`;
};
