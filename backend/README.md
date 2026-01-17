# Recall People - Backend

Backend API pour l'application Recall People, construit avec Hono et déployé sur Cloudflare Workers.

## Architecture

- **Framework**: Hono
- **Runtime**: Cloudflare Workers
- **Base de données**: PostgreSQL (Neon) via Prisma
- **AI Providers**: OpenAI GPT-5 mini (recommandé), xAI Grok, Cerebras
- **Transcription**: Groq Whisper v3 Turbo ou Deepgram
- **Observabilité**: LangFuse (optionnel)

## Migration vers OpenAI GPT-5 mini (Redesign V2)

Le backend a été migré pour utiliser OpenAI GPT-5 mini avec Structured Outputs par défaut.

### Quick Start

**Documentation rapide**: [QUICK_START_OPENAI.md](QUICK_START_OPENAI.md)

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et ajouter OPENAI_API_KEY=sk-...

# 3. Démarrer le serveur de dev
npm run dev
```

### Documentation complète

1. **[QUICK_START_OPENAI.md](QUICK_START_OPENAI.md)** - Guide de démarrage rapide (5 minutes)
2. **[OPENAI_MIGRATION.md](OPENAI_MIGRATION.md)** - Guide complet de migration
3. **[STRUCTURED_OUTPUTS_EXAMPLE.md](STRUCTURED_OUTPUTS_EXAMPLE.md)** - Exemples pratiques avec Zod
4. **[REDESIGN_V2_INTEGRATION.md](REDESIGN_V2_INTEGRATION.md)** - Intégration avec le Redesign V2
5. **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - Résumé des changements effectués

### Recommandations techniques

D'après le [Redesign V2](/REDESIGN_V2.md), section 9:

| Tâche | Provider recommandé | Modèle | Raison |
|-------|---------------------|--------|--------|
| **Extraction (review)** | **OpenAI** | **GPT-5 mini + Structured Outputs** | **Garantie schéma 100%** |
| Questions / Résumé | OpenAI | GPT-5 mini | Bon rapport qualité/prix |
| Transcription | Groq | Whisper v3 Turbo | Rapide, bon français |
| Détection contact | Cerebras | Llama 8B | Rapide, économique |

## Installation

### Prérequis

- Node.js 20+
- npm ou pnpm
- Compte Cloudflare Workers
- Compte OpenAI (pour GPT-5 mini)
- Base de données PostgreSQL (Neon recommandé)

### Configuration

1. **Copier le fichier d'environnement**:
   ```bash
   cp .env.example .env
   ```

2. **Configurer les variables d'environnement** dans `.env`:

   **Obligatoire**:
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/recall_people
   JWT_SECRET=your-super-secure-jwt-secret
   OPENAI_API_KEY=sk-...
   ```

   **Optionnel**:
   ```bash
   # Autres AI providers (fallback)
   XAI_API_KEY=your-xai-key
   CEREBRAS_API_KEY=your-cerebras-key

   # Transcription
   GROQ_API_KEY=your-groq-key
   DEEPGRAM_API_KEY=your-deepgram-key

   # Observabilité
   ENABLE_LANGFUSE=true
   LANGFUSE_SECRET_KEY=sk-lf-...
   LANGFUSE_PUBLIC_KEY=pk-lf-...
   ```

3. **Installer les dépendances**:
   ```bash
   npm install
   ```

4. **Configurer la base de données**:
   ```bash
   npm run db:generate
   npm run db:push
   ```

## Développement

### Démarrer le serveur de dev

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:8787` (ou le port configuré).

### Scripts disponibles

```bash
# Développement
npm run dev              # Démarrer le serveur de dev avec Wrangler

# Base de données
npm run db:generate      # Générer le client Prisma
npm run db:push          # Push le schéma vers la DB
npm run db:migrate       # Créer une migration
npm run db:studio        # Ouvrir Prisma Studio

