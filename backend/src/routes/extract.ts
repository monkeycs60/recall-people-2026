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
    rule3Content: (currentDate: string) => string;
    rule4Title: string;
    rule4Content: string;
    rule5Title: string;
    rule5Content: string;
  };
  absoluteRules: string;
  formatJson: string;
  noteTitleRules: {
    header: string;
    goodExamples: string;
    badExamples: string;
    priority: string;
  };
  concreteExamples: (nextWeekDate: string, twoMonthsDate: string) => string;
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
      rule3Content: (currentDate) => `Aujourd'hui c'est ${currentDate}. Tu DOIS calculer et retourner eventDate pour TOUTE mention de date.

   Calculs temporels (OBLIGATOIRE - calcule la date exacte):
   - "demain" → ${currentDate} + 1 jour
   - "dans X jours" → ${currentDate} + X jours
   - "la semaine prochaine" → ${currentDate} + 7 jours
   - "dans 2 semaines" → ${currentDate} + 14 jours
   - "le mois prochain" → premier jour du mois suivant
   - "dans 3 mois" → ${currentDate} + 3 mois

   Dates fixes:
   - "le 25 janvier" → 2026-01-25
   - "le 15/02" → 2026-02-15
   - "mi-février" → 2026-02-15
   - "fin mars" → 2026-03-31
   - "début avril" → 2026-04-01

   Périodes/saisons (utilise le premier jour):
   - "en juin" → 2026-06-01
   - "cet été" → 2026-07-01
   - "l'automne prochain" → 2026-09-01
   - "cet hiver" → 2026-12-01
   - "le printemps" → 2026-03-01

   RÈGLE CRITIQUE - TOUJOURS RETOURNER eventDate:
   - Si une date quelconque est mentionnée (relative ou absolue), tu DOIS retourner eventDate en YYYY-MM-DD
   - Exemples où eventDate est OBLIGATOIRE:
     * "entretien la semaine prochaine" → eventDate = date calculée
     * "déménage dans 2 mois" → eventDate = date calculée
     * "mariage en juin" → eventDate = "2026-06-01"
     * "examen le 15" → eventDate = "2026-XX-15" (mois actuel ou suivant)
   - eventDate = null SEULEMENT si aucune date mentionnée OU date trop vague ("un jour", "bientôt", "peut-être")`,
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
   - birthday: { day, month, year } si anniversaire mentionné (year peut être null)`,
    },
    absoluteRules: `RÈGLES ABSOLUES:
