import { Hono } from 'hono';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { format } from 'date-fns';
import { authMiddleware } from '../middleware/auth';
import { wrapUserInput, getSecurityInstructions } from '../lib/security';
import { createTracedAIModel, getAIProviderName, getAIModel, getStructuredOutputSettings } from '../lib/ai-provider';
import { measurePerformance } from '../lib/performance-logger';
import { generateWithRetries } from '../lib/generation-retry';
import { sanitizeEventDate } from '../lib/event-date-guard';
import { buildCalendarContext } from '../lib/date-context';
import { buildRespondingToTopicPreamble } from '../lib/responding-topic';
import { getLangfuseClient } from '../lib/telemetry';
import { evaluateExtraction } from '../lib/evaluators';
import { captureServerException } from '../lib/posthog';
import type { User } from '@prisma/client';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  OPENAI_API_KEY?: string;
  XAI_API_KEY: string;
  CEREBRAS_API_KEY?: string;
  AI_PROVIDER?: 'openai' | 'grok' | 'cerebras';
  ENABLE_PERFORMANCE_LOGGING?: boolean;
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
  respondingToTopic?: { id: string; title: string; eventDate?: string | null };
  language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

const normalizeContactName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  noteTitle: z.string().describe('Titre court et SPÉCIFIQUE de 2-5 mots capturant le SUJET PRINCIPAL discuté. Privilégier: le projet/événement clé mentionné, l\'actualité importante de la personne, ou le contexte de la rencontre. Exemples: "Entretien Google réussi", "Projet déménagement Lyon", "Grossesse annoncée", "Promotion obtenue", "Café après voyage Japon". ÉVITER les titres génériques comme "Discussion", "Rattrapage", "Nouvelles".'),
  contactInfo: z.object({
    phone: z.string().nullable().describe('Numéro de téléphone si mentionné'),
    email: z.string().nullable().describe('Adresse email si mentionnée'),
    birthday: z.object({
      day: z.number().describe('Jour du mois (1-31)'),
      month: z.number().describe('Mois (1-12)'),
      year: z.number().nullable().describe('Année si mentionnée'),
    }).nullable().describe('Date d\'anniversaire si mentionnée'),
  }).describe('Coordonnées de contact détectées'),
  meetingContext: z.string().nullable().describe('Phrase courte indiquant où/comment l\'utilisateur a rencontré ou connu le contact, si explicitement mentionné. Convertir toute date relative en date absolue avec jour, mois et année. null sinon.'),
  loves: z.array(z.string()).describe('Goûts, préférences ou envies explicitement attribués au contact. Libellés courts pour chips UI, ex: "Céramique", "Cafés calmes". Vide si absent.'),
  hotTopics: z.array(
    z.object({
      title: z.string().describe('Titre court du sujet (ex: "Entretien Google", "Déménagement Lyon")'),
      context: z.string().describe('1-2 phrases de contexte avec les détails importants'),
      eventDate: z.string().nullable().describe('OBLIGATOIRE si une date est mentionnée (relative ou absolue). Format: YYYY-MM-DD. Exemples: "la semaine prochaine" doit être converti en date ISO, "en juin" devient le 1er juin de sa prochaine occurrence a venir. null UNIQUEMENT si aucune date mentionnée.'),
    })
  ).describe('NOUVELLES actualités/sujets à suivre mentionnés dans la note (projets, événements, situations en cours)'),
  resolvedTopics: z.array(
    z.object({
      existingTopicId: z.string().describe('ID du hot topic existant'),
      resolution: z.string().describe('Description concrète de ce qui s\'est passé (ex: "Elle a été prise, commence en mars", "Trouvé 3 pièces à Belleville")'),
    })
  ).describe('Hot topics existants qui sont résolus selon cette note, avec leur résolution détaillée'),
});

type DateExamples = {
  jan25: string; feb15: string; mar31: string; apr01: string;
  june: string; summer: string; fall: string; winter: string; spring: string;
  nextYearNote: string;
};

/**
 * Un mois nommé sans annee ("en juin", "cet ete") designe la prochaine
 * occurrence a venir, pas celle de l'annee civile courante : en septembre,
 * "en juin" est dans neuf mois, pas trois mois en arriere.
 */
const nextOccurrence = (reference: Date, month: number, day: number): string => {
  const sameYear = new Date(Date.UTC(reference.getUTCFullYear(), month - 1, day));
  const rolled =
    sameYear.getTime() < Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate())
      ? new Date(Date.UTC(reference.getUTCFullYear() + 1, month - 1, day))
      : sameYear;
  return format(rolled, 'yyyy-MM-dd');
};

const lastDayOfNextOccurrence = (reference: Date, month: number): string => {
  const first = nextOccurrence(reference, month, 1);
  const year = Number(first.slice(0, 4));
  return format(new Date(Date.UTC(year, month, 0)), 'yyyy-MM-dd');
};

const buildDateExamples = (reference: Date, language: string): DateExamples => {
  const notes: Record<string, string> = {
    fr: 'Ces exemples sont calcules depuis la date de reference. Un mois nomme sans annee designe TOUJOURS sa prochaine occurrence a venir : si le mois est deja passe cette annee, utilise l\'annee suivante.',
    en: 'These examples are computed from the reference date. A month named without a year ALWAYS means its next upcoming occurrence: if that month is already past this year, use next year.',
    es: 'Estos ejemplos se calculan desde la fecha de referencia. Un mes nombrado sin ano SIEMPRE designa su proxima ocurrencia: si ese mes ya paso este ano, usa el ano siguiente.',
    it: 'Questi esempi sono calcolati dalla data di riferimento. Un mese indicato senza anno indica SEMPRE la sua prossima occorrenza: se quel mese e gia passato quest\'anno, usa l\'anno successivo.',
    de: 'Diese Beispiele werden aus dem Referenzdatum berechnet. Ein ohne Jahr genannter Monat bezeichnet IMMER sein naechstes Vorkommen: Ist der Monat dieses Jahr bereits vorbei, nimm das Folgejahr.',
  };
  return {
    jan25: nextOccurrence(reference, 1, 25),
    feb15: nextOccurrence(reference, 2, 15),
    mar31: lastDayOfNextOccurrence(reference, 3),
    apr01: nextOccurrence(reference, 4, 1),
    june: nextOccurrence(reference, 6, 1),
    summer: nextOccurrence(reference, 7, 1),
    fall: nextOccurrence(reference, 9, 1),
    winter: nextOccurrence(reference, 12, 1),
    spring: nextOccurrence(reference, 3, 1),
    nextYearNote: notes[language] || notes.fr,
  };
};

/**
 * Le squelette du contrat JSON est identique dans les cinq langues : seuls les
 * libelles changent. Le decrire une fois evite la derive ou un champ ajoute a
 * extractionSchema n'atteint que certaines traductions -- panne silencieuse qui
 * fait echouer la validation cote gpt-oss, lequel suit le prompt plutot que le
 * json_schema.
 */
type FormatJsonLabels = {
  header: string;
  hotTopicTitle: string;
  hotTopicContext: string;
  resolution: string;
  noteTitle: string;
  meetingContext: string;
  loveLabel: string;
};

const buildFormatJson = (labels: FormatJsonLabels): string => `${labels.header}
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
      "title": "${labels.hotTopicTitle}",
      "context": "${labels.hotTopicContext}",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "${labels.resolution}"
    }
  ],
  "noteTitle": "${labels.noteTitle}",
  "meetingContext": "${labels.meetingContext}" | null,
  "loves": ["${labels.loveLabel}", "..."]
}`;

