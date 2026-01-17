# Exemples d'utilisation des Structured Outputs avec OpenAI

## Introduction

Les Structured Outputs d'OpenAI garantissent que la réponse du modèle respecte exactement le schéma Zod défini, éliminant les erreurs de parsing JSON.

## Exemple 1: Extraction de données (route `/extract`)

### Schéma Zod actuel

```typescript
const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  noteTitle: z.string().describe('Titre court de 2-4 mots'),
  contactInfo: z.object({
    phone: z.string().nullable(),
    email: z.string().nullable(),
    birthday: z.object({
      day: z.number(),
      month: z.number(),
      year: z.number().nullable(),
    }).nullable(),
  }),
  hotTopics: z.array(
    z.object({
      title: z.string(),
      context: z.string(),
      eventDate: z.string().nullable(), // ISO format: YYYY-MM-DD
    })
  ),
  resolvedTopics: z.array(
    z.object({
      existingTopicId: z.string(),
      resolution: z.string(),
    })
  ),
});
```

### Utilisation avec Structured Outputs

```typescript
import { generateObject } from 'ai';
import { createAIModel, getStructuredOutputSettings } from '../lib/ai-provider';

// Configuration du provider
const providerConfig = {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  XAI_API_KEY: c.env.XAI_API_KEY,
  CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
  AI_PROVIDER: c.env.AI_PROVIDER,
};

const model = createAIModel(providerConfig);

// Appel avec Structured Outputs
const { object: extraction } = await generateObject({
  model,
  schema: extractionSchema,
  prompt: buildExtractionPrompt(transcription, currentContact, language),
  ...getStructuredOutputSettings(), // Ajoute temperature: 0
});

// extraction est maintenant typé et garanti de respecter le schéma
console.log(extraction.contactIdentified.firstName); // ✅ Type-safe
console.log(extraction.hotTopics[0].title); // ✅ Pas d'erreur de parsing
```

## Exemple 2: Génération de résumé (route `/summary`)

### Schéma Zod

```typescript
const summarySchema = z.object({
  text: z.string().describe('Le résumé factuel de la personne (2-3 phrases)'),
});
```

### Utilisation

```typescript
const { object: summary } = await generateObject({
  model,
  schema: summarySchema,
  prompt: buildSummaryPrompt(contactName, transcriptions, language),
  ...getStructuredOutputSettings(),
});

// Accès direct au texte du résumé
const summaryText = summary.text; // ✅ Garanti d'être une string
```

## Exemple 3: Questions (route `/ice-breakers`)

### Schéma Zod personnalisé

```typescript
const questionsSchema = z.object({
  questions: z.array(z.string()).max(3).describe('Questions à poser au contact'),
});
```

### Utilisation avec `generateText` (alternative)

Pour les cas simples où vous n'avez pas besoin de structure complexe, vous pouvez aussi utiliser `generateText`:

```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model,
  prompt: buildQuestionsPrompt(contact, hotTopics, recentNotes),
  temperature: 0, // Déterministe
});

// Parser manuellement si nécessaire
const questions = text.split('\n').filter(q => q.trim());
```

Mais pour garantir la structure, préférez `generateObject`:

```typescript
const { object: result } = await generateObject({
  model,
  schema: questionsSchema,
  prompt: buildQuestionsPrompt(contact, hotTopics, recentNotes),
  ...getStructuredOutputSettings(),
});

// result.questions est garanti d'être un tableau de strings
```

## Bonnes pratiques

### 1. Descriptions claires dans le schéma

Les `.describe()` aident le modèle à comprendre ce qu'on attend:

```typescript
const schema = z.object({
  title: z.string()
    .describe('Titre court de 3-5 mots résumant le sujet'),
  eventDate: z.string().nullable()
    .describe('Date au format ISO YYYY-MM-DD si mentionnée, sinon null'),
});
```

### 2. Utiliser des enums pour les valeurs contraintes

```typescript
const schema = z.object({
  confidence: z.enum(['high', 'medium', 'low'])
    .describe('Niveau de confiance dans l\'identification'),
  status: z.enum(['active', 'resolved'])
    .describe('Statut de l\'actualité'),
});
```

### 3. Gérer les valeurs optionnelles correctement

