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

const PROMPT_TEMPLATES: Record<string, {
  intro: string;
  existingContacts: string;
  noSummary: string;
  noTopics: string;
  rules: string;
  examples: string;
}> = {
  fr: {
    intro: 'Tu es un assistant qui identifie le contact principal d\'une note vocale.',
    existingContacts: 'CONTACTS EXISTANTS',
    noSummary: 'Aucun résumé',
    noTopics: 'Aucun',
    rules: `RÈGLES D'IDENTIFICATION:

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
   - Formule en anglais pour le prompt de génération d'image`,
    examples: `Exemple pour un contact existant identifié:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": "warm and cheerful", "interest": "yoga", "context": "colleague at marketing team"}}

Exemple pour un nouveau contact sans nom de famille:
{"contactId": null, "firstName": "Paul", "lastName": null, "gender": "male", "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": [], "avatarHints": {"physical": "short brown hair, beard, early 30s", "personality": "energetic", "interest": "tech and startups", "context": "software engineer"}}

Exemple avec ambiguïté:
{"contactId": null, "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"], "avatarHints": {"physical": null, "personality": null, "interest": "running", "context": null}}

Exemple avec pronom et indice dans les sujets:
Transcription: "Elle m'a raconté son date avec François"
Contact Inès avec sujet "Date François"
→ {"contactId": "ines-id", "firstName": "Inès", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": null, "interest": null, "context": null}}`,
  },
  en: {
    intro: 'You are an assistant that identifies the main contact from a voice note.',
    existingContacts: 'EXISTING CONTACTS',
    noSummary: 'No summary',
    noTopics: 'None',
    rules: `IDENTIFICATION RULES:

1. MAIN PROTAGONIST:
   - Identify THE person who is mainly talked about in the note
   - Ignore secondary mentions (e.g., "Marie told me about her brother Paul" → protagonist = Marie)
   - The first name must be a REAL first name (not "contact", "friend", "colleague", "someone")
   - PAY ATTENTION to pronouns "she/he/him/her": find WHO this person is by using the contacts' current topics
     E.g., "She told me about her date with François" + contact Inès has topic "Date François" → protagonist = Inès

2. USING CURRENT TOPICS:
   - Current topics contain valuable clues about contacts
   - If a name mentioned in the transcription appears in a contact's topic, that contact is probably the protagonist
   - E.g., transcription mentions "François" + Inès has topic "Date François" → the protagonist is Inès (not François)

3. IF AN EXISTING CONTACT MATCHES:
   - The protagonist's first name MUST match EXACTLY a first name in the list (firstName)
   - Compare with the summary and current topics to confirm identity
   - If 2+ contacts have the same first name: use context to choose the right one
   - If context doesn't allow a decision: return all candidate IDs in candidateIds
   - contactId = ONLY an ID from the list above (never invented)
   - isNew = false

4. IF AMBIGUITY (multiple possible contacts):
   - contactId = null
   - candidateIds = list of candidate contact IDs (ONLY IDs from the list above)
   - confidence = "medium" or "low"
   - isNew = false

5. IF NEW CONTACT:
   - VERIFY that the protagonist's first name DOES NOT EXIST in the contacts list
   - If the first name is in NO firstName of the list → isNew = true
   - contactId = null
   - candidateIds = [] (empty)
   - If last name is mentioned: lastName = the name
   - Otherwise: generate a smart suggestedNickname based on main info
     Examples: "Paul Google" (company), "Marie running" (hobby), "Sophie HR" (job)

6. NICKNAME GENERATION:
   - Combine the first name with the most distinctive info
   - Prioritize: company > job > hobby/sport > location
   - Short format: "FirstName Info" (2-3 words max)
   - Only generate a nickname IF lastName is null AND isNew is true

CRITICAL RULE: NEVER invent a contactId. If the first name doesn't exist in the list → isNew = true and contactId = null.

IMPORTANT: Respond ONLY with a valid JSON object, without any text before or after.

7. GENDER DETECTION:
   - Deduce gender from the first name (male/female/unknown)
   - Use your knowledge of French and international first names
   - In case of doubt or epicene first name (e.g., Camille, Dominique, Claude) → "unknown"
   - Gender helps personalize the contact's avatar

8. AVATAR HINTS (avatarHints):
   Extract ONLY information EXPLICITLY mentioned in the transcription:
   - physical: physical description (hair, eyes, body type, estimated age, distinctive features)
     E.g., "short brown hair", "beard", "in their thirties", "tall and slim"
   - personality: DOMINANT personality trait that emerges from the transcription
     E.g., "warm", "dynamic", "calm", "funny", "serious", "shy"
   - interest: main hobby or passion mentioned
     E.g., "tennis", "cooking", "video games", "hiking", "music"
   - context: professional or social context
     E.g., "developer colleague", "sports coach", "neighbor", "childhood friend"

   IMPORTANT RULES:
   - If nothing is mentioned for a field → null (do NOT invent)
   - Prioritize the most striking/distinctive info
   - Formulate in English for the image generation prompt`,
    examples: `Example for an identified existing contact:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": "warm and cheerful", "interest": "yoga", "context": "colleague at marketing team"}}

Example for a new contact without last name:
{"contactId": null, "firstName": "Paul", "lastName": null, "gender": "male", "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": [], "avatarHints": {"physical": "short brown hair, beard, early 30s", "personality": "energetic", "interest": "tech and startups", "context": "software engineer"}}

Example with ambiguity:
{"contactId": null, "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"], "avatarHints": {"physical": null, "personality": null, "interest": "running", "context": null}}

Example with pronoun and clue in topics:
Transcription: "She told me about her date with François"
Contact Inès with topic "Date François"
→ {"contactId": "ines-id", "firstName": "Inès", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": null, "interest": null, "context": null}}`,
  },
  es: {
    intro: 'Eres un asistente que identifica el contacto principal de una nota de voz.',
    existingContacts: 'CONTACTOS EXISTENTES',
    noSummary: 'Sin resumen',
    noTopics: 'Ninguno',
    rules: `REGLAS DE IDENTIFICACIÓN:

1. PROTAGONISTA PRINCIPAL:
   - Identifica A LA persona de la que se habla principalmente en la nota
   - Ignora las menciones secundarias (ej: "Marie me habló de su hermano Paul" → protagonista = Marie)
   - El nombre debe ser un nombre REAL (no "contacto", "amigo", "colega", "alguien")
   - ATENCIÓN a los pronombres "ella/él": busca QUIÉN es esta persona usando los temas actuales de los contactos
     Ej: "Ella me contó sobre su cita con François" + contacto Inès tiene tema "Cita François" → protagonista = Inès

2. USO DE TEMAS ACTUALES:
   - Los temas actuales contienen pistas valiosas sobre los contactos
   - Si un nombre mencionado en la transcripción aparece en un tema de un contacto, ese contacto probablemente es el protagonista
   - Ej: transcripción habla de "François" + Inès tiene tema "Cita François" → el protagonista es Inès (no François)

3. SI UN CONTACTO EXISTENTE CORRESPONDE:
   - El nombre del protagonista DEBE corresponder EXACTAMENTE a un nombre en la lista (firstName)
   - Compara con el resumen y los temas actuales para confirmar la identidad
   - Si 2+ contactos tienen el mismo nombre: usa el contexto para elegir el correcto
   - Si el contexto no permite decidir: devuelve todos los IDs candidatos en candidateIds
   - contactId = ÚNICAMENTE un ID de la lista de arriba (nunca inventado)
   - isNew = false

4. SI HAY AMBIGÜEDAD (varios contactos posibles):
   - contactId = null
   - candidateIds = lista de IDs de contactos candidatos (ÚNICAMENTE IDs de la lista de arriba)
   - confidence = "medium" o "low"
   - isNew = false

5. SI ES UN CONTACTO NUEVO:
   - VERIFICA que el nombre del protagonista NO EXISTE en la lista de contactos
   - Si el nombre no está en NINGÚN firstName de la lista → isNew = true
   - contactId = null
   - candidateIds = [] (vacío)
   - Si se menciona el apellido: lastName = el apellido
   - Si no: genera un suggestedNickname inteligente basado en la info principal
     Ejemplos: "Paul Google" (empresa), "Marie running" (hobby), "Sophie RRHH" (trabajo)

6. GENERACIÓN DEL NICKNAME:
   - Combina el nombre con la info más distintiva
   - Prioriza: empresa > trabajo > hobby/deporte > lugar
   - Formato corto: "Nombre Info" (2-3 palabras máx)
   - Solo genera un nickname SI lastName es null Y isNew es true

REGLA CRÍTICA: NUNCA inventar un contactId. Si el nombre no existe en la lista → isNew = true y contactId = null.

IMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido, sin ningún texto antes o después.

7. DETECCIÓN DE GÉNERO:
   - Deduce el género a partir del nombre (male/female/unknown)
   - Usa tu conocimiento de nombres franceses e internacionales
   - En caso de duda o nombre epiceno (ej: Camille, Dominique, Claude) → "unknown"
   - El género ayuda a personalizar el avatar del contacto

8. INDICIOS PARA EL AVATAR (avatarHints):
   Extrae ÚNICAMENTE la información EXPLÍCITAMENTE mencionada en la transcripción:
   - physical: descripción física (cabello, ojos, complexión, edad estimada, rasgos distintivos)
     Ej: "cabello castaño corto", "barba", "treintañero", "alto y delgado"
   - personality: rasgo de personalidad DOMINANTE que surge de la transcripción
     Ej: "cálido", "dinámico", "tranquilo", "gracioso", "serio", "tímido"
   - interest: hobby o pasión principal mencionada
     Ej: "tenis", "cocina", "videojuegos", "senderismo", "música"
   - context: contexto profesional o social
     Ej: "colega desarrollador", "entrenador deportivo", "vecino", "amigo de la infancia"

   REGLAS IMPORTANTES:
   - Si no se menciona nada para un campo → null (NO inventar)
   - Prioriza las infos más llamativas/distintivas
   - Formula en inglés para el prompt de generación de imagen`,
    examples: `Ejemplo para un contacto existente identificado:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": "warm and cheerful", "interest": "yoga", "context": "colleague at marketing team"}}

Ejemplo para un nuevo contacto sin apellido:
{"contactId": null, "firstName": "Paul", "lastName": null, "gender": "male", "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": [], "avatarHints": {"physical": "short brown hair, beard, early 30s", "personality": "energetic", "interest": "tech and startups", "context": "software engineer"}}

Ejemplo con ambigüedad:
{"contactId": null, "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"], "avatarHints": {"physical": null, "personality": null, "interest": "running", "context": null}}

Ejemplo con pronombre e indicio en los temas:
Transcripción: "Ella me contó sobre su cita con François"
Contacto Inès con tema "Cita François"
→ {"contactId": "ines-id", "firstName": "Inès", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": null, "interest": null, "context": null}}`,
  },
  it: {
    intro: 'Sei un assistente che identifica il contatto principale da una nota vocale.',
    existingContacts: 'CONTATTI ESISTENTI',
    noSummary: 'Nessun riassunto',
    noTopics: 'Nessuno',
    rules: `REGOLE DI IDENTIFICAZIONE:

1. PROTAGONISTA PRINCIPALE:
   - Identifica LA persona di cui si parla principalmente nella nota
   - Ignora le menzioni secondarie (es: "Marie mi ha parlato di suo fratello Paul" → protagonista = Marie)
   - Il nome deve essere un nome VERO (non "contatto", "amico", "collega", "qualcuno")
   - ATTENZIONE ai pronomi "lei/lui": cerca CHI è questa persona usando gli argomenti attuali dei contatti
     Es: "Lei mi ha raccontato del suo appuntamento con François" + contatto Inès ha argomento "Appuntamento François" → protagonista = Inès

2. UTILIZZO DEGLI ARGOMENTI ATTUALI:
   - Gli argomenti attuali contengono indizi preziosi sui contatti
   - Se un nome menzionato nella trascrizione appare in un argomento di un contatto, quel contatto è probabilmente il protagonista
   - Es: trascrizione parla di "François" + Inès ha argomento "Appuntamento François" → il protagonista è Inès (non François)

3. SE UN CONTATTO ESISTENTE CORRISPONDE:
   - Il nome del protagonista DEVE corrispondere ESATTAMENTE a un nome nella lista (firstName)
   - Confronta con il riassunto e gli argomenti attuali per confermare l'identità
   - Se 2+ contatti hanno lo stesso nome: usa il contesto per scegliere quello giusto
   - Se il contesto non permette di decidere: restituisci tutti gli ID candidati in candidateIds
   - contactId = SOLO un ID dalla lista sopra (mai inventato)
   - isNew = false

4. SE C'È AMBIGUITÀ (più contatti possibili):
   - contactId = null
   - candidateIds = lista degli ID dei contatti candidati (SOLO ID dalla lista sopra)
   - confidence = "medium" o "low"
   - isNew = false

5. SE È UN NUOVO CONTATTO:
   - VERIFICA che il nome del protagonista NON ESISTA nella lista dei contatti
   - Se il nome non è in NESSUN firstName della lista → isNew = true
   - contactId = null
   - candidateIds = [] (vuoto)
   - Se il cognome è menzionato: lastName = il cognome
   - Altrimenti: genera un suggestedNickname intelligente basato sull'info principale
     Esempi: "Paul Google" (azienda), "Marie running" (hobby), "Sophie HR" (lavoro)

6. GENERAZIONE DEL NICKNAME:
   - Combina il nome con l'info più distintiva
   - Priorità: azienda > lavoro > hobby/sport > luogo
   - Formato breve: "Nome Info" (2-3 parole max)
   - Genera un nickname SOLO SE lastName è null E isNew è true

REGOLA CRITICA: NON inventare MAI un contactId. Se il nome non esiste nella lista → isNew = true e contactId = null.

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza alcun testo prima o dopo.

7. RILEVAMENTO DEL GENERE:
   - Deduci il genere dal nome (male/female/unknown)
   - Usa la tua conoscenza dei nomi francesi e internazionali
   - In caso di dubbio o nome epiceno (es: Camille, Dominique, Claude) → "unknown"
   - Il genere aiuta a personalizzare l'avatar del contatto

8. INDIZI PER L'AVATAR (avatarHints):
   Estrai SOLO le informazioni ESPLICITAMENTE menzionate nella trascrizione:
   - physical: descrizione fisica (capelli, occhi, corporatura, età stimata, tratti distintivi)
     Es: "capelli castani corti", "barba", "trentenne", "alto e magro"
   - personality: tratto di personalità DOMINANTE che emerge dalla trascrizione
     Es: "caloroso", "dinamico", "calmo", "divertente", "serio", "timido"
   - interest: hobby o passione principale menzionata
     Es: "tennis", "cucina", "videogiochi", "escursionismo", "musica"
   - context: contesto professionale o sociale
     Es: "collega sviluppatore", "allenatore sportivo", "vicino", "amico d'infanzia"

   REGOLE IMPORTANTI:
   - Se nulla è menzionato per un campo → null (NON inventare)
   - Privilegia le info più significative/distintive
   - Formula in inglese per il prompt di generazione immagine`,
    examples: `Esempio per un contatto esistente identificato:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": "warm and cheerful", "interest": "yoga", "context": "colleague at marketing team"}}

Esempio per un nuovo contatto senza cognome:
{"contactId": null, "firstName": "Paul", "lastName": null, "gender": "male", "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": [], "avatarHints": {"physical": "short brown hair, beard, early 30s", "personality": "energetic", "interest": "tech and startups", "context": "software engineer"}}

Esempio con ambiguità:
{"contactId": null, "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"], "avatarHints": {"physical": null, "personality": null, "interest": "running", "context": null}}

Esempio con pronome e indizio negli argomenti:
Trascrizione: "Lei mi ha raccontato del suo appuntamento con François"
Contatto Inès con argomento "Appuntamento François"
→ {"contactId": "ines-id", "firstName": "Inès", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": null, "interest": null, "context": null}}`,
  },
  de: {
    intro: 'Du bist ein Assistent, der den Hauptkontakt aus einer Sprachnotiz identifiziert.',
    existingContacts: 'BESTEHENDE KONTAKTE',
    noSummary: 'Keine Zusammenfassung',
    noTopics: 'Keine',
    rules: `IDENTIFIKATIONSREGELN:

1. HAUPTPROTAGONIST:
   - Identifiziere DIE Person, über die hauptsächlich in der Notiz gesprochen wird
   - Ignoriere sekundäre Erwähnungen (z.B.: "Marie hat mir von ihrem Bruder Paul erzählt" → Protagonist = Marie)
   - Der Vorname muss ein ECHTER Vorname sein (nicht "Kontakt", "Freund", "Kollege", "jemand")
   - ACHTE auf Pronomen "sie/er/ihm/ihr": finde heraus, WER diese Person ist, indem du die aktuellen Themen der Kontakte verwendest
     Z.B.: "Sie hat mir von ihrem Date mit François erzählt" + Kontakt Inès hat Thema "Date François" → Protagonist = Inès

2. VERWENDUNG AKTUELLER THEMEN:
   - Aktuelle Themen enthalten wertvolle Hinweise zu den Kontakten
   - Wenn ein in der Transkription erwähnter Name in einem Thema eines Kontakts erscheint, ist dieser Kontakt wahrscheinlich der Protagonist
   - Z.B.: Transkription spricht von "François" + Inès hat Thema "Date François" → der Protagonist ist Inès (nicht François)

3. WENN EIN BESTEHENDER KONTAKT ÜBEREINSTIMMT:
   - Der Vorname des Protagonisten MUSS GENAU mit einem Vornamen in der Liste übereinstimmen (firstName)
   - Vergleiche mit der Zusammenfassung und den aktuellen Themen, um die Identität zu bestätigen
   - Wenn 2+ Kontakte denselben Vornamen haben: verwende den Kontext, um den richtigen auszuwählen
   - Wenn der Kontext keine Entscheidung ermöglicht: gib alle Kandidaten-IDs in candidateIds zurück
   - contactId = NUR eine ID aus der obigen Liste (niemals erfunden)
   - isNew = false

4. BEI MEHRDEUTIGKEIT (mehrere mögliche Kontakte):
   - contactId = null
   - candidateIds = Liste der Kandidaten-Kontakt-IDs (NUR IDs aus der obigen Liste)
   - confidence = "medium" oder "low"
   - isNew = false

5. WENN NEUER KONTAKT:
   - ÜBERPRÜFE, dass der Vorname des Protagonisten NICHT in der Kontaktliste existiert
   - Wenn der Vorname in KEINEM firstName der Liste ist → isNew = true
   - contactId = null
   - candidateIds = [] (leer)
   - Wenn der Nachname erwähnt wird: lastName = der Name
   - Sonst: generiere einen intelligenten suggestedNickname basierend auf der Hauptinfo
     Beispiele: "Paul Google" (Firma), "Marie running" (Hobby), "Sophie HR" (Job)

6. NICKNAME-GENERIERUNG:
   - Kombiniere den Vornamen mit der markantesten Info
   - Priorität: Firma > Job > Hobby/Sport > Ort
   - Kurzes Format: "Vorname Info" (max. 2-3 Wörter)
   - Generiere einen Nickname NUR WENN lastName null ist UND isNew true ist

KRITISCHE REGEL: NIEMALS eine contactId erfinden. Wenn der Vorname nicht in der Liste existiert → isNew = true und contactId = null.

WICHTIG: Antworte NUR mit einem gültigen JSON-Objekt, ohne Text davor oder danach.

7. GESCHLECHTSERKENNUNG:
   - Leite das Geschlecht vom Vornamen ab (male/female/unknown)
   - Nutze dein Wissen über französische und internationale Vornamen
   - Bei Zweifel oder geschlechtsneutralem Vornamen (z.B.: Camille, Dominique, Claude) → "unknown"
   - Das Geschlecht hilft bei der Personalisierung des Kontakt-Avatars

8. AVATAR-HINWEISE (avatarHints):
   Extrahiere NUR Informationen, die EXPLIZIT in der Transkription erwähnt werden:
   - physical: physische Beschreibung (Haare, Augen, Körperbau, geschätztes Alter, markante Merkmale)
     Z.B.: "kurze braune Haare", "Bart", "Anfang dreißig", "groß und schlank"
   - personality: DOMINANTER Persönlichkeitszug, der aus der Transkription hervorgeht
     Z.B.: "warmherzig", "dynamisch", "ruhig", "lustig", "ernst", "schüchtern"
   - interest: hauptsächlich erwähntes Hobby oder Leidenschaft
     Z.B.: "Tennis", "Kochen", "Videospiele", "Wandern", "Musik"
   - context: beruflicher oder sozialer Kontext
     Z.B.: "Entwicklerkollege", "Sporttrainer", "Nachbar", "Kindheitsfreund"

   WICHTIGE REGELN:
   - Wenn für ein Feld nichts erwähnt wird → null (NICHT erfinden)
   - Bevorzuge die auffälligsten/markantesten Infos
   - Formuliere auf Englisch für den Bildgenerierungs-Prompt`,
    examples: `Beispiel für einen identifizierten bestehenden Kontakt:
{"contactId": "abc123", "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": "warm and cheerful", "interest": "yoga", "context": "colleague at marketing team"}}

Beispiel für einen neuen Kontakt ohne Nachnamen:
{"contactId": null, "firstName": "Paul", "lastName": null, "gender": "male", "suggestedNickname": "Paul Google", "confidence": "high", "isNew": true, "candidateIds": [], "avatarHints": {"physical": "short brown hair, beard, early 30s", "personality": "energetic", "interest": "tech and startups", "context": "software engineer"}}

Beispiel mit Mehrdeutigkeit:
{"contactId": null, "firstName": "Marie", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "medium", "isNew": false, "candidateIds": ["id1", "id2"], "avatarHints": {"physical": null, "personality": null, "interest": "running", "context": null}}

Beispiel mit Pronomen und Hinweis in den Themen:
Transkription: "Sie hat mir von ihrem Date mit François erzählt"
Kontakt Inès mit Thema "Date François"
→ {"contactId": "ines-id", "firstName": "Inès", "lastName": null, "gender": "female", "suggestedNickname": null, "confidence": "high", "isNew": false, "candidateIds": [], "avatarHints": {"physical": null, "personality": null, "interest": null, "context": null}}`,
  },
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
  const template = PROMPT_TEMPLATES[language] || PROMPT_TEMPLATES.fr;

  const contactsList = contacts.map((contact) => {
    const name = `${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}${contact.nickname ? ` (${contact.nickname})` : ''}`;
    const summary = contact.aiSummary || template.noSummary;
    const topics = contact.hotTopics.length > 0
      ? contact.hotTopics.map((topic) => {
          if (topic.context) {
            return `${topic.title} (${topic.context})`;
          }
          return topic.title;
        }).join(', ')
      : template.noTopics;
    return `- [ID: ${contact.id}] ${name}\n  ${language === 'fr' ? 'Résumé' : language === 'en' ? 'Summary' : language === 'es' ? 'Resumen' : language === 'it' ? 'Riassunto' : 'Zusammenfassung'}: ${summary}\n  ${language === 'fr' ? 'Sujets actuels' : language === 'en' ? 'Current topics' : language === 'es' ? 'Temas actuales' : language === 'it' ? 'Argomenti attuali' : 'Aktuelle Themen'}: ${topics}`;
  }).join('\n');

  return `${template.intro}
${getSecurityInstructions(language)}
${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.fr}

${wrappedTranscription}

${template.existingContacts}:
${contactsList || (language === 'fr' ? 'Aucun contact existant.' : language === 'en' ? 'No existing contacts.' : language === 'es' ? 'Ningún contacto existente.' : language === 'it' ? 'Nessun contatto esistente.' : 'Keine bestehenden Kontakte.')}

${template.rules}

${template.examples}`;
}