const PROMPT_TEMPLATES: Record<string, {
  intro: string;
  dateReference: (currentDate: string) => string;
  currentContactHeader: string;
  existingTopicsHeader: string;
  languageResponse: string;
  task: string;
  rules: {
    rule0Title: string;
    rule0Content: string;
    rule1Title: string;
    rule1Content: string;
    rule2Title: string;
    rule2Content: string;
    rule3Title: string;
    rule3Content: (currentDate: string, ex: DateExamples) => string;
    rule4Title: string;
    rule4Content: string;
    rule5Title: string;
    rule5Content: string;
  };
  hotTopicExhaustiveness: string;
  multiDeadlineSituations: string;
  absoluteRules: string;
  formatJson: string;
  noteTitleRules: {
    header: string;
    goodExamples: string;
    badExamples: string;
    priority: string;
  };
  concreteExamples: (nextWeekDate: string, twoMonthsDate: string, ex: DateExamples) => string;
}> = {
  fr: {
    intro: 'Tu es un assistant qui extrait les actualités importantes d\'une note vocale.',
    dateReference: (currentDate) => `DATE DE RÉFÉRENCE: ${currentDate} (pour calculer les dates mentionnées)`,
    currentContactHeader: 'CONTACT ACTUELLEMENT SÉLECTIONNÉ',
    existingTopicsHeader: 'ACTUALITÉS EXISTANTES DE CE CONTACT',
    languageResponse: 'Tu DOIS répondre en français uniquement.',
    task: `TÂCHE:
1. Extrais les NOUVELLES actualités/sujets à suivre (projets, événements, situations en cours)
2. Détecte si des actualités existantes sont RÉSOLUES dans cette note
3. Détecte les infos de contact (téléphone, email, anniversaire) si mentionnées
4. Identifie le prénom de la personne dont on parle
5. Génère un titre SPÉCIFIQUE pour la note (2-5 mots) capturant le sujet principal discuté`,
    rules: {
      rule0Title: '0. COMPRENDRE QUI EST QUI - CRITIQUE',
      rule0Content: `La transcription est une note vocale enregistrée par l'UTILISATEUR DE L'APP.
   - "je", "me", "m'", "moi", "mon", "ma", "mes" = l'UTILISATEUR qui enregistre la note (PAS le contact)
   - Le CONTACT est la personne DONT on parle, pas celle qui parle

   Exemples:
   - "Marie m'a dit qu'elle cherche un appart" → Contact = Marie, "m'" = l'utilisateur
   - "Il m'a invité à son mariage" → "m'" = l'utilisateur, "son mariage" = hot topic du contact
   - "On s'est vu hier, elle m'a raconté son entretien" → "m'" = l'utilisateur, "son entretien" = hot topic du contact

   DONC: Les infos après "m'a dit", "m'a raconté", "m'a parlé de" concernent le CONTACT, pas l'utilisateur.`,
      rule1Title: '1. IDENTIFICATION DU CONTACT',
      rule1Content: `- Extrais le prénom de la personne DONT on parle (le sujet de la note)
   - Le prénom doit être un VRAI prénom (Marie, Jean, Sophie, etc.)
   - Nom de famille SEULEMENT si explicitement mentionné
   - Si aucun prénom clair, utilise "Contact"`,
      rule2Title: '2. HOT TOPICS = quelque chose de TEMPORAIRE qu\'on voudra suivre/redemander',
      rule2Content: `- Projets en cours: "Cherche un appart", "Prépare un examen"
   - Événements à suivre: "Mariage", "Entretien d'embauche"
   - Situations temporaires: "Problème au travail", "En recherche d'emploi"

   PAS un hot topic:
   - Traits permanents: métier stable, hobbies réguliers
   - Infos statiques: lieu de vie, formation
   - Activités régulières: "fait du sport", "joue aux échecs"`,
      rule3Title: '3. DATES ABSOLUES (format ISO: YYYY-MM-DD) - CRITIQUE',
      rule3Content: (currentDate, ex) => `Aujourd'hui c'est ${currentDate}. Tu DOIS calculer et retourner eventDate pour TOUTE mention de date.

   Calculs temporels (OBLIGATOIRE - calcule la date exacte):
   - "demain" → ${currentDate} + 1 jour
   - "dans X jours" → ${currentDate} + X jours
   - "la semaine prochaine" → ${currentDate} + 7 jours
   - "dans 2 semaines" → ${currentDate} + 14 jours
   - "le mois prochain" → premier jour du mois suivant
   - "dans 3 mois" → ${currentDate} + 3 mois

   Dates fixes:
   - "le 25 janvier" → ${ex.jan25}
   - "le 15/02" → ${ex.feb15}
   - "mi-février" → ${ex.feb15}
   - "fin mars" → ${ex.mar31}
   - "début avril" → ${ex.apr01}

   Périodes/saisons (utilise le premier jour):
   - "en juin" → ${ex.june}
   - "cet été" → ${ex.summer}
   - "l'automne prochain" → ${ex.fall}
   - "cet hiver" → ${ex.winter}
   - "le printemps" → ${ex.spring}

   RÈGLE CRITIQUE - eventDate:
   - Si une date est EXPLICITEMENT mentionnée (relative ou absolue), tu DOIS retourner eventDate en YYYY-MM-DD
   - Exemples où eventDate est OBLIGATOIRE:
     * "entretien la semaine prochaine" → eventDate = date calculée
     * "déménage dans 2 mois" → eventDate = date calculée
     * "mariage en juin" → eventDate = "${ex.june}"
     * "examen le 15" → eventDate = "${currentDate.slice(0, 4)}-XX-15" (mois actuel ou suivant)
   - eventDate = null si aucune date mentionnée OU date trop vague ("un jour", "bientôt", "peut-être")
   - IMPORTANT: N'utilise PAS la date du jour comme date par défaut. Si l'événement n'a pas de référence temporelle explicite, eventDate = null

   ${ex.nextYearNote}`,
      rule4Title: '4. RÉSOLUTION D\'ACTUALITÉS EXISTANTES',
      rule4Content: `Si une actualité existante est mentionnée avec une issue, marque-la résolue.

   RÈGLE CRITIQUE:
   - Extrais TOUS les détails concrets de la transcription
   - Inclus: résultats chiffrés, noms, lieux, dates, anecdotes
   - Si aucun détail → résolution = "Effectué"

   Exemples:
   • "Elle a eu son entretien chez Google" → "Effectué"
   • "Elle a été prise chez Google, commence en mars" → "Elle a été prise, commence en mars"
   • "Il a trouvé un appart dans le 11ème, 45m²" → "Trouvé dans le 11ème, 45m²"`,
      rule5Title: '5. INFOS DE CONTACT',
      rule5Content: `- phone: numéro si mentionné
   - email: adresse si mentionnée
     IMPORTANT: Les moteurs de transcription vocale ne transcrivent JAMAIS le symbole "@".
     Il est remplacé par un point ou un espace (ex: "clement.cerize.gmail.com" au lieu de "clement.cerize@gmail.com").
     Les mots "arobase", "arrobase", "at" dans la transcription signifient "@".
     Tu DOIS reconstituer l'adresse email correcte avec "@" devant le nom de domaine.
   - birthday: { day, month, year } si anniversaire mentionné (year peut être null)`,
    },
    hotTopicExhaustiveness: `EXHAUSTIVITÉ DES HOT TOPICS - CRITIQUE:
- Crée UN hot topic SÉPARÉ par actualité distincte. Ne fusionne JAMAIS deux actualités
  différentes en une seule, même si elles sont liées: "déménagement" et "visite d'appartement"
  sont deux hot topics, pas un seul; "grossesse" et "recherche de nourrice" aussi.
- Avant de répondre, relis la transcription et compte les actualités temporaires mentionnées.
  Ton tableau hotTopics doit en contenir autant. Si tu en as moins, tu en as oublié: reprends.
- Une actualité déjà présente dans les ACTUALITÉS EXISTANTES compte aussi: si la note lui
  ajoute une date ou un détail nouveau sans la résoudre, crée le hot topic correspondant.
  Si la note n'y ajoute rien ("il attend toujours", "rien de neuf"), ne la recrée PAS.
- La concision n'est PAS un objectif ici. Mieux vaut un hot topic de trop qu'un oublié.`,
    multiDeadlineSituations: `UNE SITUATION PEUT PORTER PLUSIEURS ÉCHÉANCES:
- Si une même situation implique plusieurs échéances ou démarches distinctes, crée UN hot topic
  PAR ÉCHÉANCE, pas un seul pour la situation entière.
- Exemple: "le proprio veut vendre, j'ai trois mois pour partir, et j'ai rendez-vous à la banque
  vendredi pour un prêt" = TROIS hot topics (départ du logement, recherche d'achat, rendez-vous
  bancaire), parce que chacun a sa propre date et son propre suivi.
- Le test: si deux éléments méritent des rappels à des moments différents, ce sont deux hot topics.
- Cette règle DÉCOUPE une situation réellement présente dans la note. Elle n'autorise jamais à
  inventer une échéance non mentionnée, ni à recréer une actualité déjà listée dans les
  ACTUALITÉS EXISTANTES à laquelle la note n'ajoute rien de neuf.`,
    absoluteRules: `RÈGLES ABSOLUES:
1. N'invente JAMAIS d'information non présente dans la transcription
2. Utilise des dates ABSOLUES (YYYY-MM-DD), jamais relatives
3. Si pas assez d'informations, retourne moins de résultats
4. Ne crée un hot topic QUE si c'est temporaire/actionnable`,
    formatJson: buildFormatJson({
      header: `FORMAT JSON (les 7 champs sont OBLIGATOIRES : renvoie meetingContext=null et loves=[] si rien à mettre dedans):`,
      hotTopicTitle: `Titre court (3-5 mots)`,
      hotTopicContext: `1-2 phrases de contexte avec les détails importants`,
      resolution: `Description concrète de ce qui s'est passé`,
      noteTitle: `Titre SPÉCIFIQUE capturant le sujet principal (2-5 mots)`,
      meetingContext: `Où/comment l'utilisateur a rencontré le contact`,
      loveLabel: `Libellé court`,
    }),
    noteTitleRules: {
      header: 'RÈGLES POUR noteTitle - CRITIQUE:\nLe titre doit permettre à l\'utilisateur de retrouver facilement la note plus tard.',
      goodExamples: `BON titre (spécifique, mémorable):
- "Entretien Google réussi" (événement clé)
- "Grossesse annoncée" (nouvelle importante)
- "Projet startup IA" (sujet principal)
- "Retour voyage Japon" (contexte + lieu)
- "Promotion directrice" (actualité majeure)
- "Rupture avec Thomas" (situation importante)`,
      badExamples: `MAUVAIS titre (trop générique, inutile):
- "Discussion" ❌
- "Café" ❌
- "Rattrapage" ❌
- "Nouvelles" ❌
- "Appel" ❌
- "Point" ❌`,
      priority: `PRIORITÉ pour choisir le titre:
1. L'actualité/événement MAJEUR mentionné (promotion, mariage, déménagement, etc.)
2. Le projet/situation EN COURS discuté (recherche emploi, achat maison, etc.)
3. Le contexte de la rencontre SI spécifique (anniversaire 30 ans, retour de voyage, etc.)`,
    },
    concreteExamples: (nextWeekDate, twoMonthsDate, ex) => `EXEMPLES CONCRETS DE HOT TOPICS AVEC DATES:

Exemple 1 - "Marie a un entretien chez Google la semaine prochaine":
{
  "noteTitle": "Entretien Google prévu",
  "hotTopics": [{
    "title": "Entretien Google",
    "context": "Elle passe un entretien d'embauche chez Google.",
    "eventDate": "${nextWeekDate}"
  }]
}

Exemple 2 - "On s'est vu au café, il m'a dit qu'il déménage à Lyon dans 2 mois pour son nouveau boulot":
{
  "noteTitle": "Déménagement Lyon nouveau job",
  "hotTopics": [{
    "title": "Déménagement Lyon",
    "context": "Il prépare son déménagement pour s'installer à Lyon pour un nouveau travail.",
    "eventDate": "${twoMonthsDate}"
  }]
}

Exemple 3 - "Elle m'a annoncé qu'elle est enceinte, elle se marie en juin":
{
  "noteTitle": "Grossesse et mariage annoncés",
  "hotTopics": [{
    "title": "Mariage",
    "context": "Elle prépare son mariage prévu pour juin.",
    "eventDate": "${ex.june}"
  }]
}

Exemple 4 - "On a pris un café, elle m'a raconté ses vacances":
{
  "noteTitle": "Retour de vacances",
  "hotTopics": []
}`,
  },
  en: {
    intro: 'You are an assistant that extracts important updates from a voice note.',
    dateReference: (currentDate) => `REFERENCE DATE: ${currentDate} (to calculate mentioned dates)`,
    currentContactHeader: 'CURRENTLY SELECTED CONTACT',
    existingTopicsHeader: 'EXISTING UPDATES FOR THIS CONTACT',
    languageResponse: 'You MUST respond in English only.',
    task: `TASK:
1. Extract NEW updates/topics to follow up on (projects, events, ongoing situations)
2. Detect if existing updates are RESOLVED in this note
3. Detect contact info (phone, email, birthday) if mentioned
4. Identify the first name of the person being discussed
5. Generate a SPECIFIC title for the note (2-5 words) capturing the main topic discussed`,
    rules: {
      rule0Title: '0. UNDERSTANDING WHO IS WHO - CRITICAL',
      rule0Content: `The transcription is a voice note recorded by the APP USER.
   - "I", "me", "my", "mine" = the USER recording the note (NOT the contact)
   - The CONTACT is the person being TALKED ABOUT, not the one speaking

   Examples:
   - "Marie told me she's looking for an apartment" → Contact = Marie, "me" = the user
   - "He invited me to his wedding" → "me" = the user, "his wedding" = contact's hot topic
   - "We met yesterday, she told me about her interview" → "me" = the user, "her interview" = contact's hot topic

   THEREFORE: Information after "told me", "mentioned to me", "talked about" concerns the CONTACT, not the user.`,
      rule1Title: '1. CONTACT IDENTIFICATION',
      rule1Content: `- Extract the first name of the person being TALKED ABOUT (the subject of the note)
   - The first name must be a REAL first name (Marie, John, Sophie, etc.)
   - Last name ONLY if explicitly mentioned
   - If no clear first name, use "Contact"`,
      rule2Title: '2. HOT TOPICS = something TEMPORARY that you\'ll want to follow up on',
      rule2Content: `- Ongoing projects: "Looking for an apartment", "Preparing for an exam"
   - Events to follow: "Wedding", "Job interview"
   - Temporary situations: "Problem at work", "Job hunting"

   NOT a hot topic:
   - Permanent traits: stable job, regular hobbies
   - Static info: place of residence, education
   - Regular activities: "does sports", "plays chess"`,
      rule3Title: '3. ABSOLUTE DATES (ISO format: YYYY-MM-DD) - CRITICAL',
      rule3Content: (currentDate, ex) => `Today is ${currentDate}. You MUST calculate and return eventDate for ANY date mention.

   Time calculations (MANDATORY - calculate the exact date):
   - "tomorrow" → ${currentDate} + 1 day
   - "in X days" → ${currentDate} + X days
   - "next week" → ${currentDate} + 7 days
   - "in 2 weeks" → ${currentDate} + 14 days
   - "next month" → first day of next month
   - "in 3 months" → ${currentDate} + 3 months

   Fixed dates:
   - "January 25th" → ${ex.jan25}
   - "02/15" → ${ex.feb15}
   - "mid-February" → ${ex.feb15}
   - "end of March" → ${ex.mar31}
   - "early April" → ${ex.apr01}

   Periods/seasons (use the first day):
   - "in June" → ${ex.june}
   - "this summer" → ${ex.summer}
   - "next fall" → ${ex.fall}
   - "this winter" → ${ex.winter}
   - "spring" → ${ex.spring}

   CRITICAL RULE - eventDate:
   - If a date is EXPLICITLY mentioned (relative or absolute), you MUST return eventDate in YYYY-MM-DD
   - Examples where eventDate is MANDATORY:
     * "interview next week" → eventDate = calculated date
     * "moving in 2 months" → eventDate = calculated date
     * "wedding in June" → eventDate = "${ex.june}"
     * "exam on the 15th" → eventDate = "${currentDate.slice(0, 4)}-XX-15" (current or next month)
   - eventDate = null if no date mentioned OR date too vague ("someday", "soon", "maybe")
   - IMPORTANT: Do NOT use today's date as a default. If the event has no explicit temporal reference, eventDate = null`,
      rule4Title: '4. RESOLUTION OF EXISTING UPDATES',
      rule4Content: `If an existing update is mentioned with an outcome, mark it as resolved.

   CRITICAL RULE:
   - Extract ALL concrete details from the transcription
   - Include: numerical results, names, places, dates, anecdotes
   - If no details → resolution = "Completed"

   Examples:
   • "She had her interview at Google" → "Completed"
   • "She got the job at Google, starts in March" → "She got the job, starts in March"
   • "He found an apartment in the 11th, 45m²" → "Found in the 11th, 45m²"`,
      rule5Title: '5. CONTACT INFO',
      rule5Content: `- phone: number if mentioned
   - email: address if mentioned
     IMPORTANT: Speech-to-text engines NEVER transcribe the "@" symbol.
     It gets replaced by a dot or space (e.g. "john.doe.gmail.com" instead of "john.doe@gmail.com").
     Words like "at", "arobase", "arrobase" in the transcription mean "@".
     You MUST reconstruct the correct email address with "@" before the domain name.
   - birthday: { day, month, year } if birthday mentioned (year can be null)`,
    },
    hotTopicExhaustiveness: `HOT TOPIC EXHAUSTIVENESS - CRITICAL:
- Create ONE SEPARATE hot topic per distinct piece of news. NEVER merge two different
  items into one, even when related: "moving" and "apartment viewing" are two hot topics,
  not one; so are "pregnancy" and "looking for a nanny".
- Before answering, re-read the transcription and count the temporary items mentioned.
  Your hotTopics array must contain that many. Fewer means you dropped one: go back.
- An item already listed in EXISTING TOPICS counts too: if the note adds a new date or
  detail without resolving it, create the corresponding hot topic. If the note adds nothing
  ("still waiting", "no news"), do NOT recreate it.
- Conciseness is NOT a goal here. One hot topic too many beats one missed.`,
    multiDeadlineSituations: `ONE SITUATION CAN CARRY SEVERAL DEADLINES:
- When a single situation involves several distinct deadlines or steps, create ONE hot topic
  PER DEADLINE, not one for the whole situation.
- Example: "the landlord is selling, I have three months to move out, and I have a bank
  appointment Friday about a loan" = THREE hot topics (moving out, house hunting, bank
  appointment), because each has its own date and its own follow-up.
- The test: if two items deserve reminders at different moments, they are two hot topics.
- This rule SPLITS a situation actually present in the note. It never licenses inventing a
  deadline that was not mentioned, nor recreating an item already listed in EXISTING TOPICS
  that the note adds nothing new to.`,
    absoluteRules: `ABSOLUTE RULES:
1. NEVER invent information not present in the transcription
2. Use ABSOLUTE dates (YYYY-MM-DD), never relative
3. If not enough information, return fewer results
4. Only create a hot topic if it's temporary/actionable`,
    formatJson: buildFormatJson({
      header: `JSON FORMAT (all 7 fields are REQUIRED: return meetingContext=null and loves=[] when there is nothing to put in them):`,
      hotTopicTitle: `Short title (3-5 words)`,
      hotTopicContext: `1-2 sentences of context with important details`,
      resolution: `Concrete description of what happened`,
      noteTitle: `SPECIFIC title capturing the main topic (2-5 words)`,
      meetingContext: `Where/how the user met the contact`,
      loveLabel: `Short label`,
    }),
    noteTitleRules: {
      header: 'RULES FOR noteTitle - CRITICAL:\nThe title should help the user easily find the note later.',
      goodExamples: `GOOD title (specific, memorable):
- "Google interview success" (key event)
- "Pregnancy announced" (important news)
- "AI startup project" (main topic)
- "Back from Japan trip" (context + location)
- "Director promotion" (major update)
- "Breakup with Thomas" (important situation)`,
      badExamples: `BAD title (too generic, useless):
- "Discussion" ❌
- "Coffee" ❌
- "Catch-up" ❌
- "News" ❌
- "Call" ❌
- "Update" ❌`,
      priority: `PRIORITY for choosing the title:
1. The MAJOR update/event mentioned (promotion, wedding, move, etc.)
2. The ONGOING project/situation discussed (job search, house purchase, etc.)
3. The meeting context IF specific (30th birthday, back from trip, etc.)`,
    },
    concreteExamples: (nextWeekDate, twoMonthsDate, ex) => `CONCRETE EXAMPLES OF HOT TOPICS WITH DATES:

Example 1 - "Marie has an interview at Google next week":
{
  "noteTitle": "Google interview scheduled",
  "hotTopics": [{
    "title": "Google interview",
    "context": "She has a job interview at Google.",
    "eventDate": "${nextWeekDate}"
  }]
}

Example 2 - "We met at the coffee shop, he told me he's moving to Lyon in 2 months for his new job":
{
  "noteTitle": "Moving to Lyon new job",
  "hotTopics": [{
    "title": "Moving to Lyon",
    "context": "He's preparing to move to Lyon for a new job.",
    "eventDate": "${twoMonthsDate}"
  }]
}

Example 3 - "She told me she's pregnant, she's getting married in June":
{
  "noteTitle": "Pregnancy and wedding announced",
  "hotTopics": [{
    "title": "Wedding",
    "context": "She's preparing her wedding planned for June.",
    "eventDate": "${ex.june}"
  }]
}

Example 4 - "We had coffee, she told me about her vacation":
{
  "noteTitle": "Back from vacation",
  "hotTopics": []
}`,
  },
  es: {
    intro: 'Eres un asistente que extrae las novedades importantes de una nota de voz.',
    dateReference: (currentDate) => `FECHA DE REFERENCIA: ${currentDate} (para calcular las fechas mencionadas)`,
    currentContactHeader: 'CONTACTO ACTUALMENTE SELECCIONADO',
    existingTopicsHeader: 'NOVEDADES EXISTENTES DE ESTE CONTACTO',
    languageResponse: 'DEBES responder solo en español.',
    task: `TAREA:
1. Extrae las NUEVAS novedades/temas a seguir (proyectos, eventos, situaciones en curso)
2. Detecta si novedades existentes están RESUELTAS en esta nota
3. Detecta la información de contacto (teléfono, email, cumpleaños) si se menciona
4. Identifica el nombre de la persona de quien se habla
5. Genera un título ESPECÍFICO para la nota (2-5 palabras) capturando el tema principal discutido`,
    rules: {
      rule0Title: '0. ENTENDER QUIÉN ES QUIÉN - CRÍTICO',
      rule0Content: `La transcripción es una nota de voz grabada por el USUARIO DE LA APP.
   - "yo", "me", "mi", "mis", "mío" = el USUARIO que graba la nota (NO el contacto)
   - El CONTACTO es la persona DE QUIEN se habla, no quien habla

   Ejemplos:
   - "María me dijo que busca apartamento" → Contacto = María, "me" = el usuario
   - "Me invitó a su boda" → "me" = el usuario, "su boda" = hot topic del contacto
   - "Nos vimos ayer, me contó su entrevista" → "me" = el usuario, "su entrevista" = hot topic del contacto

   POR TANTO: La información después de "me dijo", "me contó", "me habló de" concierne al CONTACTO, no al usuario.`,
      rule1Title: '1. IDENTIFICACIÓN DEL CONTACTO',
      rule1Content: `- Extrae el nombre de la persona DE QUIEN se habla (el sujeto de la nota)
   - El nombre debe ser un NOMBRE REAL (María, Juan, Sofía, etc.)
   - Apellido SOLO si se menciona explícitamente
   - Si no hay nombre claro, usa "Contacto"`,
      rule2Title: '2. HOT TOPICS = algo TEMPORAL que querrás seguir/volver a preguntar',
      rule2Content: `- Proyectos en curso: "Busca apartamento", "Prepara un examen"
   - Eventos a seguir: "Boda", "Entrevista de trabajo"
   - Situaciones temporales: "Problema en el trabajo", "Buscando empleo"

   NO es un hot topic:
   - Rasgos permanentes: trabajo estable, hobbies regulares
   - Info estática: lugar de residencia, formación
   - Actividades regulares: "hace deporte", "juega al ajedrez"`,
      rule3Title: '3. FECHAS ABSOLUTAS (formato ISO: YYYY-MM-DD) - CRÍTICO',
      rule3Content: (currentDate, ex) => `Hoy es ${currentDate}. DEBES calcular y devolver eventDate para CUALQUIER mención de fecha.

   Cálculos temporales (OBLIGATORIO - calcula la fecha exacta):
   - "mañana" → ${currentDate} + 1 día
   - "en X días" → ${currentDate} + X días
   - "la semana que viene" → ${currentDate} + 7 días
   - "en 2 semanas" → ${currentDate} + 14 días
   - "el mes que viene" → primer día del mes siguiente
   - "en 3 meses" → ${currentDate} + 3 meses

   Fechas fijas:
   - "el 25 de enero" → ${ex.jan25}
   - "el 15/02" → ${ex.feb15}
   - "a mediados de febrero" → ${ex.feb15}
   - "a finales de marzo" → ${ex.mar31}
   - "a principios de abril" → ${ex.apr01}

   Períodos/estaciones (usa el primer día):
   - "en junio" → ${ex.june}
   - "este verano" → ${ex.summer}
   - "el próximo otoño" → ${ex.fall}
   - "este invierno" → ${ex.winter}
   - "la primavera" → ${ex.spring}

   REGLA CRÍTICA - eventDate:
   - Si se menciona EXPLÍCITAMENTE una fecha (relativa o absoluta), DEBES devolver eventDate en YYYY-MM-DD
   - Ejemplos donde eventDate es OBLIGATORIO:
     * "entrevista la semana que viene" → eventDate = fecha calculada
     * "se muda en 2 meses" → eventDate = fecha calculada
     * "boda en junio" → eventDate = "${ex.june}"
     * "examen el 15" → eventDate = "${currentDate.slice(0, 4)}-XX-15" (mes actual o siguiente)
   - eventDate = null si no se menciona fecha O fecha demasiado vaga ("algún día", "pronto", "quizás")
   - IMPORTANTE: NO uses la fecha de hoy como predeterminada. Si el evento no tiene referencia temporal explícita, eventDate = null`,
      rule4Title: '4. RESOLUCIÓN DE NOVEDADES EXISTENTES',
      rule4Content: `Si se menciona una novedad existente con un resultado, márcala como resuelta.

   REGLA CRÍTICA:
   - Extrae TODOS los detalles concretos de la transcripción
   - Incluye: resultados numéricos, nombres, lugares, fechas, anécdotas
   - Si no hay detalles → resolución = "Completado"

   Ejemplos:
   • "Tuvo su entrevista en Google" → "Completado"
   • "La contrataron en Google, empieza en marzo" → "La contrataron, empieza en marzo"
   • "Encontró apartamento en el centro, 45m²" → "Encontrado en el centro, 45m²"`,
      rule5Title: '5. INFORMACIÓN DE CONTACTO',
      rule5Content: `- phone: número si se menciona
   - email: dirección si se menciona
     IMPORTANTE: Los motores de transcripción vocal NUNCA transcriben el símbolo "@".
     Se reemplaza por un punto o espacio (ej: "juan.perez.gmail.com" en vez de "juan.perez@gmail.com").
     Las palabras "arroba", "arobase", "at" en la transcripción significan "@".
     DEBES reconstruir la dirección email correcta con "@" antes del nombre de dominio.
   - birthday: { day, month, year } si se menciona cumpleaños (year puede ser null)`,
    },
    hotTopicExhaustiveness: `EXHAUSTIVIDAD DE LOS HOT TOPICS - CRÍTICO:
- Crea UN hot topic SEPARADO por cada novedad distinta. NUNCA fusiones dos novedades
  diferentes en una sola, aunque estén relacionadas: "mudanza" y "visita de piso" son dos
  hot topics, no uno; lo mismo para "embarazo" y "buscar niñera".
- Antes de responder, relee la transcripción y cuenta las novedades temporales mencionadas.
  Tu array hotTopics debe contener esa cantidad. Si tienes menos, olvidaste alguna: vuelve.
- Una novedad ya presente en las ACTUALIDADES EXISTENTES también cuenta: si la nota le
  añade una fecha o un detalle nuevo sin resolverla, crea el hot topic correspondiente.
  Si la nota no le añade nada ("sigue esperando", "nada nuevo"), NO la recrees.
- La concisión NO es un objetivo aquí. Mejor un hot topic de más que uno olvidado.`,
    multiDeadlineSituations: `UNA SITUACIÓN PUEDE TENER VARIOS PLAZOS:
- Si una misma situación implica varios plazos o gestiones distintas, crea UN hot topic POR
  PLAZO, no uno solo para toda la situación.
- Ejemplo: "el casero quiere vender, tengo tres meses para irme, y tengo cita en el banco el
  viernes para un préstamo" = TRES hot topics (salida de la vivienda, búsqueda de compra, cita
  bancaria), porque cada uno tiene su propia fecha y su propio seguimiento.
- La prueba: si dos elementos merecen recordatorios en momentos diferentes, son dos hot topics.
- Esta regla DIVIDE una situación realmente presente en la nota. Nunca autoriza a inventar un
  plazo no mencionado, ni a recrear una actualidad ya listada en las ACTUALIDADES EXISTENTES a
  la que la nota no añade nada nuevo.`,
    absoluteRules: `REGLAS ABSOLUTAS:
1. NUNCA inventes información que no esté en la transcripción
2. Usa fechas ABSOLUTAS (YYYY-MM-DD), nunca relativas
3. Si no hay suficiente información, devuelve menos resultados
4. Solo crea un hot topic si es temporal/accionable`,
    formatJson: buildFormatJson({
      header: `FORMATO JSON (los 7 campos son OBLIGATORIOS: devuelve meetingContext=null y loves=[] si no hay nada):`,
      hotTopicTitle: `Título corto (3-5 palabras)`,
      hotTopicContext: `1-2 frases de contexto con los detalles importantes`,
      resolution: `Descripción concreta de lo que pasó`,
      noteTitle: `Título ESPECÍFICO capturando el tema principal (2-5 palabras)`,
      meetingContext: `Dónde/cómo el usuario conoció al contacto`,
      loveLabel: `Etiqueta corta`,
    }),
    noteTitleRules: {
      header: 'REGLAS PARA noteTitle - CRÍTICO:\nEl título debe permitir al usuario encontrar fácilmente la nota después.',
      goodExamples: `BUEN título (específico, memorable):
- "Entrevista Google exitosa" (evento clave)
- "Embarazo anunciado" (noticia importante)
- "Proyecto startup IA" (tema principal)
- "Vuelta viaje Japón" (contexto + lugar)
- "Ascenso a directora" (novedad mayor)
- "Ruptura con Tomás" (situación importante)`,
      badExamples: `MAL título (demasiado genérico, inútil):
- "Conversación" ❌
- "Café" ❌
- "Ponerse al día" ❌
- "Novedades" ❌
- "Llamada" ❌
- "Punto" ❌`,
      priority: `PRIORIDAD para elegir el título:
1. La novedad/evento MAYOR mencionado (ascenso, boda, mudanza, etc.)
2. El proyecto/situación EN CURSO discutido (búsqueda de empleo, compra de casa, etc.)
3. El contexto del encuentro SI es específico (cumpleaños 30, vuelta de viaje, etc.)`,
    },
    concreteExamples: (nextWeekDate, twoMonthsDate, ex) => `EJEMPLOS CONCRETOS DE HOT TOPICS CON FECHAS:

Ejemplo 1 - "María tiene una entrevista en Google la semana que viene":
{
  "noteTitle": "Entrevista Google prevista",
  "hotTopics": [{
    "title": "Entrevista Google",
    "context": "Tiene una entrevista de trabajo en Google.",
    "eventDate": "${nextWeekDate}"
  }]
}

Ejemplo 2 - "Nos vimos en el café, me dijo que se muda a Madrid en 2 meses por su nuevo trabajo":
{
  "noteTitle": "Mudanza Madrid nuevo trabajo",
  "hotTopics": [{
    "title": "Mudanza Madrid",
    "context": "Prepara su mudanza para instalarse en Madrid por un nuevo trabajo.",
    "eventDate": "${twoMonthsDate}"
  }]
}

Ejemplo 3 - "Me anunció que está embarazada, se casa en junio":
{
  "noteTitle": "Embarazo y boda anunciados",
  "hotTopics": [{
    "title": "Boda",
    "context": "Prepara su boda prevista para junio.",
    "eventDate": "${ex.june}"
  }]
}

Ejemplo 4 - "Tomamos un café, me contó sus vacaciones":
{
  "noteTitle": "Vuelta de vacaciones",
  "hotTopics": []
}`,
  },
  it: {
    intro: 'Sei un assistente che estrae le novità importanti da una nota vocale.',
    dateReference: (currentDate) => `DATA DI RIFERIMENTO: ${currentDate} (per calcolare le date menzionate)`,
    currentContactHeader: 'CONTATTO ATTUALMENTE SELEZIONATO',
    existingTopicsHeader: 'NOVITÀ ESISTENTI DI QUESTO CONTATTO',
    languageResponse: 'DEVI rispondere solo in italiano.',
    task: `COMPITO:
1. Estrai le NUOVE novità/argomenti da seguire (progetti, eventi, situazioni in corso)
2. Rileva se novità esistenti sono RISOLTE in questa nota
3. Rileva le informazioni di contatto (telefono, email, compleanno) se menzionate
4. Identifica il nome della persona di cui si parla
5. Genera un titolo SPECIFICO per la nota (2-5 parole) catturando l'argomento principale discusso`,
    rules: {
      rule0Title: '0. CAPIRE CHI È CHI - CRITICO',
      rule0Content: `La trascrizione è una nota vocale registrata dall'UTENTE DELL'APP.
   - "io", "mi", "me", "mio", "mia", "miei" = l'UTENTE che registra la nota (NON il contatto)
   - Il CONTATTO è la persona DI CUI si parla, non chi parla

   Esempi:
   - "Maria mi ha detto che cerca un appartamento" → Contatto = Maria, "mi" = l'utente
   - "Mi ha invitato al suo matrimonio" → "mi" = l'utente, "suo matrimonio" = hot topic del contatto
   - "Ci siamo visti ieri, mi ha raccontato il suo colloquio" → "mi" = l'utente, "suo colloquio" = hot topic del contatto

   QUINDI: Le informazioni dopo "mi ha detto", "mi ha raccontato", "mi ha parlato di" riguardano il CONTATTO, non l'utente.`,
      rule1Title: '1. IDENTIFICAZIONE DEL CONTATTO',
      rule1Content: `- Estrai il nome della persona DI CUI si parla (il soggetto della nota)
   - Il nome deve essere un VERO nome (Maria, Giovanni, Sofia, ecc.)
   - Cognome SOLO se esplicitamente menzionato
   - Se nessun nome chiaro, usa "Contatto"`,
      rule2Title: '2. HOT TOPICS = qualcosa di TEMPORANEO che vorrai seguire/richiedere',
      rule2Content: `- Progetti in corso: "Cerca un appartamento", "Prepara un esame"
   - Eventi da seguire: "Matrimonio", "Colloquio di lavoro"
   - Situazioni temporanee: "Problema al lavoro", "In cerca di lavoro"

   NON è un hot topic:
   - Tratti permanenti: lavoro stabile, hobby regolari
   - Info statiche: luogo di residenza, formazione
   - Attività regolari: "fa sport", "gioca a scacchi"`,
      rule3Title: '3. DATE ASSOLUTE (formato ISO: YYYY-MM-DD) - CRITICO',
      rule3Content: (currentDate, ex) => `Oggi è ${currentDate}. DEVI calcolare e restituire eventDate per QUALSIASI menzione di data.

   Calcoli temporali (OBBLIGATORIO - calcola la data esatta):
   - "domani" → ${currentDate} + 1 giorno
   - "tra X giorni" → ${currentDate} + X giorni
   - "la settimana prossima" → ${currentDate} + 7 giorni
   - "tra 2 settimane" → ${currentDate} + 14 giorni
   - "il mese prossimo" → primo giorno del mese successivo
   - "tra 3 mesi" → ${currentDate} + 3 mesi

   Date fisse:
   - "il 25 gennaio" → ${ex.jan25}
   - "il 15/02" → ${ex.feb15}
   - "a metà febbraio" → ${ex.feb15}
   - "a fine marzo" → ${ex.mar31}
   - "a inizio aprile" → ${ex.apr01}

   Periodi/stagioni (usa il primo giorno):
   - "a giugno" → ${ex.june}
   - "quest'estate" → ${ex.summer}
   - "il prossimo autunno" → ${ex.fall}
   - "quest'inverno" → ${ex.winter}
   - "la primavera" → ${ex.spring}

   REGOLA CRITICA - eventDate:
   - Se una data è ESPLICITAMENTE menzionata (relativa o assoluta), DEVI restituire eventDate in YYYY-MM-DD
   - Esempi dove eventDate è OBBLIGATORIO:
     * "colloquio la settimana prossima" → eventDate = data calcolata
     * "si trasferisce tra 2 mesi" → eventDate = data calcolata
     * "matrimonio a giugno" → eventDate = "${ex.june}"
     * "esame il 15" → eventDate = "${currentDate.slice(0, 4)}-XX-15" (mese corrente o successivo)
   - eventDate = null se nessuna data menzionata O data troppo vaga ("un giorno", "presto", "forse")
   - IMPORTANTE: NON usare la data di oggi come predefinita. Se l'evento non ha un riferimento temporale esplicito, eventDate = null`,
      rule4Title: '4. RISOLUZIONE DI NOVITÀ ESISTENTI',
      rule4Content: `Se una novità esistente viene menzionata con un esito, segnala come risolta.

   REGOLA CRITICA:
   - Estrai TUTTI i dettagli concreti dalla trascrizione
   - Includi: risultati numerici, nomi, luoghi, date, aneddoti
   - Se nessun dettaglio → risoluzione = "Completato"

   Esempi:
   • "Ha avuto il suo colloquio da Google" → "Completato"
   • "È stata assunta da Google, inizia a marzo" → "È stata assunta, inizia a marzo"
   • "Ha trovato un appartamento nell'11°, 45m²" → "Trovato nell'11°, 45m²"`,
      rule5Title: '5. INFO DI CONTATTO',
      rule5Content: `- phone: numero se menzionato
   - email: indirizzo se menzionato
     IMPORTANTE: I motori di trascrizione vocale NON trascrivono MAI il simbolo "@".
     Viene sostituito da un punto o spazio (es: "mario.rossi.gmail.com" invece di "mario.rossi@gmail.com").
     Le parole "chiocciola", "arobase", "at" nella trascrizione significano "@".
     DEVI ricostruire l'indirizzo email corretto con "@" prima del nome di dominio.
   - birthday: { day, month, year } se compleanno menzionato (year può essere null)`,
    },
    hotTopicExhaustiveness: `ESAUSTIVITÀ DEGLI HOT TOPICS - CRITICO:
- Crea UN hot topic SEPARATO per ogni novità distinta. Non unire MAI due novità diverse
  in una sola, anche se collegate: "trasloco" e "visita dell'appartamento" sono due hot
  topics, non uno; lo stesso vale per "gravidanza" e "ricerca di una tata".
- Prima di rispondere, rileggi la trascrizione e conta le novità temporanee menzionate.
  Il tuo array hotTopics deve contenerne altrettante. Se ne hai meno, ne hai dimenticata una.
- Una novità già presente nelle ATTUALITÀ ESISTENTI conta anche: se la nota le aggiunge
  una data o un dettaglio nuovo senza risolverla, crea il hot topic corrispondente.
- La concisione NON è un obiettivo qui. Meglio un hot topic in più che uno mancante.`,
    multiDeadlineSituations: `UNA SITUAZIONE PUÒ AVERE PIÙ SCADENZE:
- Se una stessa situazione comporta più scadenze o pratiche distinte, crea UN hot topic PER
  SCADENZA, non uno solo per l'intera situazione.
- Esempio: "il proprietario vuole vendere, ho tre mesi per andarmene, e venerdì ho appuntamento
  in banca per un mutuo" = TRE hot topics (uscita dall'alloggio, ricerca di acquisto,
  appuntamento in banca), perché ciascuno ha la propria data e il proprio seguito.
- La prova: se due elementi meritano promemoria in momenti diversi, sono due hot topics.
- Questa regola DIVIDE una situazione realmente presente nella nota. Non autorizza mai a
  inventare una scadenza non menzionata, né a ricreare un'attualità già elencata nelle
  ATTUALITÀ ESISTENTI a cui la nota non aggiunge nulla di nuovo.`,
    absoluteRules: `REGOLE ASSOLUTE:
1. NON inventare MAI informazioni non presenti nella trascrizione
2. Usa date ASSOLUTE (YYYY-MM-DD), mai relative
3. Se non ci sono abbastanza informazioni, restituisci meno risultati
4. Crea un hot topic SOLO se è temporaneo/azionabile`,
    formatJson: buildFormatJson({
      header: `FORMATO JSON (i 7 campi sono OBBLIGATORI: restituisci meetingContext=null e loves=[] se non c'è nulla da inserire):`,
      hotTopicTitle: `Titolo breve (3-5 parole)`,
      hotTopicContext: `1-2 frasi di contesto con i dettagli importanti`,
      resolution: `Descrizione concreta di cosa è successo`,
      noteTitle: `Titolo SPECIFICO che cattura l'argomento principale (2-5 parole)`,
      meetingContext: `Dove/come l'utente ha conosciuto il contatto`,
      loveLabel: `Etichetta breve`,
    }),
    noteTitleRules: {
      header: 'REGOLE PER noteTitle - CRITICO:\nIl titolo deve permettere all\'utente di ritrovare facilmente la nota in seguito.',
      goodExamples: `BUON titolo (specifico, memorabile):
- "Colloquio Google superato" (evento chiave)
- "Gravidanza annunciata" (notizia importante)
- "Progetto startup IA" (argomento principale)
- "Ritorno viaggio Giappone" (contesto + luogo)
- "Promozione direttrice" (novità maggiore)
- "Rottura con Tommaso" (situazione importante)`,
      badExamples: `CATTIVO titolo (troppo generico, inutile):
- "Discussione" ❌
- "Caffè" ❌
- "Aggiornamento" ❌
- "Novità" ❌
- "Chiamata" ❌
- "Punto" ❌`,
      priority: `PRIORITÀ per scegliere il titolo:
1. La novità/evento MAGGIORE menzionato (promozione, matrimonio, trasloco, ecc.)
2. Il progetto/situazione IN CORSO discusso (ricerca lavoro, acquisto casa, ecc.)
3. Il contesto dell'incontro SE specifico (compleanno 30 anni, ritorno da viaggio, ecc.)`,
    },
    concreteExamples: (nextWeekDate, twoMonthsDate, ex) => `ESEMPI CONCRETI DI HOT TOPICS CON DATE:

Esempio 1 - "Maria ha un colloquio da Google la settimana prossima":
{
  "noteTitle": "Colloquio Google previsto",
  "hotTopics": [{
    "title": "Colloquio Google",
    "context": "Ha un colloquio di lavoro da Google.",
    "eventDate": "${nextWeekDate}"
  }]
}

Esempio 2 - "Ci siamo visti al bar, mi ha detto che si trasferisce a Milano tra 2 mesi per il suo nuovo lavoro":
{
  "noteTitle": "Trasloco Milano nuovo lavoro",
  "hotTopics": [{
    "title": "Trasloco Milano",
    "context": "Prepara il suo trasloco per stabilirsi a Milano per un nuovo lavoro.",
    "eventDate": "${twoMonthsDate}"
  }]
}

Esempio 3 - "Mi ha annunciato che è incinta, si sposa a giugno":
{
  "noteTitle": "Gravidanza e matrimonio annunciati",
  "hotTopics": [{
    "title": "Matrimonio",
    "context": "Prepara il suo matrimonio previsto per giugno.",
    "eventDate": "${ex.june}"
  }]
}

Esempio 4 - "Abbiamo preso un caffè, mi ha raccontato le sue vacanze":
{
  "noteTitle": "Ritorno dalle vacanze",
  "hotTopics": []
}`,
  },
  de: {
    intro: 'Du bist ein Assistent, der wichtige Neuigkeiten aus einer Sprachnotiz extrahiert.',
    dateReference: (currentDate) => `REFERENZDATUM: ${currentDate} (zur Berechnung erwähnter Daten)`,
    currentContactHeader: 'AKTUELL AUSGEWÄHLTER KONTAKT',
    existingTopicsHeader: 'BESTEHENDE NEUIGKEITEN DIESES KONTAKTS',
    languageResponse: 'Du MUSST nur auf Deutsch antworten.',
    task: `AUFGABE:
1. Extrahiere NEUE Neuigkeiten/Themen zum Nachverfolgen (Projekte, Ereignisse, laufende Situationen)
2. Erkenne, ob bestehende Neuigkeiten in dieser Notiz GELÖST sind
3. Erkenne Kontaktinformationen (Telefon, E-Mail, Geburtstag) falls erwähnt
4. Identifiziere den Vornamen der Person, über die gesprochen wird
5. Generiere einen SPEZIFISCHEN Titel für die Notiz (2-5 Wörter), der das Hauptthema erfasst`,
    rules: {
      rule0Title: '0. VERSTEHEN WER WER IST - KRITISCH',
      rule0Content: `Die Transkription ist eine Sprachnotiz, aufgenommen vom APP-BENUTZER.
   - "ich", "mir", "mich", "mein", "meine" = der BENUTZER, der die Notiz aufnimmt (NICHT der Kontakt)
   - Der KONTAKT ist die Person, ÜBER DIE gesprochen wird, nicht die sprechende Person

   Beispiele:
   - "Marie hat mir gesagt, dass sie eine Wohnung sucht" → Kontakt = Marie, "mir" = der Benutzer
   - "Er hat mich zu seiner Hochzeit eingeladen" → "mich" = der Benutzer, "seine Hochzeit" = Hot Topic des Kontakts
   - "Wir haben uns gestern getroffen, sie hat mir von ihrem Vorstellungsgespräch erzählt" → "mir" = der Benutzer, "ihr Vorstellungsgespräch" = Hot Topic des Kontakts

   DAHER: Informationen nach "hat mir gesagt", "hat mir erzählt", "hat mir von ... erzählt" betreffen den KONTAKT, nicht den Benutzer.`,
      rule1Title: '1. KONTAKTIDENTIFIKATION',
      rule1Content: `- Extrahiere den Vornamen der Person, ÜBER DIE gesprochen wird (das Thema der Notiz)
   - Der Vorname muss ein ECHTER Vorname sein (Marie, Hans, Sophie, usw.)
   - Nachname NUR wenn ausdrücklich erwähnt
   - Wenn kein klarer Vorname, verwende "Kontakt"`,
      rule2Title: '2. HOT TOPICS = etwas TEMPORÄRES, das man verfolgen/nachfragen möchte',
      rule2Content: `- Laufende Projekte: "Sucht eine Wohnung", "Bereitet eine Prüfung vor"
   - Zu verfolgende Ereignisse: "Hochzeit", "Vorstellungsgespräch"
   - Temporäre Situationen: "Problem bei der Arbeit", "Auf Jobsuche"

   KEIN Hot Topic:
   - Dauerhafte Eigenschaften: stabiler Job, regelmäßige Hobbys
   - Statische Infos: Wohnort, Ausbildung
   - Regelmäßige Aktivitäten: "macht Sport", "spielt Schach"`,
      rule3Title: '3. ABSOLUTE DATEN (ISO-Format: YYYY-MM-DD) - KRITISCH',
      rule3Content: (currentDate, ex) => `Heute ist ${currentDate}. Du MUSST eventDate für JEDE Datumserwähnung berechnen und zurückgeben.

   Zeitberechnungen (PFLICHT - berechne das genaue Datum):
   - "morgen" → ${currentDate} + 1 Tag
   - "in X Tagen" → ${currentDate} + X Tage
   - "nächste Woche" → ${currentDate} + 7 Tage
   - "in 2 Wochen" → ${currentDate} + 14 Tage
   - "nächsten Monat" → erster Tag des nächsten Monats
   - "in 3 Monaten" → ${currentDate} + 3 Monate

   Feste Daten:
   - "am 25. Januar" → ${ex.jan25}
   - "am 15.02." → ${ex.feb15}
   - "Mitte Februar" → ${ex.feb15}
   - "Ende März" → ${ex.mar31}
   - "Anfang April" → ${ex.apr01}

   Zeiträume/Jahreszeiten (verwende den ersten Tag):
   - "im Juni" → ${ex.june}
   - "diesen Sommer" → ${ex.summer}
   - "nächsten Herbst" → ${ex.fall}
   - "diesen Winter" → ${ex.winter}
   - "im Frühling" → ${ex.spring}

   KRITISCHE REGEL - eventDate:
   - Wenn ein Datum EXPLIZIT erwähnt wird (relativ oder absolut), MUSST du eventDate im Format YYYY-MM-DD zurückgeben
   - Beispiele wo eventDate PFLICHT ist:
     * "Vorstellungsgespräch nächste Woche" → eventDate = berechnetes Datum
     * "zieht in 2 Monaten um" → eventDate = berechnetes Datum
     * "Hochzeit im Juni" → eventDate = "${ex.june}"
     * "Prüfung am 15." → eventDate = "${currentDate.slice(0, 4)}-XX-15" (aktueller oder nächster Monat)
   - eventDate = null wenn kein Datum erwähnt ODER Datum zu vage ("irgendwann", "bald", "vielleicht")
   - WICHTIG: Verwende NICHT das heutige Datum als Standard. Wenn das Ereignis keine explizite Zeitangabe hat, eventDate = null`,
      rule4Title: '4. LÖSUNG BESTEHENDER NEUIGKEITEN',
      rule4Content: `Wenn eine bestehende Neuigkeit mit einem Ergebnis erwähnt wird, markiere sie als gelöst.

   KRITISCHE REGEL:
   - Extrahiere ALLE konkreten Details aus der Transkription
   - Inkludiere: numerische Ergebnisse, Namen, Orte, Daten, Anekdoten
   - Wenn keine Details → Lösung = "Erledigt"

   Beispiele:
   • "Sie hatte ihr Vorstellungsgespräch bei Google" → "Erledigt"
   • "Sie wurde bei Google eingestellt, fängt im März an" → "Sie wurde eingestellt, fängt im März an"
   • "Er hat eine Wohnung im 11. Bezirk gefunden, 45m²" → "Gefunden im 11. Bezirk, 45m²"`,
      rule5Title: '5. KONTAKTINFORMATIONEN',
      rule5Content: `- phone: Nummer falls erwähnt
   - email: Adresse falls erwähnt
     WICHTIG: Spracherkennungs-Engines transkribieren das "@"-Symbol NIE.
     Es wird durch einen Punkt oder Leerzeichen ersetzt (z.B. "max.mueller.gmail.com" statt "max.mueller@gmail.com").
     Die Wörter "at", "Klammeraffe", "arobase" in der Transkription bedeuten "@".
     Du MUSST die korrekte E-Mail-Adresse mit "@" vor dem Domainnamen rekonstruieren.
   - birthday: { day, month, year } falls Geburtstag erwähnt (year kann null sein)`,
    },
    hotTopicExhaustiveness: `VOLLSTÄNDIGKEIT DER HOT TOPICS - KRITISCH:
- Erstelle EINEN EIGENEN hot topic pro eigenständiger Neuigkeit. Führe NIEMALS zwei
  verschiedene Neuigkeiten zusammen, auch wenn sie zusammenhängen: "Umzug" und
  "Wohnungsbesichtigung" sind zwei hot topics, nicht einer; ebenso "Schwangerschaft"
  und "Suche nach einer Tagesmutter".
- Lies vor dem Antworten die Transkription erneut und zähle die genannten temporären
  Themen. Dein hotTopics-Array muss genauso viele enthalten. Sind es weniger, fehlt eines.
- Ein bereits in BESTEHENDE THEMEN gelistetes Thema zählt ebenfalls: Fügt die Notiz ihm
  ein neues Datum oder Detail hinzu, ohne es abzuschließen, erstelle den hot topic.
- Kürze ist hier KEIN Ziel. Ein hot topic zu viel ist besser als einer zu wenig.`,
    multiDeadlineSituations: `EINE SITUATION KANN MEHRERE FRISTEN HABEN:
- Umfasst eine einzelne Situation mehrere eigenständige Fristen oder Schritte, erstelle EINEN
  hot topic PRO FRIST, nicht einen für die gesamte Situation.
- Beispiel: "der Vermieter will verkaufen, ich habe drei Monate zum Ausziehen, und am Freitag
  habe ich einen Banktermin wegen eines Kredits" = DREI hot topics (Auszug, Kaufsuche,
  Banktermin), denn jeder hat sein eigenes Datum und seine eigene Nachverfolgung.
- Der Test: Verdienen zwei Punkte Erinnerungen zu unterschiedlichen Zeitpunkten, sind es zwei
  hot topics.
- Diese Regel TEILT eine tatsächlich in der Notiz vorhandene Situation auf. Sie erlaubt nie,
  eine nicht genannte Frist zu erfinden oder ein bereits unter BESTEHENDE THEMEN gelistetes
  Thema neu anzulegen, dem die Notiz nichts Neues hinzufügt.`,
    absoluteRules: `ABSOLUTE REGELN:
1. Erfinde NIEMALS Informationen, die nicht in der Transkription stehen
2. Verwende ABSOLUTE Daten (YYYY-MM-DD), niemals relative
3. Wenn nicht genug Informationen, gib weniger Ergebnisse zurück
4. Erstelle ein Hot Topic NUR wenn es temporär/handlungsfähig ist`,
    formatJson: buildFormatJson({
      header: `JSON-FORMAT (alle 7 Felder sind PFLICHT: gib meetingContext=null und loves=[] zurück, wenn nichts hineingehört):`,
      hotTopicTitle: `Kurzer Titel (3-5 Wörter)`,
      hotTopicContext: `1-2 Sätze Kontext mit wichtigen Details`,
      resolution: `Konkrete Beschreibung was passiert ist`,
      noteTitle: `SPEZIFISCHER Titel, der das Hauptthema erfasst (2-5 Wörter)`,
      meetingContext: `Wo/wie der Nutzer den Kontakt kennengelernt hat`,
      loveLabel: `Kurzes Label`,
    }),
    noteTitleRules: {
      header: 'REGELN FÜR noteTitle - KRITISCH:\nDer Titel soll dem Benutzer helfen, die Notiz später leicht zu finden.',
      goodExamples: `GUTER Titel (spezifisch, einprägsam):
- "Google Vorstellungsgespräch erfolgreich" (Schlüsselereignis)
- "Schwangerschaft verkündet" (wichtige Neuigkeit)
- "KI Startup Projekt" (Hauptthema)
- "Rückkehr Japan Reise" (Kontext + Ort)
- "Beförderung zur Direktorin" (große Neuigkeit)
- "Trennung von Thomas" (wichtige Situation)`,
      badExamples: `SCHLECHTER Titel (zu generisch, nutzlos):
- "Gespräch" ❌
- "Kaffee" ❌
- "Nachholen" ❌
- "Neuigkeiten" ❌
- "Anruf" ❌
- "Update" ❌`,
      priority: `PRIORITÄT bei der Titelwahl:
1. Die GROSSE Neuigkeit/das Ereignis erwähnt (Beförderung, Hochzeit, Umzug, usw.)
2. Das LAUFENDE Projekt/die Situation diskutiert (Jobsuche, Hauskauf, usw.)
3. Der Kontext des Treffens WENN spezifisch (30. Geburtstag, Rückkehr von Reise, usw.)`,
    },
    concreteExamples: (nextWeekDate, twoMonthsDate, ex) => `KONKRETE BEISPIELE FÜR HOT TOPICS MIT DATEN:

Beispiel 1 - "Marie hat nächste Woche ein Vorstellungsgespräch bei Google":
{
  "noteTitle": "Google Vorstellungsgespräch geplant",
  "hotTopics": [{
    "title": "Google Vorstellungsgespräch",
    "context": "Sie hat ein Vorstellungsgespräch bei Google.",
    "eventDate": "${nextWeekDate}"
  }]
}

Beispiel 2 - "Wir haben uns im Café getroffen, er hat mir gesagt, dass er in 2 Monaten nach Berlin zieht für seinen neuen Job":
{
  "noteTitle": "Umzug Berlin neuer Job",
  "hotTopics": [{
    "title": "Umzug nach Berlin",
    "context": "Er bereitet seinen Umzug nach Berlin für einen neuen Job vor.",
    "eventDate": "${twoMonthsDate}"
  }]
}

Beispiel 3 - "Sie hat mir erzählt, dass sie schwanger ist, sie heiratet im Juni":
{
  "noteTitle": "Schwangerschaft und Hochzeit verkündet",
  "hotTopics": [{
    "title": "Hochzeit",
    "context": "Sie bereitet ihre Hochzeit für Juni vor.",
    "eventDate": "${ex.june}"
  }]
}

Beispiel 4 - "Wir haben einen Kaffee getrunken, sie hat mir von ihrem Urlaub erzählt":
{
  "noteTitle": "Rückkehr aus dem Urlaub",
  "hotTopics": []
}`,
  },
};

