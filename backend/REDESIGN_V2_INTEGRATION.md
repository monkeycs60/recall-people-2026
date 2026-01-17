# Intégration OpenAI avec Redesign V2

## Contexte

Ce document explique comment utiliser OpenAI GPT-5 mini avec Structured Outputs dans le cadre du Redesign V2 de Recall People.

Voir `/REDESIGN_V2.md` pour le contexte complet du redesign.

## Changements clés du Redesign V2

### 1. Simplification de l'extraction

**Avant (V1)**:
- 18 catégories de facts
- Catégorisation forcée par LLM
- Review complexe (cocher facts, memories, hot topics)

**Après (V2)**:
- Notes libres (texte)
- Extraction minimale (hot topics + infos contact)
- Review simplifié (transcription + hot topics)

### 2. Nouveau schéma d'extraction

Le schéma Zod pour l'extraction a été simplifié:

```typescript
const extractionSchema = z.object({
  // Identification du contact
  contactIdentified: z.object({
    firstName: z.string(),
    lastName: z.string().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),

  // Titre de la note (nouveau en V2)
  noteTitle: z.string().describe('2-4 mots résumant la note'),

  // Infos de contact (simplifié)
  contactInfo: z.object({
    phone: z.string().nullable(),
    email: z.string().nullable(),
    birthday: z.object({
      day: z.number(),
      month: z.number(),
      year: z.number().nullable(),
    }).nullable(),
  }),

  // Hot topics (cœur de l'app)
  hotTopics: z.array(
    z.object({
      title: z.string(),
      context: z.string(),
      eventDate: z.string().nullable(), // ISO: YYYY-MM-DD
    })
  ),

  // Résolution de hot topics existants (nouveau en V2)
  resolvedTopics: z.array(
    z.object({
      existingTopicId: z.string(),
      resolution: z.string().describe('Ce qui s\'est passé concrètement'),
    })
  ),
});
```

## Prompts adaptés au Redesign V2

### 1. Prompt d'extraction (Review)

Le prompt suit les principes du Redesign V2:

```typescript
const prompt = `Tu es un assistant qui extrait les actualités importantes d'une note vocale.

DATE DE RÉFÉRENCE: ${currentDate} (YYYY-MM-DD)

TRANSCRIPTION:
${transcription}

ACTUALITÉS EXISTANTES DE CE CONTACT:
${existingHotTopics}

TÂCHE:
1. Extrais les NOUVELLES actualités/sujets à suivre (projets, événements, situations en cours)
2. Détecte si des actualités existantes sont RÉSOLUES dans cette note
3. Détecte les infos de contact (téléphone, email, anniversaire) si mentionnées
4. Identifie le prénom de la personne
5. Génère un titre court pour la note (2-4 mots, ex: "Café rattrapage")

RÈGLES ABSOLUES (Redesign V2):
1. N'invente JAMAIS d'information non présente
2. Utilise des dates ABSOLUES (YYYY-MM-DD), jamais relatives
3. Si pas assez d'infos, retourne moins de résultats
4. Hot topic = TEMPORAIRE uniquement (pas de traits permanents)

HOT TOPICS = Sujets à suivre/redemander:
- Projets en cours: "Cherche un appart", "Prépare un examen"
- Événements: "Mariage", "Entretien d'embauche"
- Situations temporaires: "Problème au travail"

PAS un hot topic:
- Traits permanents: métier stable, hobbies réguliers
- Infos statiques: lieu de vie, formation

DATES ABSOLUES (calculer depuis ${currentDate}):
- "dans X jours/semaines/mois" → date exacte calculée
- "la semaine prochaine" → lundi prochain
- "le 25 janvier" → 2026-01-25
- "mi-février" → 2026-02-15
- "en juin" → 2026-06-01
- Si date vague → eventDate = null

RÉSOLUTION D'ACTUALITÉS:
Si une actualité existante est mentionnée avec une issue, marque-la résolue.

RÈGLE CRITIQUE pour la résolution:
- Extrais TOUS les détails concrets de la transcription
- Inclus: résultats chiffrés, noms, lieux, dates, anecdotes
- Si aucun détail → résolution = "Effectué"

Exemples:
• "Elle a eu son entretien chez Google" → "Effectué"
• "Elle a été prise chez Google, commence en mars" → "Elle a été prise, commence en mars"
• "Il a trouvé un appart dans le 11ème, 45m²" → "Trouvé dans le 11ème, 45m²"
`;
```

### 2. Utilisation avec Structured Outputs