1. N'invente JAMAIS d'information non présente dans la transcription
2. Utilise des dates ABSOLUES (YYYY-MM-DD), jamais relatives
3. Si pas assez d'informations, retourne moins de résultats
4. Ne crée un hot topic QUE si c'est temporaire/actionnable`,
    formatJson: `FORMAT JSON:
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
  "noteTitle": "Titre SPÉCIFIQUE capturant le sujet principal (2-5 mots)"
}`,
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
    concreteExamples: (nextWeekDate, twoMonthsDate) => `EXEMPLES CONCRETS DE HOT TOPICS AVEC DATES:

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
    "eventDate": "2026-06-01"
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
      rule3Content: (currentDate) => `Today is ${currentDate}. You MUST calculate and return eventDate for ANY date mention.

   Time calculations (MANDATORY - calculate the exact date):
   - "tomorrow" → ${currentDate} + 1 day
   - "in X days" → ${currentDate} + X days
   - "next week" → ${currentDate} + 7 days
   - "in 2 weeks" → ${currentDate} + 14 days
   - "next month" → first day of next month
   - "in 3 months" → ${currentDate} + 3 months

   Fixed dates:
   - "January 25th" → 2026-01-25
   - "02/15" → 2026-02-15
   - "mid-February" → 2026-02-15
   - "end of March" → 2026-03-31
   - "early April" → 2026-04-01

   Periods/seasons (use the first day):
   - "in June" → 2026-06-01
   - "this summer" → 2026-07-01
   - "next fall" → 2026-09-01
   - "this winter" → 2026-12-01
   - "spring" → 2026-03-01

   CRITICAL RULE - ALWAYS RETURN eventDate:
   - If any date is mentioned (relative or absolute), you MUST return eventDate in YYYY-MM-DD
   - Examples where eventDate is MANDATORY:
     * "interview next week" → eventDate = calculated date
     * "moving in 2 months" → eventDate = calculated date
     * "wedding in June" → eventDate = "2026-06-01"
     * "exam on the 15th" → eventDate = "2026-XX-15" (current or next month)
   - eventDate = null ONLY if no date mentioned OR date too vague ("someday", "soon", "maybe")`,
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
   - birthday: { day, month, year } if birthday mentioned (year can be null)`,
    },
    absoluteRules: `ABSOLUTE RULES:
1. NEVER invent information not present in the transcription
2. Use ABSOLUTE dates (YYYY-MM-DD), never relative
3. If not enough information, return fewer results
4. Only create a hot topic if it's temporary/actionable`,
    formatJson: `JSON FORMAT:
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
      "title": "Short title (3-5 words)",
      "context": "1-2 sentences of context with important details",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "Concrete description of what happened"
    }
  ],
  "noteTitle": "SPECIFIC title capturing the main topic (2-5 words)"
}`,
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
    concreteExamples: (nextWeekDate, twoMonthsDate) => `CONCRETE EXAMPLES OF HOT TOPICS WITH DATES:

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
    "eventDate": "2026-06-01"
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
      rule3Content: (currentDate) => `Hoy es ${currentDate}. DEBES calcular y devolver eventDate para CUALQUIER mención de fecha.

   Cálculos temporales (OBLIGATORIO - calcula la fecha exacta):
   - "mañana" → ${currentDate} + 1 día
   - "en X días" → ${currentDate} + X días
   - "la semana que viene" → ${currentDate} + 7 días
   - "en 2 semanas" → ${currentDate} + 14 días
   - "el mes que viene" → primer día del mes siguiente
   - "en 3 meses" → ${currentDate} + 3 meses

   Fechas fijas:
   - "el 25 de enero" → 2026-01-25
   - "el 15/02" → 2026-02-15
   - "a mediados de febrero" → 2026-02-15
   - "a finales de marzo" → 2026-03-31
   - "a principios de abril" → 2026-04-01

   Períodos/estaciones (usa el primer día):
   - "en junio" → 2026-06-01
   - "este verano" → 2026-07-01
   - "el próximo otoño" → 2026-09-01
   - "este invierno" → 2026-12-01
   - "la primavera" → 2026-03-01

   REGLA CRÍTICA - SIEMPRE DEVOLVER eventDate:
   - Si se menciona cualquier fecha (relativa o absoluta), DEBES devolver eventDate en YYYY-MM-DD
   - Ejemplos donde eventDate es OBLIGATORIO:
     * "entrevista la semana que viene" → eventDate = fecha calculada
     * "se muda en 2 meses" → eventDate = fecha calculada
     * "boda en junio" → eventDate = "2026-06-01"
     * "examen el 15" → eventDate = "2026-XX-15" (mes actual o siguiente)
   - eventDate = null SOLO si no se menciona fecha O fecha demasiado vaga ("algún día", "pronto", "quizás")`,
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
   - birthday: { day, month, year } si se menciona cumpleaños (year puede ser null)`,
    },
    absoluteRules: `REGLAS ABSOLUTAS:
1. NUNCA inventes información que no esté en la transcripción
2. Usa fechas ABSOLUTAS (YYYY-MM-DD), nunca relativas
3. Si no hay suficiente información, devuelve menos resultados
4. Solo crea un hot topic si es temporal/accionable`,
    formatJson: `FORMATO JSON:
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
      "title": "Título corto (3-5 palabras)",
      "context": "1-2 frases de contexto con los detalles importantes",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "Descripción concreta de lo que pasó"
    }
  ],
  "noteTitle": "Título ESPECÍFICO capturando el tema principal (2-5 palabras)"
}`,
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
    concreteExamples: (nextWeekDate, twoMonthsDate) => `EJEMPLOS CONCRETOS DE HOT TOPICS CON FECHAS:

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
    "eventDate": "2026-06-01"
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
      rule3Content: (currentDate) => `Oggi è ${currentDate}. DEVI calcolare e restituire eventDate per QUALSIASI menzione di data.

   Calcoli temporali (OBBLIGATORIO - calcola la data esatta):
   - "domani" → ${currentDate} + 1 giorno
   - "tra X giorni" → ${currentDate} + X giorni
   - "la settimana prossima" → ${currentDate} + 7 giorni
   - "tra 2 settimane" → ${currentDate} + 14 giorni
   - "il mese prossimo" → primo giorno del mese successivo
   - "tra 3 mesi" → ${currentDate} + 3 mesi

   Date fisse:
   - "il 25 gennaio" → 2026-01-25
   - "il 15/02" → 2026-02-15
   - "a metà febbraio" → 2026-02-15
   - "a fine marzo" → 2026-03-31
   - "a inizio aprile" → 2026-04-01

   Periodi/stagioni (usa il primo giorno):
   - "a giugno" → 2026-06-01
   - "quest'estate" → 2026-07-01
   - "il prossimo autunno" → 2026-09-01
   - "quest'inverno" → 2026-12-01
   - "la primavera" → 2026-03-01

   REGOLA CRITICA - RESTITUIRE SEMPRE eventDate:
   - Se viene menzionata qualsiasi data (relativa o assoluta), DEVI restituire eventDate in YYYY-MM-DD
   - Esempi dove eventDate è OBBLIGATORIO:
     * "colloquio la settimana prossima" → eventDate = data calcolata
     * "si trasferisce tra 2 mesi" → eventDate = data calcolata
     * "matrimonio a giugno" → eventDate = "2026-06-01"
     * "esame il 15" → eventDate = "2026-XX-15" (mese corrente o successivo)
   - eventDate = null SOLO se nessuna data menzionata O data troppo vaga ("un giorno", "presto", "forse")`,
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
   - birthday: { day, month, year } se compleanno menzionato (year può essere null)`,
    },
    absoluteRules: `REGOLE ASSOLUTE:
1. NON inventare MAI informazioni non presenti nella trascrizione
2. Usa date ASSOLUTE (YYYY-MM-DD), mai relative
3. Se non ci sono abbastanza informazioni, restituisci meno risultati
4. Crea un hot topic SOLO se è temporaneo/azionabile`,
    formatJson: `FORMATO JSON:
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
      "title": "Titolo breve (3-5 parole)",
      "context": "1-2 frasi di contesto con i dettagli importanti",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "Descrizione concreta di cosa è successo"
    }
  ],
  "noteTitle": "Titolo SPECIFICO che cattura l'argomento principale (2-5 parole)"
}`,
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
    concreteExamples: (nextWeekDate, twoMonthsDate) => `ESEMPI CONCRETI DI HOT TOPICS CON DATE:

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
    "eventDate": "2026-06-01"
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
      rule3Content: (currentDate) => `Heute ist ${currentDate}. Du MUSST eventDate für JEDE Datumserwähnung berechnen und zurückgeben.

   Zeitberechnungen (PFLICHT - berechne das genaue Datum):
   - "morgen" → ${currentDate} + 1 Tag
   - "in X Tagen" → ${currentDate} + X Tage
   - "nächste Woche" → ${currentDate} + 7 Tage
   - "in 2 Wochen" → ${currentDate} + 14 Tage
   - "nächsten Monat" → erster Tag des nächsten Monats
   - "in 3 Monaten" → ${currentDate} + 3 Monate

   Feste Daten:
   - "am 25. Januar" → 2026-01-25
   - "am 15.02." → 2026-02-15
   - "Mitte Februar" → 2026-02-15
   - "Ende März" → 2026-03-31
   - "Anfang April" → 2026-04-01

   Zeiträume/Jahreszeiten (verwende den ersten Tag):
   - "im Juni" → 2026-06-01
   - "diesen Sommer" → 2026-07-01
   - "nächsten Herbst" → 2026-09-01
   - "diesen Winter" → 2026-12-01
   - "im Frühling" → 2026-03-01

   KRITISCHE REGEL - IMMER eventDate ZURÜCKGEBEN:
   - Wenn irgendein Datum erwähnt wird (relativ oder absolut), MUSST du eventDate im Format YYYY-MM-DD zurückgeben
   - Beispiele wo eventDate PFLICHT ist:
     * "Vorstellungsgespräch nächste Woche" → eventDate = berechnetes Datum
     * "zieht in 2 Monaten um" → eventDate = berechnetes Datum
     * "Hochzeit im Juni" → eventDate = "2026-06-01"
     * "Prüfung am 15." → eventDate = "2026-XX-15" (aktueller oder nächster Monat)
   - eventDate = null NUR wenn kein Datum erwähnt ODER Datum zu vage ("irgendwann", "bald", "vielleicht")`,
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
   - birthday: { day, month, year } falls Geburtstag erwähnt (year kann null sein)`,
    },
    absoluteRules: `ABSOLUTE REGELN:
1. Erfinde NIEMALS Informationen, die nicht in der Transkription stehen
2. Verwende ABSOLUTE Daten (YYYY-MM-DD), niemals relative
3. Wenn nicht genug Informationen, gib weniger Ergebnisse zurück
4. Erstelle ein Hot Topic NUR wenn es temporär/handlungsfähig ist`,
    formatJson: `JSON-FORMAT:
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
      "title": "Kurzer Titel (3-5 Wörter)",
      "context": "1-2 Sätze Kontext mit wichtigen Details",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "Konkrete Beschreibung was passiert ist"
    }
  ],
  "noteTitle": "SPEZIFISCHER Titel, der das Hauptthema erfasst (2-5 Wörter)"
}`,
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
    concreteExamples: (nextWeekDate, twoMonthsDate) => `KONKRETE BEISPIELE FÜR HOT TOPICS MIT DATEN:

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
    "eventDate": "2026-06-01"
  }]
}

Beispiel 4 - "Wir haben einen Kaffee getrunken, sie hat mir von ihrem Urlaub erzählt":
{
  "noteTitle": "Rückkehr aus dem Urlaub",
  "hotTopics": []
}`,
  },
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
        id: topic.existingTopicId, // Alias for frontend compatibility
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

  const currentDate = format(new Date(), 'yyyy-MM-dd');
  const nextWeekDate = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  const twoMonthsDate = format(new Date(new Date().setMonth(new Date().getMonth() + 2)), 'yyyy-MM-dd');

  return `${template.intro}

${template.dateReference(currentDate)}

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
${template.rules.rule3Content(currentDate)}

${template.rules.rule4Title}:
${template.rules.rule4Content}

${template.rules.rule5Title}:
${template.rules.rule5Content}

${template.absoluteRules}

${template.formatJson}

${template.noteTitleRules.header}

${template.noteTitleRules.goodExamples}

${template.noteTitleRules.badExamples}

${template.noteTitleRules.priority}

${template.concreteExamples(nextWeekDate, twoMonthsDate)}`;
};