const getMeetingContextInstruction = (language: string, currentDate: string): string => {
  switch (language) {
    case 'en':
      return `MEETING CONTEXT (meetingContext):
- If the note explicitly says where, how, or through whom the user met/knew the contact, return one short sentence in English.
- Include concrete context such as event, place, intermediary, company, school, or community.
- If this context includes a relative date like "last Thursday", "yesterday", or "two weeks ago", convert it from the reference date (${currentDate}) into an absolute date with day, month, and year. Never keep relative date wording in meetingContext.
- Do not confuse this with a recent catch-up or ordinary meeting. If it is only "we met yesterday" without first-meeting context, return null.
- Examples: "Met at Web Summit through Anna", "Met while working at Stripe", "Met at a dinner hosted by Ana in Lisbon on May 14, 2026".
- If absent, return null.`;
    case 'es':
      return `CONTEXTO DEL ENCUENTRO (meetingContext):
- Si la nota dice explícitamente dónde, cómo o a través de quién el usuario conoció al contacto, devuelve una frase corta en español.
- Incluye contexto concreto como evento, lugar, intermediario, empresa, escuela o comunidad.
- Si este contexto incluye una fecha relativa como "el jueves pasado", "ayer" o "hace dos semanas", conviértela desde la fecha de referencia (${currentDate}) en una fecha absoluta con día, mes y año. Nunca conserves fechas relativas en meetingContext.
- No lo confundas con una reunión reciente o un encuentro normal. Si solo dice "nos vimos ayer" sin contexto de primer encuentro, devuelve null.
- Ejemplos: "Conocido en Web Summit a través de Anna", "Conocido trabajando en Stripe", "Conocida en una cena organizada por Ana en Lisboa el 14 de mayo de 2026".
- Si no aparece, devuelve null.`;
    case 'it':
      return `CONTESTO DELL'INCONTRO (meetingContext):
- Se la nota dice esplicitamente dove, come o tramite chi l'utente ha conosciuto il contatto, restituisci una frase breve in italiano.
- Includi contesto concreto come evento, luogo, intermediario, azienda, scuola o community.
- Se questo contesto include una data relativa come "giovedì scorso", "ieri" o "due settimane fa", convertila dalla data di riferimento (${currentDate}) in una data assoluta con giorno, mese e anno. Non lasciare mai date relative in meetingContext.
- Non confonderlo con un incontro recente o un appuntamento normale. Se dice solo "ci siamo visti ieri" senza contesto del primo incontro, restituisci null.
- Esempi: "Conosciuto al Web Summit tramite Anna", "Conosciuto lavorando da Stripe", "Conosciuta a una cena organizzata da Ana a Lisbona il 14 maggio 2026".
- Se assente, restituisci null.`;
    case 'de':
      return `KONTEXT DES KENNENLERNENS (meetingContext):
- Wenn die Notiz ausdrücklich sagt, wo, wie oder über wen der Benutzer den Kontakt kennengelernt hat, gib einen kurzen Satz auf Deutsch zurück.
- Nenne konkreten Kontext wie Ereignis, Ort, Vermittler, Firma, Schule oder Community.
- Wenn dieser Kontext ein relatives Datum wie "letzten Donnerstag", "gestern" oder "vor zwei Wochen" enthält, rechne es vom Referenzdatum (${currentDate}) in ein absolutes Datum mit Tag, Monat und Jahr um. Behalte in meetingContext niemals relative Datumsangaben bei.
- Verwechsle das nicht mit einem kürzlichen Treffen oder normalen Wiedersehen. Wenn nur "wir haben uns gestern getroffen" ohne Erstkontakt-Kontext erwähnt wird, gib null zurück.
- Beispiele: "Beim Web Summit über Anna kennengelernt", "Bei der Arbeit bei Stripe kennengelernt", "Bei einem von Ana organisierten Abendessen in Lissabon am 14. Mai 2026 kennengelernt".
- Wenn nichts dazu erwähnt wird, gib null zurück.`;
    case 'fr':
    default:
      return `CONTEXTE DE RENCONTRE (meetingContext):
- Si la note dit explicitement où, comment ou via qui l'utilisateur a rencontré/connu le contact, retourne une phrase courte en français.
- Inclus un contexte concret comme événement, lieu, intermédiaire, entreprise, école ou communauté.
- Si ce contexte inclut une date relative comme "jeudi dernier", "hier" ou "il y a deux semaines", convertis-la depuis la date de référence (${currentDate}) en date absolue avec jour, mois et année. Ne garde jamais de formulation relative dans meetingContext.
- Ne confonds pas avec un échange récent ou un rendez-vous normal. Si la note dit seulement "on s'est vus hier" sans contexte de première rencontre, retourne null.
- Exemples: "Rencontré au Web Summit via Anna", "Rencontré en travaillant chez Stripe", "Rencontrée à un dîner organisé par Ana à Lisbonne le 14 mai 2026".
- Si absent, retourne null.`;
  }
};