```typescript
import { generateObject } from 'ai';
import { createAIModel, getStructuredOutputSettings } from '../lib/ai-provider';

const providerConfig = {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  XAI_API_KEY: c.env.XAI_API_KEY,
  CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
  AI_PROVIDER: c.env.AI_PROVIDER, // 'openai' par défaut
};

const model = createAIModel(providerConfig);

const { object: extraction } = await generateObject({
  model,
  schema: extractionSchema,
  prompt: buildExtractionPrompt(transcription, currentContact, language),
  ...getStructuredOutputSettings(), // temperature: 0
});

// extraction.hotTopics est garanti d'être un tableau valide
// extraction.resolvedTopics est garanti d'être un tableau valide
// extraction.noteTitle est garanti d'être une string
```

## Exemples d'extraction (Redesign V2)

### Exemple 1: Nouvelle actualité avec date

**Transcription**:
```
J'ai vu Marie au café. Elle m'a dit qu'elle passait son entretien final chez Google
la semaine prochaine, le 25 janvier. Elle est stressée mais confiante.
```

**Extraction avec Structured Outputs**:
```json
{
  "contactIdentified": {
    "firstName": "Marie",
    "lastName": null,
    "confidence": "high"
  },
  "noteTitle": "Café rattrapage",
  "contactInfo": {
    "phone": null,
    "email": null,
    "birthday": null
  },
  "hotTopics": [
    {
      "title": "Entretien Google",
      "context": "Entretien final chez Google, stressée mais confiante",
      "eventDate": "2026-01-25"
    }
  ],
  "resolvedTopics": []
}
```

### Exemple 2: Résolution d'actualité avec détails

**Transcription**:
```
Marie m'a appelée, elle a eu son entretien ! Elle a été prise chez Google,
elle commence en mars. Elle est trop contente.
```

**Hot topics existants**:
```json
[
  {
    "id": "topic_123",
    "title": "Entretien Google",
    "context": "Entretien final"
  }
]
```

**Extraction avec Structured Outputs**:
```json
{
  "contactIdentified": {
    "firstName": "Marie",
    "lastName": null,
    "confidence": "high"
  },
  "noteTitle": "Appel Marie",
  "contactInfo": {
    "phone": null,
    "email": null,
    "birthday": null
  },
  "hotTopics": [],
  "resolvedTopics": [
    {
      "existingTopicId": "topic_123",
      "resolution": "Elle a été prise chez Google, commence en mars"
    }
  ]
}
```

### Exemple 3: Infos de contact détectées

**Transcription**:
```
Lucas m'a donné son nouveau numéro: 06 12 34 56 78.
Son anniversaire c'est le 15 mars, il va avoir 30 ans.
```

**Extraction avec Structured Outputs**:
```json
{
  "contactIdentified": {
    "firstName": "Lucas",
    "lastName": null,
    "confidence": "high"
  },
  "noteTitle": "Appel rapide",
  "contactInfo": {
    "phone": "06 12 34 56 78",
    "email": null,
    "birthday": {
      "day": 15,
      "month": 3,
      "year": 1996
    }
  },
  "hotTopics": [],
  "resolvedTopics": []
}
```

## Génération de questions (À demander)

Le Redesign V2 introduit une nouvelle fonctionnalité "À demander" basée uniquement sur données réelles.

### Prompt pour générer les questions

```typescript
const prompt = `Tu génères des questions naturelles à poser à ${firstName} lors de la prochaine rencontre.

ACTUALITÉS ACTIVES:
${hotTopics}

ACTUALITÉS RÉCEMMENT RÉSOLUES:
${resolvedTopics}

RÈGLES:
1. Base-toi UNIQUEMENT sur les informations fournies
2. Priorise les actualités avec dates proches
3. Si une actualité est résolue positivement, suggère de féliciter
4. Formulation naturelle, comme on parlerait à un ami
5. Maximum 3 questions
6. Si pas assez d'infos, retourne 1 ou 2 questions seulement

FORMAT JSON:
{
  "questions": [
    "Comment s'est passé ton entretien chez Google ?",
    "Alors le déménagement, c'est calé pour mars ?"
  ]
}

Si aucune info pertinente, retourne : { "questions": [] }
`;
```

### Utilisation

```typescript
const questionsSchema = z.object({
  questions: z.array(z.string()).max(3),
});

const { object } = await generateObject({
  model,
  schema: questionsSchema,
  prompt: buildQuestionsPrompt(contact, hotTopics, resolvedTopics),
  ...getStructuredOutputSettings(),
});

// object.questions est garanti d'être un tableau de 0 à 3 strings
```

