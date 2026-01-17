# Migration vers OpenAI GPT-5 mini avec Structured Outputs

## Vue d'ensemble

Le backend a été migré pour utiliser OpenAI GPT-5 mini comme provider par défaut, avec le support des Structured Outputs pour garantir une conformité 100% au schéma Zod.

## Changements effectués

### 1. Configuration du provider AI

**Fichier**: `/backend/src/lib/ai-provider.ts`

- Ajout du support pour OpenAI comme provider principal
- OpenAI est maintenant le provider par défaut (au lieu de xAI/Grok)
- Configuration `compatibility: 'strict'` pour activer les Structured Outputs
- Nouvelle fonction helper `getStructuredOutputSettings()` pour faciliter l'utilisation

### 2. Variables d'environnement

**Fichier**: `/backend/.env.example`

Nouvelle variable ajoutée:
```bash
OPENAI_API_KEY=your-openai-api-key
```

Configuration du provider (modifiée):
```bash
AI_PROVIDER=openai  # Par défaut: 'openai', autres options: 'grok', 'cerebras'
```

### 3. Mise à jour des routes

Tous les fichiers de routes ont été mis à jour pour supporter `OPENAI_API_KEY`:
- `/backend/src/routes/extract.ts`
- `/backend/src/routes/summary.ts`
- `/backend/src/routes/ice-breakers.ts`
- `/backend/src/routes/ask.ts`
- `/backend/src/routes/search.ts`
- `/backend/src/routes/similarity.ts`

### 4. Dépendances

**Fichier**: `/backend/package.json`

Nouvelle dépendance ajoutée:
```json
"@ai-sdk/openai": "^2.1.4"
```

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. Ajouter votre clé API OpenAI dans `.env`:
```bash
OPENAI_API_KEY=sk-...
```

3. Vérifier que le provider est configuré sur `openai`:
```bash
AI_PROVIDER=openai
```

## Utilisation des Structured Outputs

### Méthode recommandée

Le Vercel AI SDK avec `@ai-sdk/openai` gère automatiquement les Structured Outputs lorsque vous utilisez `generateObject()` avec un schéma Zod.

**Exemple actuel (déjà en place)**:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIModel, getStructuredOutputSettings } from '../lib/ai-provider';

const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string(),
    lastName: z.string().nullable(),
    // ...
  }),
  // ...
});

const providerConfig = {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  // ...
};

const model = createAIModel(providerConfig);

const { object: extraction } = await generateObject({
  model,
  schema: extractionSchema,
  prompt: '...',
  ...getStructuredOutputSettings(), // Ajoute temperature: 0 pour des outputs déterministes
});
```

### Avantages des Structured Outputs

1. **Conformité garantie**: Le schéma Zod est respecté à 100% (pas d'erreurs de parsing)
2. **Déterminisme**: `temperature: 0` assure des résultats cohérents
3. **Performance**: Pas besoin de retry logic en cas d'erreur de schéma
4. **Type safety**: TypeScript infère automatiquement les types depuis Zod

## Fallback vers d'autres providers

Le système garde la compatibilité avec les autres providers:

```bash
# Utiliser xAI (Grok)
AI_PROVIDER=grok
XAI_API_KEY=your-xai-key

# Utiliser Cerebras
AI_PROVIDER=cerebras
CEREBRAS_API_KEY=your-cerebras-key
```

**Note**: Les Structured Outputs sont spécifiques à OpenAI. Les autres providers utilisent toujours `generateObject()` mais sans la garantie de conformité stricte.

## Recommandations du Redesign V2

D'après `/REDESIGN_V2.md`, section 9:

| Tâche | Provider recommandé | Raison |
|-------|---------------------|--------|
| Extraction (review) | OpenAI GPT-5 mini + Structured Outputs | Garantie schéma 100% |
| Questions / Résumé | OpenAI GPT-5 mini | Bon rapport qualité/prix |
| Transcription | Groq Whisper v3 Turbo | Rapide, bon français |
| Détection contact | Cerebras Llama 8B | Rapide, économique |

## Test de la migration

1. Démarrer le serveur de dev:
```bash
npm run dev
```

2. Tester un endpoint d'extraction:
```bash
curl -X POST http://localhost:8787/api/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transcription": "J'\''ai vu Marie hier, elle m'\''a dit qu'\''elle passait son entretien chez Google le 25 janvier.",
    "existingContacts": []
  }'
```

3. Vérifier les logs pour confirmer l'utilisation d'OpenAI:
```
[Extract] Using AI provider: openai
```

## Debugging

Activer les logs de performance pour voir les métriques:
```bash
ENABLE_PERFORMANCE_LOGGING=true
```

Activer LangFuse pour l'observabilité LLM complète:
```bash
ENABLE_LANGFUSE=true
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
```

## Migration checklist

- [x] Ajouter `@ai-sdk/openai` aux dépendances
- [x] Mettre à jour `ai-provider.ts` pour supporter OpenAI
- [x] Ajouter `OPENAI_API_KEY` à `.env.example`
- [x] Mettre à jour tous les types `Bindings` dans les routes
- [x] Ajouter `OPENAI_API_KEY` dans les `providerConfig`
- [x] Changer le provider par défaut de `grok` à `openai`
- [x] Documenter l'utilisation des Structured Outputs
- [ ] Installer les dépendances: `npm install`
- [ ] Configurer `OPENAI_API_KEY` dans `.env`
- [ ] Tester les endpoints avec le nouveau provider
- [ ] Déployer en production

## Ressources

- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Vercel AI SDK - OpenAI Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/openai)
- [Zod Schema Documentation](https://zod.dev/)