const getLovesInstruction = (language: string): string => {
  switch (language) {
    case 'en':
      return `LOVES / PREFERENCES (loves):
- Extract only what the CONTACT explicitly likes, enjoys, appreciates, wants, or is interested in.
- Return short chip labels, 1-3 words each, not full sentences.
- Include durable tastes and desires: hobbies, food/drinks, places, culture, gifts, working styles, small preferences.
- Do NOT extract the app user's preferences. If ambiguous, leave it out.
- Examples: "Ceramics", "Quiet coffee", "Sci-fi", "Thai food".
- If absent, return an empty array.
- The JSON output must include "loves": string[].`;
    case 'es':
      return `GUSTOS / PREFERENCIAS (loves):
- Extrae solo lo que al CONTACTO le gusta, aprecia, desea o le interesa explícitamente.
- Devuelve etiquetas cortas para chips, 1-3 palabras cada una, no frases completas.
- Incluye gustos y deseos duraderos: aficiones, comida/bebida, lugares, cultura, ideas de regalo, formas de trabajar.
- NO extraigas las preferencias del usuario de la app. Si es ambiguo, omítelo.
- Ejemplos: "Cerámica", "Café tranquilo", "Ciencia ficción", "Comida tailandesa".
- Si no aparece, devuelve un array vacío.
- El JSON debe incluir "loves": string[].`;
    case 'it':
      return `GUSTI / PREFERENZE (loves):
- Estrai solo ciò che al CONTATTO piace, apprezza, desidera o interessa esplicitamente.
- Restituisci etichette brevi per chip, 1-3 parole ciascuna, non frasi complete.
- Includi gusti e desideri durevoli: hobby, cibo/bevande, luoghi, cultura, idee regalo, modi di lavorare.
- NON estrarre le preferenze dell'utente dell'app. Se è ambiguo, ometti.
- Esempi: "Ceramica", "Caffè tranquillo", "Fantascienza", "Cibo thailandese".
- Se assente, restituisci un array vuoto.
- Il JSON deve includere "loves": string[].`;
    case 'de':
      return `VORLIEBEN / WÜNSCHE (loves):
- Extrahiere nur, was der KONTAKT ausdrücklich mag, schätzt, möchte oder interessant findet.
- Gib kurze Chip-Labels zurück, jeweils 1-3 Wörter, keine ganzen Sätze.
- Dazu zählen dauerhafte Vorlieben und Wünsche: Hobbys, Essen/Getränke, Orte, Kultur, Geschenkideen, Arbeitsstile.
- Extrahiere NICHT die Vorlieben des App-Benutzers. Wenn es unklar ist, lass es weg.
- Beispiele: "Keramik", "Ruhiger Kaffee", "Sci-fi", "Thai-Essen".
- Wenn nichts vorkommt, gib ein leeres Array zurück.
- Das JSON muss "loves": string[] enthalten.`;
    case 'fr':
    default:
      return `GOÛTS / ENVIES (loves):
- Extrais uniquement ce que le CONTACT aime, apprécie, veut, désire ou trouve intéressant explicitement.
- Retourne des libellés courts pour chips, 1-3 mots chacun, pas des phrases complètes.
- Inclus les goûts et envies durables: hobbies, nourriture/boissons, lieux, culture, idées cadeaux, façons de travailler.
- N'extrais PAS les préférences de l'utilisateur de l'app. Si c'est ambigu, ignore.
- Exemples: "Céramique", "Café calme", "Science-fiction", "Cuisine thaï".
- Si absent, retourne un tableau vide.
- Le JSON doit inclure "loves": string[].`;
  }
};