## Génération de résumé

### Prompt (Redesign V2)

```typescript
const prompt = `Tu génères un résumé factuel et concis de ${firstName}.

TOUTES LES NOTES (chronologiques):
${allNotes}

ACTUALITÉS ACTIVES:
${activeHotTopics}

RÈGLES:
1. Résumé de 2-4 phrases maximum
2. Utilise des DATES ABSOLUES (pas "récemment", mais "en janvier 2026")
3. Mentionne la situation actuelle (travail, projets en cours)
4. Mentionne les événements à venir importants
5. N'invente RIEN - base-toi uniquement sur les notes

FORMAT: Texte libre, 2-4 phrases.

Exemple bon:
"Marie est consultante chez Deloitte, en recherche d'un nouveau poste (entretien chez Google le 25/01/2026).
Elle déménage à Lyon en mars 2026. Mère de Lucas qui fait du foot."

Exemple mauvais:
"Marie est une personne dynamique qui travaille beaucoup. Elle a plein de projets passionnants."
`;
```

### Utilisation

```typescript
const summarySchema = z.object({
  text: z.string().describe('Le résumé factuel (2-3 phrases)'),
});

const { object } = await generateObject({
  model,
  schema: summarySchema,
  prompt: buildSummaryPrompt(contactName, allNotes, hotTopics),
  ...getStructuredOutputSettings(),
});

// object.text est garanti d'être une string
```

## Performance et coûts

### Pricing OpenAI GPT-5 mini

- Input: ~$0.15 / 1M tokens
- Output: ~$0.60 / 1M tokens

### Estimation pour Recall People

**Extraction typique** (route `/extract`):
- Input: ~1000 tokens (transcription + contexte + prompt)
- Output: ~200 tokens (JSON structuré)
- Coût: ~$0.00015 + ~$0.00012 = **~$0.00027 par extraction**

**Questions** (route `/ice-breakers`):
- Input: ~500 tokens (contexte + prompt)
- Output: ~50 tokens (3 questions)
- Coût: **~$0.00010 par génération**

**Résumé** (route `/summary`):
- Input: ~2000 tokens (toutes les notes)
- Output: ~100 tokens
- Coût: **~$0.00036 par résumé**

### Comparaison avec xAI (Grok)

- Grok: $5 / 1M input tokens, $15 / 1M output tokens
- OpenAI GPT-5 mini: 30x moins cher que Grok
- Meilleure qualité avec Structured Outputs

## Monitoring et observabilité

### LangFuse

Pour monitorer la qualité et les coûts:

```typescript
const trace = langfuse?.trace({
  name: 'extract',
  metadata: { route: '/api/extract' },
});

const generation = trace?.generation({
  name: 'extract-generation',
  model: 'gpt-5-mini',
  input: { transcription: transcription.slice(0, 500) },
});

const { object } = await generateObject({
  model,
  schema: extractionSchema,
  prompt,
  ...getStructuredOutputSettings(),
});

generation?.end({ output: object });
trace?.update({ output: { success: true } });
```

### Métriques à suivre

1. **Latence**: Temps de réponse par endpoint
2. **Coûts**: Tokens consommés par jour/semaine
3. **Qualité**: Taux de succès de l'extraction
4. **Erreurs**: Taux d'erreurs réseau ou de validation

## Principes du Redesign V2 appliqués

### 1. La note est la source de vérité
- ✅ La transcription est stockée telle quelle
- ✅ L'extraction est minimale (hot topics + contact info)
- ✅ Pas de transformation excessive

### 2. Moins d'extraction = moins d'erreurs
- ✅ Structured Outputs garantit la conformité
- ✅ Schéma simplifié (plus de 18 catégories de facts)
- ✅ Extraction ciblée sur ce qui a une utilité claire

### 3. Correction facile
- ✅ Si erreur, correction en 1 tap (frontend)
- ✅ Hot topics peuvent être édités
- ✅ Résolutions peuvent être modifiées

### 4. Pas d'hallucination
- ✅ Prompts stricts ("N'invente JAMAIS")
- ✅ Dates absolues obligatoires
- ✅ Mieux vaut moins d'info que de la fausse info

## Ressources

- [Redesign V2 complet](/REDESIGN_V2.md)
- [Guide de migration OpenAI](OPENAI_MIGRATION.md)
- [Exemples de Structured Outputs](STRUCTURED_OUTPUTS_EXAMPLE.md)
- [OpenAI Structured Outputs Documentation](https://platform.openai.com/docs/guides/structured-outputs)
