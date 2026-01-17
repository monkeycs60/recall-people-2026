# Quick Start: OpenAI GPT-5 mini

Guide rapide pour démarrer avec OpenAI GPT-5 mini et Structured Outputs.

## Installation (3 étapes)

### 1. Installer les dépendances

```bash
cd backend
npm install
```

### 2. Configurer l'API key

```bash
# Copier .env.example
cp .env.example .env

# Éditer .env et ajouter votre clé OpenAI
nano .env
```

Ajouter dans `.env`:
```bash
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
```

### 3. Démarrer le serveur

```bash
npm run dev
```

## Vérifier que ça fonctionne

```bash
# Tester l'endpoint d'extraction
curl -X POST http://localhost:8787/api/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transcription": "J'\''ai vu Marie hier, elle passe son entretien chez Google le 25 janvier.",
    "existingContacts": []
  }'
```

Vous devriez voir dans les logs:
```
[Extract] Using AI provider: openai
```

## Utilisation dans le code

### Import

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIModel, getStructuredOutputSettings } from '../lib/ai-provider';
```

### Configuration

```typescript
const providerConfig = {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  XAI_API_KEY: c.env.XAI_API_KEY,
  CEREBRAS_API_KEY: c.env.CEREBRAS_API_KEY,
  AI_PROVIDER: c.env.AI_PROVIDER,
};

const model = createAIModel(providerConfig);
```

### Appel avec Structured Outputs

```typescript
const mySchema = z.object({
  title: z.string(),
  items: z.array(z.string()),
});

const { object } = await generateObject({
  model,
  schema: mySchema,
  prompt: 'Your prompt here...',
  ...getStructuredOutputSettings(), // Ajoute temperature: 0
});

// object.title est typé et garanti de respecter le schéma
console.log(object.title);
```

## Fallback vers d'autres providers

Pour utiliser xAI ou Cerebras au lieu d'OpenAI:

```bash
# Dans .env
AI_PROVIDER=grok
XAI_API_KEY=your-xai-key

# Ou
AI_PROVIDER=cerebras
CEREBRAS_API_KEY=your-cerebras-key
```

Le code fonctionne sans modification.

## Debugging

### Activer les logs de performance

```bash
# Dans .env
ENABLE_PERFORMANCE_LOGGING=true
```

### Activer LangFuse (observabilité)

```bash
# Dans .env
ENABLE_LANGFUSE=true
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
```

## Documentation complète

- **Guide de migration**: `OPENAI_MIGRATION.md`
- **Exemples pratiques**: `STRUCTURED_OUTPUTS_EXAMPLE.md`
- **Intégration Redesign V2**: `REDESIGN_V2_INTEGRATION.md`
- **Résumé des changements**: `MIGRATION_SUMMARY.md`

## Aide rapide

### Schéma Zod de base

```typescript
const schema = z.object({
  // String
  name: z.string(),

  // String nullable
  nickname: z.string().nullable(),

  // Enum
  status: z.enum(['active', 'inactive']),

  // Nombre
  age: z.number(),

  // Tableau
  tags: z.array(z.string()),

  // Objet imbriqué
  address: z.object({
    street: z.string(),
    city: z.string(),
  }).nullable(),
});
```

### Descriptions (recommandé)

```typescript
const schema = z.object({
  title: z.string()
    .describe('Titre court de 3-5 mots'),
  date: z.string().nullable()
    .describe('Date au format ISO YYYY-MM-DD si mentionnée'),
});
```

### Settings recommandés

```typescript
const { object } = await generateObject({
  model,
  schema: mySchema,
  prompt: '...',
  temperature: 0, // Déterministe
});

// Ou utiliser le helper
const { object } = await generateObject({
  model,
  schema: mySchema,
  prompt: '...',
  ...getStructuredOutputSettings(),
});
```

## Coûts estimés

- Extraction: ~$0.0003 par note
- Questions: ~$0.0001 par génération
- Résumé: ~$0.0004 par contact

Soit ~$0.0008 par note complète (extraction + questions + résumé).

Pour 1000 notes/jour: ~$0.80/jour = ~$24/mois

## Support

Erreurs communes:

1. **"OPENAI_API_KEY is required"**
   - Vérifier que `.env` contient `OPENAI_API_KEY=sk-...`

2. **"Invalid API key"**
   - Vérifier que la clé commence par `sk-`
   - Tester la clé sur https://platform.openai.com/playground

3. **Schéma non respecté**
   - Avec Structured Outputs, cela ne devrait jamais arriver
   - Si ça arrive, vérifier que `AI_PROVIDER=openai`

Pour plus d'aide, consulter la documentation complète dans les fichiers markdown du dossier `/backend`.