const getLanguageComplianceReminder = (language: string): string => {
  switch (language) {
    case 'en':
      return `FINAL REMINDER - LANGUAGE:
You MUST respond in English only. ALL text fields (noteTitle, hotTopics title and context, loves, meetingContext, resolution) must be written in English, even if the transcription contains words in another language.`;
    case 'es':
      return `RECORDATORIO FINAL - IDIOMA:
DEBES responder solo en español. TODOS los campos de texto (noteTitle, title y context de los hotTopics, loves, meetingContext, resolution) deben estar redactados en español, incluso si la transcripción contiene palabras en otro idioma.`;
    case 'it':
      return `PROMEMORIA FINALE - LINGUA:
DEVI rispondere solo in italiano. TUTTI i campi di testo (noteTitle, title e context degli hotTopics, loves, meetingContext, resolution) devono essere scritti in italiano, anche se la trascrizione contiene parole in un'altra lingua.`;
    case 'de':
      return `LETZTE ERINNERUNG - SPRACHE:
Du MUSST nur auf Deutsch antworten. ALLE Textfelder (noteTitle, title und context der hotTopics, loves, meetingContext, resolution) müssen auf Deutsch verfasst sein, auch wenn die Transkription Wörter in einer anderen Sprache enthält.`;
    case 'fr':
    default:
      return `RAPPEL FINAL - LANGUE:
Tu DOIS répondre en français uniquement. TOUS les champs texte (noteTitle, title et context des hotTopics, loves, meetingContext, resolution) doivent être rédigés en français, même si la transcription contient des mots dans une autre langue.`;
  }
};