# Déploiement
npm run deploy           # Déployer sur Cloudflare Workers
```

## Structure du projet

```
backend/
├── src/
│   ├── lib/
│   │   ├── ai-provider.ts        # Configuration AI (OpenAI, xAI, Cerebras)
│   │   ├── security.ts           # Sécurité et validation
│   │   ├── telemetry.ts          # LangFuse integration
│   │   └── performance-logger.ts # Logs de performance
│   ├── middleware/
│   │   └── auth.ts               # Authentification JWT
│   ├── routes/
│   │   ├── extract.ts            # Extraction de données (Redesign V2)
│   │   ├── summary.ts            # Génération de résumés
│   │   ├── ice-breakers.ts       # Questions "À demander"
│   │   ├── ask.ts                # Recherche sémantique
│   │   ├── transcribe.ts         # Transcription audio
│   │   └── ...
│   └── index.ts                  # Point d'entrée
├── prisma/
│   └── schema.prisma             # Schéma de base de données
├── .env.example                  # Template de variables d'environnement
├── wrangler.toml                 # Config Cloudflare Workers
├── package.json
└── README.md                     # Ce fichier
```

## API Endpoints

### Authentification

- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `GET /api/auth/me` - Récupérer l'utilisateur actuel

### Notes et extraction

- `POST /api/transcribe` - Transcrire un audio en texte
- `POST /api/extract` - Extraire les données d'une transcription (Redesign V2)
- `POST /api/summary` - Générer un résumé de contact
- `POST /api/ice-breakers` - Générer des questions "À demander"

### Recherche

- `POST /api/ask` - Poser une question sur les contacts
- `POST /api/search` - Rechercher dans les notes

### Autres

- `GET /api/health` - Health check
- `POST /api/avatar` - Générer un avatar

## Configuration des AI Providers

### OpenAI (Recommandé)

```bash
# .env
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
```

**Avantages**:
- Structured Outputs: garantie de conformité au schéma Zod à 100%
- Déterminisme avec `temperature: 0`
- Meilleur rapport qualité/prix
- Pas d'erreurs de parsing JSON

**Utilisation**:
```typescript
import { generateObject } from 'ai';
import { createAIModel, getStructuredOutputSettings } from './lib/ai-provider';

const model = createAIModel(providerConfig);
const { object } = await generateObject({
  model,
  schema: myZodSchema,
  prompt: '...',
  ...getStructuredOutputSettings(),
});
```

### xAI (Grok) - Fallback

```bash
# .env
XAI_API_KEY=your-xai-key
AI_PROVIDER=grok
```

### Cerebras - Fallback

```bash
# .env
CEREBRAS_API_KEY=your-cerebras-key
AI_PROVIDER=cerebras
```

## Observabilité

### LangFuse

Pour monitorer les appels LLM, les coûts, et la qualité:

```bash
# .env
ENABLE_LANGFUSE=true
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

Dashboard: https://cloud.langfuse.com

### Performance Logging

Pour activer les logs de performance dans la console:

```bash
# .env
ENABLE_PERFORMANCE_LOGGING=true
```

Logs les métriques:
- Provider utilisé
- Modèle
- Durée de l'appel
- Taille input/output
- Métadonnées

## Déploiement

### Cloudflare Workers

1. **Installer Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Se connecter à Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Configurer les secrets**:
   ```bash
   wrangler secret put OPENAI_API_KEY
   wrangler secret put DATABASE_URL
   wrangler secret put JWT_SECRET
   ```

4. **Déployer**:
   ```bash
   npm run deploy
   ```

### Variables d'environnement en production

Configurer dans le dashboard Cloudflare Workers:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- Autres clés optionnelles

## Tests

```bash
# Tester l'endpoint d'extraction
curl -X POST https://your-worker.workers.dev/api/extract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transcription": "J'\''ai vu Marie hier.",
    "existingContacts": []
  }'
```

## Coûts estimés

### OpenAI GPT-5 mini

- **Input**: ~$0.15 / 1M tokens
- **Output**: ~$0.60 / 1M tokens

**Estimation pour Recall People**:
- Extraction: ~$0.0003 par note
- Questions: ~$0.0001 par génération
- Résumé: ~$0.0004 par contact

**Total**: ~$0.0008 par note complète

Pour 1000 notes/jour: ~$24/mois

### Groq Whisper (Transcription)

- **Gratuit** jusqu'à 10M requêtes/jour
- Puis ~$0.111 / 1000 minutes

## Support

### Erreurs communes

1. **"OPENAI_API_KEY is required"**
   - Vérifier que `.env` contient la clé OpenAI
   - Format: `OPENAI_API_KEY=sk-...`

2. **"Invalid API key"**
   - Vérifier que la clé est valide sur https://platform.openai.com
   - S'assurer qu'elle commence par `sk-`

3. **Erreurs de schéma Zod**
   - Avec Structured Outputs, cela ne devrait jamais arriver
   - Si ça arrive, vérifier que `AI_PROVIDER=openai`

### Documentation

- [Quick Start](QUICK_START_OPENAI.md)
- [Migration OpenAI](OPENAI_MIGRATION.md)
- [Structured Outputs](STRUCTURED_OUTPUTS_EXAMPLE.md)
- [Redesign V2](REDESIGN_V2_INTEGRATION.md)
- [Résumé Migration](MIGRATION_SUMMARY.md)

### Ressources externes

- [OpenAI Platform](https://platform.openai.com)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Cloudflare Workers](https://workers.cloudflare.com)
- [Hono Framework](https://hono.dev)
- [Prisma](https://www.prisma.io)

## License

Propriétaire - Recall People