```typescript
// ✅ Bon: nullable pour les champs optionnels
const schema = z.object({
  lastName: z.string().nullable(),
  eventDate: z.string().nullable(),
});

// ❌ Éviter: optional() ne fonctionne pas bien avec Structured Outputs
const schema = z.object({
  lastName: z.string().optional(), // Peut causer des problèmes
});
```

### 4. Tableaux avec contraintes

```typescript
const schema = z.object({
  questions: z.array(z.string())
    .min(1)
    .max(3)
    .describe('Entre 1 et 3 questions à poser'),
  hotTopics: z.array(z.object({
    title: z.string(),
    context: z.string(),
  }))
  .describe('Nouvelles actualités détectées'),
});
```

### 5. Nested objects complexes

```typescript
const schema = z.object({
  contactInfo: z.object({
    phone: z.string().nullable(),
    email: z.string().nullable(),
    birthday: z.object({
      day: z.number().min(1).max(31),
      month: z.number().min(1).max(12),
      year: z.number().nullable(),
    }).nullable(),
  }),
});
```

## Gestion des erreurs

Avec Structured Outputs, les erreurs de parsing disparaissent, mais il faut toujours gérer:

### 1. Erreurs réseau

```typescript
try {
  const { object } = await generateObject({
    model,
    schema: extractionSchema,
    prompt,
    ...getStructuredOutputSettings(),
  });

  return c.json({ success: true, extraction: object });
} catch (error) {
  console.error('Extraction error:', error);
  return c.json({ error: 'Extraction failed' }, 500);
}
```

### 2. Validation post-génération

Même si le schéma est respecté, vous pouvez ajouter des validations métier:

```typescript
const { object } = await generateObject({
  model,
  schema: extractionSchema,
  prompt,
  ...getStructuredOutputSettings(),
});

// Validation métier
if (object.hotTopics.length === 0 && object.contactInfo.phone === null) {
  console.warn('Aucune donnée extraite');
}

// Filtrer les résultats invalides
const filteredHotTopics = object.hotTopics.filter(topic =>
  topic.title.length > 0 && topic.context.length > 0
);
```

## Comparaison avec les autres providers

### OpenAI (Structured Outputs)

```typescript
// ✅ Garanti de respecter le schéma
// ✅ Pas d'erreur de parsing JSON
// ✅ Type-safety complet
const { object } = await generateObject({
  model: openaiModel,
  schema: extractionSchema,
  prompt,
  temperature: 0,
});
```

### xAI / Cerebras (Mode normal)

```typescript
// ⚠️  Peut échouer si le JSON est invalide
// ⚠️  Nécessite parfois des retries
const { object } = await generateObject({
  model: grokModel,
  schema: extractionSchema,
  prompt,
});
```

## Migration d'un endpoint existant

### Avant (avec xAI/Grok)

```typescript
const { object } = await generateObject({
  model: createAIModel({ XAI_API_KEY: c.env.XAI_API_KEY }),
  schema: extractionSchema,
  prompt,
});
```

### Après (avec OpenAI + Structured Outputs)

```typescript
const providerConfig = {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  XAI_API_KEY: c.env.XAI_API_KEY,
  AI_PROVIDER: c.env.AI_PROVIDER, // 'openai' par défaut
};

const { object } = await generateObject({
  model: createAIModel(providerConfig),
  schema: extractionSchema,
  prompt,
  ...getStructuredOutputSettings(), // Ajoute temperature: 0
});
```

## Debugging des Structured Outputs

### Activer les logs détaillés

```typescript
const { object, response } = await generateObject({
  model,
  schema: extractionSchema,
  prompt,
  ...getStructuredOutputSettings(),
});

console.log('Tokens utilisés:', response.usage);
console.log('Modèle:', response.modelId);
console.log('Extraction:', JSON.stringify(object, null, 2));
```

### Vérifier le schéma généré

OpenAI génère un JSON Schema depuis votre schéma Zod. Vous pouvez le voir dans les logs:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

const jsonSchema = zodToJsonSchema(extractionSchema);
console.log('Schema envoyé à OpenAI:', JSON.stringify(jsonSchema, null, 2));
```

## Ressources

- [OpenAI Structured Outputs Documentation](https://platform.openai.com/docs/guides/structured-outputs)
- [Vercel AI SDK generateObject](https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object)
- [Zod Documentation](https://zod.dev/)
