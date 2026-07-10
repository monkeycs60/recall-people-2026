export type RespondingToTopic = {
  id: string;
  title: string;
  eventDate?: string | null;
};

const TEMPLATES: Record<string, (topic: RespondingToTopic, dateClause: string) => string> = {
  fr: (topic, dateClause) => `CONTEXTE DE RÉPONSE - PRIORITAIRE:
L'utilisateur répond à propos de l'actualité existante [ID: ${topic.id}] « ${topic.title} »${dateClause}.
- Les pronoms et références implicites ("ça", "c'était", "il/elle") se rapportent à cette actualité.
- Si la note raconte l'issue ou le déroulement de cette actualité, ajoute une entrée dans resolvedTopics avec existingTopicId = "${topic.id}" et une résolution détaillée.
- Ne crée PAS de nouveau hot topic doublonnant cette actualité.`,
  en: (topic, dateClause) => `REPLY CONTEXT - PRIORITY:
The user is replying about the existing update [ID: ${topic.id}] "${topic.title}"${dateClause}.
- Pronouns and implicit references ("it", "that", "he/she") refer to this update.
- If the note tells how this update went, add an entry to resolvedTopics with existingTopicId = "${topic.id}" and a detailed resolution.
- Do NOT create a new hot topic duplicating this update.`,
  es: (topic, dateClause) => `CONTEXTO DE RESPUESTA - PRIORITARIO:
El usuario responde sobre la novedad existente [ID: ${topic.id}] « ${topic.title} »${dateClause}.
- Los pronombres y referencias implícitas se refieren a esta novedad.
- Si la nota cuenta cómo fue esta novedad, añade una entrada en resolvedTopics con existingTopicId = "${topic.id}" y una resolución detallada.
- NO crees un nuevo hot topic que duplique esta novedad.`,
  it: (topic, dateClause) => `CONTESTO DI RISPOSTA - PRIORITARIO:
L'utente risponde riguardo alla novità esistente [ID: ${topic.id}] « ${topic.title} »${dateClause}.
- I pronomi e i riferimenti impliciti si riferiscono a questa novità.
- Se la nota racconta com'è andata questa novità, aggiungi una voce in resolvedTopics con existingTopicId = "${topic.id}" e una risoluzione dettagliata.
- NON creare un nuovo hot topic che duplichi questa novità.`,
  de: (topic, dateClause) => `ANTWORTKONTEXT - PRIORITÄT:
Der Benutzer antwortet zur bestehenden Neuigkeit [ID: ${topic.id}] „${topic.title}"${dateClause}.
- Pronomen und implizite Bezüge beziehen sich auf diese Neuigkeit.
- Wenn die Notiz erzählt, wie diese Neuigkeit ausgegangen ist, füge einen Eintrag in resolvedTopics mit existingTopicId = "${topic.id}" und einer detaillierten Lösung hinzu.
- Erstelle KEIN neues Hot Topic, das diese Neuigkeit dupliziert.`,
};

const DATE_CLAUSES: Record<string, (eventDate: string) => string> = {
  fr: (eventDate) => ` (événement du ${eventDate})`,
  en: (eventDate) => ` (event on ${eventDate})`,
  es: (eventDate) => ` (evento del ${eventDate})`,
  it: (eventDate) => ` (evento del ${eventDate})`,
  de: (eventDate) => ` (Ereignis am ${eventDate})`,
};

export const buildRespondingToTopicPreamble = (
  topic: RespondingToTopic,
  language: string
): string => {
  const template = TEMPLATES[language] || TEMPLATES.fr;
  const dateClause = topic.eventDate
    ? (DATE_CLAUSES[language] || DATE_CLAUSES.fr)(topic.eventDate)
    : '';
  return template(topic, dateClause);
};