type Variables = {
  user: User;
};

export const extractRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

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
    const prompt = buildExtractionPrompt(transcription, currentContact, language, body.respondingToTopic);

    const providerConfig = {
      OPENAI_API_KEY: c.env.OPENAI_API_KEY,
      XAI_API_KEY: c.env.XAI_API_KEY,
      CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
      AI_PROVIDER: c.env.AI_PROVIDER,
      ENABLE_PERFORMANCE_LOGGING: c.env.ENABLE_PERFORMANCE_LOGGING,
    };

    const userId = c.get('user')?.id;
    const model = createTracedAIModel(providerConfig, {
      distinctId: userId,
      properties: {
        feature: 'extract',
        route: '/api/extract',
        language,
      },
    });
    const modelName = getAIModel(providerConfig);

    // Create Langfuse generation span
    const generation = trace?.generation({
      name: 'extract-generation',
      model: modelName,
      input: { transcription: transcription.slice(0, 500), hasCurrentContact: !!currentContact },
    });

    const { output: extractionResult } = await measurePerformance(
      () =>
        generateWithRetries(
          async () => {
            const extractionController = new AbortController();
            const extractionTimeout = setTimeout(
              () => extractionController.abort(),
              15000
            );
            try {
              return await generateText({
                model,
                output: Output.object({ schema: extractionSchema }),
                prompt,
                abortSignal: extractionController.signal,
                ...getStructuredOutputSettings(),
              });
            } finally {
              clearTimeout(extractionTimeout);
            }
          },
          { label: 'Extract' }
        ),
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

    const extraction = extractionResult!;

    // Server-side matching: find contacts with same first name
    const extractedFirstName = normalizeContactName(extraction.contactIdentified.firstName);
    const matchingContacts = existingContacts.filter(
      (contact) => normalizeContactName(contact.firstName) === extractedFirstName
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
      meetingContext: extraction.meetingContext?.trim() || undefined,
      loves: extraction.loves
        .map((love) => love.trim())
        .filter((love) => love.length > 0),
      hotTopics: extraction.hotTopics.map((topic) => {
        const safeEventDate = sanitizeEventDate(topic.eventDate, new Date());
        // Convert ISO date (YYYY-MM-DD) to DD/MM/YYYY for V1 compatibility (suggestedDate)
        let suggestedDate: string | undefined;
        if (safeEventDate) {
          const [year, month, day] = safeEventDate.split('-');
          suggestedDate = `${day}/${month}/${year}`;
        }
        return {
          title: topic.title,
          context: topic.context,
          eventDate: safeEventDate,
          suggestedDate, // V1 compatibility: DD/MM/YYYY format
        };
      }),
      resolvedTopics: extraction.resolvedTopics.map((topic) => ({
        existingTopicId: topic.existingTopicId,
        id: topic.existingTopicId, // Alias for frontend compatibility
        resolution: topic.resolution,
      })),
    };

    // Update Langfuse generation with output
    generation?.end({ output: formattedExtraction });
    trace?.update({ output: { success: true, extraction: formattedExtraction } });

    // Run evaluation in background (non-blocking)
    if (c.env.ENABLE_EVALUATION === 'true' && c.env.OPENAI_API_KEY && c.executionCtx) {
      c.executionCtx.waitUntil(
        evaluateExtraction(
          transcription,
          formattedExtraction,
          {
            OPENAI_API_KEY: c.env.OPENAI_API_KEY,
            enableEvaluation: c.env.ENABLE_EVALUATION === 'true',
            samplingRate: parseFloat(c.env.EVALUATION_SAMPLING_RATE || '0.25'),
            distinctId: userId,
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
    captureServerException(error, c.get('user')?.id, {
      feature: 'extract',
      route: '/api/extract',
      provider: c.env.AI_PROVIDER || 'cerebras',
      stage: 'generate-text',
    });
    return c.json({ error: 'Extraction failed' }, 500);
  }
});

/**
 * Normalizes email-like patterns in transcription text.
 * STT engines never transcribe the "@" symbol — it becomes a dot, space, or spoken word.
 * This function detects common email patterns and inserts "@" before known domains.
 */
const normalizeTranscriptionEmails = (text: string): string => {
  // Common email provider domains
  const emailDomains = [
    'gmail', 'yahoo', 'hotmail', 'outlook', 'protonmail', 'icloud',
    'live', 'msn', 'aol', 'mail', 'zoho', 'yandex', 'gmx',
    // French ISPs
    'orange', 'free', 'sfr', 'laposte', 'wanadoo', 'bbox',
    // Other common
    'pm', 'hey', 'fastmail', 'tutanota',
  ].join('|');

  // Common TLDs
  const tlds = 'com|fr|net|org|io|co|de|es|it|uk|eu|ch|be|ca|us|info|dev';

  // 1. Replace spoken "@" words: "arobase", "arrobase", "arroba", "chiocciola", "Klammeraffe"
  //    e.g. "clement.cerize arobase gmail.com" → "clement.cerize@gmail.com"
  text = text.replace(
    new RegExp(`(\\S+)\\s+(?:arobase|arrobase|arroba|chiocciola|klammeraffe)\\s+(\\S+)`, 'gi'),
    '$1@$2'
  );

  // 2. Replace dot before known email domain.tld with @
  //    e.g. "clement.cerize.gmail.com" → "clement.cerize@gmail.com"
  text = text.replace(
    new RegExp(`(\\S+)\\.((?:${emailDomains})\\.(?:${tlds}))\\b`, 'gi'),
    '$1@$2'
  );

  return text;
};

export const buildExtractionPrompt = (
  transcription: string,
  currentContact?: ExtractionRequest['currentContact'],
  language: string = 'fr',
  respondingToTopic?: ExtractionRequest['respondingToTopic']
): string => {
  const normalizedTranscription = normalizeTranscriptionEmails(transcription);
  const { wrapped: wrappedTranscription } = wrapUserInput(normalizedTranscription, 'TRANSCRIPTION');
  const template = PROMPT_TEMPLATES[language] || PROMPT_TEMPLATES.fr;

  let currentContactContext = '';
  let existingHotTopicsContext = '';

  if (currentContact) {
    currentContactContext = `
${template.currentContactHeader}:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}`;

    if (currentContact.hotTopics && currentContact.hotTopics.length > 0) {
      existingHotTopicsContext = `
${template.existingTopicsHeader}:
${currentContact.hotTopics.map((topic) => `  - [ID: ${topic.id}] "${topic.title}"${topic.context ? ` - ${topic.context}` : ''}`).join('\n')}`;
    }
  }

  const now = new Date();
  const currentDate = format(now, 'yyyy-MM-dd');
  const nextWeekDate = format(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const twoMonthsDate = format(new Date(new Date(now).setMonth(now.getMonth() + 2)), 'yyyy-MM-dd');
  const dateExamples = buildDateExamples(now, language);

  const respondingToTopicPreamble = respondingToTopic
    ? `\n\n${buildRespondingToTopicPreamble(respondingToTopic, language)}`
    : '';

  return `${template.intro}

${template.dateReference(currentDate)}

${buildCalendarContext(now, language)}${respondingToTopicPreamble}

${getSecurityInstructions(language)}
${currentContactContext}
${existingHotTopicsContext}

LANGUE DE RÉPONSE:
${template.languageResponse}

TRANSCRIPTION:
${wrappedTranscription}

${template.task}

RÈGLES:

${template.rules.rule0Title}:
${template.rules.rule0Content}

${template.rules.rule1Title}:
${template.rules.rule1Content}

${template.rules.rule2Title}:
${template.rules.rule2Content}

${template.rules.rule3Title}:
${template.rules.rule3Content(currentDate, dateExamples)}

${template.rules.rule4Title}:
${template.rules.rule4Content}

${template.rules.rule5Title}:
${template.rules.rule5Content}

${getMeetingContextInstruction(language, currentDate)}

${getLovesInstruction(language)}

${template.hotTopicExhaustiveness}

${template.multiDeadlineSituations}

${template.absoluteRules}

${template.formatJson}

${template.noteTitleRules.header}

${template.noteTitleRules.goodExamples}

${template.noteTitleRules.badExamples}

${template.noteTitleRules.priority}

${template.concreteExamples(nextWeekDate, twoMonthsDate, dateExamples)}

${getLanguageComplianceReminder(language)}`;
};
