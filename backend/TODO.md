# Backend TODO

## Configuration AI Text Provider (Génération de texte)

### Pour activer le provider Cerebras:

1. **Ajouter la clé API Cerebras dans votre fichier .env:**
   ```
   CEREBRAS_API_KEY=votre-clé-cerebras-ici
   ```

2. **Changer le provider AI dans .env:**
   ```
   AI_PROVIDER=cerebras
   ```

3. **Redémarrer le serveur:**
   ```
   npm run dev
   ```

### Switching entre text providers:

- **Pour utiliser Grok (défaut):**
  ```
  AI_PROVIDER=grok
  ```

- **Pour utiliser Cerebras:**
  ```
  AI_PROVIDER=cerebras
  ```

### Models utilisés (Text):

- **Grok:** `grok-4-1-fast`
- **Cerebras:** `gpt-oss-120b`

---

## Configuration Speech-to-Text Provider (Transcription)

### Pour activer Groq Whisper v3 Turbo (RECOMMANDÉ):

1. **Ajouter la clé API Groq dans votre fichier .env:**
   ```
   GROQ_API_KEY=votre-clé-groq-ici
   ```

2. **Changer le provider STT dans .env:**
   ```
   STT_PROVIDER=groq-whisper-v3-turbo
   ```

3. **Redémarrer le serveur:**
   ```
   npm run dev
   ```

### Switching entre STT providers:

- **Pour utiliser Deepgram Nova-3 (défaut):**
  ```
  STT_PROVIDER=deepgram
  ```

- **Pour utiliser Groq Whisper Large v3:**
  ```
  STT_PROVIDER=groq-whisper-v3
  ```

- **Pour utiliser Groq Whisper v3 Turbo (recommandé - 8x plus rapide):**
  ```
  STT_PROVIDER=groq-whisper-v3-turbo
  ```

### Models utilisés (Speech-to-Text):

- **Deepgram:** `nova-3` (rapide, fiable)
- **Groq Whisper v3:** `whisper-large-v3` (précision maximale)
- **Groq Whisper v3 Turbo:** `whisper-large-v3-turbo` (meilleur équilibre vitesse/précision)

### Comparaison des providers STT:

| Provider | Vitesse | Précision | Coût | Recommandé pour |
|----------|---------|-----------|------|-----------------|
| Deepgram Nova-3 | ⚡⚡⚡ Très rapide | ⭐⭐⭐ Excellente | 💰💰 Moyen | Production stable |
| Groq Whisper v3 | ⚡⚡ Rapide | ⭐⭐⭐⭐ Maximale | 💰 Économique | Précision maximale |
| Groq Whisper v3 Turbo | ⚡⚡⚡⚡ Ultra rapide | ⭐⭐⭐ Excellente | 💰 Économique | **Usage général** ✅ |

### Notes:

- Le système switche automatiquement entre providers selon les variables d'environnement
- Si `AI_PROVIDER` n'est pas défini, le système utilise Grok par défaut
- Si `STT_PROVIDER` n'est pas défini, le système utilise Deepgram par défaut
- Les providers text utilisent le Vercel AI SDK
- Groq Whisper est généralement plus rapide et moins cher que Deepgram
- Tous les appels AI text sont centralisés dans `/backend/src/lib/ai-provider.ts`
- Tous les appels STT sont centralisés dans `/backend/src/lib/speech-to-text-provider.ts`

---

## Performance Logging System

### Activer le logging de performance:

1. **Dans votre fichier .env:**
   ```
   ENABLE_PERFORMANCE_LOGGING=true
   ```

2. **Redémarrer le serveur:**
   ```
   npm run dev
   ```

### Ce qui est loggé:

Le système de logging mesure et affiche pour chaque appel AI/STT :

- ✅ **Provider** : quel provider est utilisé (grok, cerebras, deepgram, groq-whisper-v3, etc.)
- ✅ **Model** : quel modèle spécifique (grok-4-1-fast, gpt-oss-120b, nova-3, whisper-large-v3-turbo)
- ✅ **Route** : quelle route API (/transcribe, /extract, /search, etc.)
- ✅ **Duration** : temps total de l'opération en millisecondes
- ✅ **Input size** : taille de l'input en bytes
- ✅ **Output size** : taille de l'output en bytes
- ✅ **Success** : si l'opération a réussi ou échoué
- ✅ **Metadata** : informations contextuelles (langue, nombre de facts, etc.)

### Format des logs:

```
✅ PERFORMANCE LOG [10:30:45]
Route: /transcribe
Provider: groq-whisper-v3-turbo (whisper-large-v3-turbo)
Operation: speech-to-text
⏱️  Duration: 450ms
Input: 245.5 KB
Output: 1.2 KB
Metadata: { language: 'fr' }
```

### Cas d'usage - Flow principal (Audio → Transcription → Extraction):

Quand tu enregistres un audio et sélectionnes un contact :

1. **`/transcribe`** : Log du temps de transcription (STT provider)
   - Compare Deepgram vs Groq Whisper v3 Turbo

2. **`/extract`** : Log du temps d'extraction (AI provider)
   - Compare Grok vs Cerebras

**Temps total du flow** = Temps transcription + Temps extraction

### Comparer les providers:

Pour comparer les performances entre providers :

1. **Activer le logging** (`ENABLE_PERFORMANCE_LOGGING=true`)

2. **Tester avec provider 1:**
   ```
   STT_PROVIDER=deepgram
   AI_PROVIDER=grok
   ```
   → Enregistrer un audio et noter les temps

3. **Tester avec provider 2:**
   ```
   STT_PROVIDER=groq-whisper-v3-turbo
   AI_PROVIDER=cerebras
   ```
   → Enregistrer le même type d'audio et comparer

4. **Analyser les résultats** dans la console pour voir quel combo est le plus rapide

### Routes loggées:

- `/transcribe` - Speech-to-text (operation: speech-to-text)
- `/extract` - Extraction d'infos (operation: object-generation)
- `/search` - Recherche sémantique (operation: object-generation)
- `/summary` - Résumé de contact (operation: text-generation)
- `/similarity` - Calcul de similarité (operation: object-generation)

### Désactiver le logging:

```
ENABLE_PERFORMANCE_LOGGING=false
```

Ou simplement enlever la variable de .env

---

## LangFuse LLM Observability & Evaluations

### Vue d'ensemble

LangFuse fournit une observabilité complète pour les appels LLM via OpenTelemetry :

- ✅ **Traces complètes** : Input/output de chaque appel LLM
- ✅ **Coûts automatiques** : Calcul des coûts par provider/modèle
- ✅ **Latency metrics** : p50, p95, p99
- ✅ **Quality scores** : Évaluations LLM-as-a-judge
- ✅ **Comparaison providers** : Grok vs Cerebras en production
- ✅ **Dashboard visuel** : Toutes les métriques en temps réel

### Setup initial

#### 1. Créer un compte LangFuse (gratuit)

1. Aller sur **https://cloud.langfuse.com**
2. Créer un compte gratuit
3. Créer un nouveau projet
4. Aller dans Settings → API Keys

#### 2. Récupérer les clés API

Copier les clés suivantes :
- `LANGFUSE_SECRET_KEY` (commence par `sk-lf-...`)
- `LANGFUSE_PUBLIC_KEY` (commence par `pk-lf-...`)

#### 3. Configurer les variables d'environnement

**Dans votre fichier .env local :**
```bash
ENABLE_LANGFUSE=true
LANGFUSE_SECRET_KEY=sk-lf-votre-secret-key
LANGFUSE_PUBLIC_KEY=pk-lf-votre-public-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

**Pour Cloudflare Workers (production) :**

Via le dashboard Cloudflare :
1. Aller dans Workers & Pages → Votre worker → Settings → Variables
2. Ajouter les 4 variables ci-dessus

Ou via CLI :
```bash
wrangler secret put LANGFUSE_SECRET_KEY
wrangler secret put LANGFUSE_PUBLIC_KEY
# Puis ajouter les autres dans wrangler.toml
```

#### 4. Tester en dev

```bash
npm run dev
# Faire quelques appels AI (transcription, extraction, etc.)
# Vérifier le dashboard LangFuse : https://cloud.langfuse.com
```

### Architecture technique

**OpenTelemetry + LangFuse :**

```
Vercel AI SDK (generateText/Object)
    ↓ Génère spans OpenTelemetry
NodeTracerProvider
    ↓ Capture les spans
LangfuseSpanProcessor
    ↓ Transforme et envoie
LangFuse Cloud API
    ↓
Dashboard LangFuse
```

**Fichiers clés :**
- `backend/src/lib/telemetry.ts` - Setup OpenTelemetry
- `backend/src/middleware/langfuse.ts` - Middleware avec flush
- `backend/src/lib/evaluators.ts` - LLM-as-a-judge evaluators

### LLM-as-a-Judge Evaluators

Le système inclut 3 evaluators automatiques pour mesurer la qualité :

#### 1. evaluateExtraction()

**Mesure :** Qualité de l'extraction vs transcription

**Critères :**
- ✅ Complétude : Tous les contacts mentionnés sont extraits ?
- ✅ Exactitude : Les infos extraites sont correctes ?
- ✅ Pas d'hallucinations : Rien d'inventé ?
- ✅ Contexte préservé : Relations/notes bien capturées ?

**Usage :**
```typescript
import { evaluateExtraction } from '../lib/evaluators';

const evaluation = await evaluateExtraction(
  transcription,
  extraction,
  {
    XAI_API_KEY: c.env.XAI_API_KEY,
    enableEvaluation: c.env.ENABLE_LANGFUSE === 'true',
    samplingRate: 0.25 // 25% = 1 sur 4
  }
);

if (evaluation) {
  console.log(`Extraction quality: ${evaluation.score}/10`);
  console.log(`Reasoning: ${evaluation.reasoning}`);
}
```

#### 2. evaluateSummary()

**Mesure :** Pertinence et utilité des résumés de contacts

**Critères :**
- ✅ Pertinence : Résumé capture les points clés ?
- ✅ Concision : Ni trop long, ni trop court ?
- ✅ Exactitude : Pas d'infos fausses ?
- ✅ Utilité : Aide à comprendre le contact ?

**Usage :**
```typescript
import { evaluateSummary } from '../lib/evaluators';

const evaluation = await evaluateSummary(
  { facts, hotTopics },
  summary,
  {
    XAI_API_KEY: c.env.XAI_API_KEY,
    enableEvaluation: c.env.ENABLE_LANGFUSE === 'true',
    samplingRate: 0.25
  }
);
```

#### 3. evaluateSearch()

**Mesure :** Qualité des résultats de recherche

**Critères :**
- ✅ Pertinence : Résultats correspondent à la query ?
- ✅ Exactitude : Réponses viennent des sources (facts/memories/notes) ?
- ✅ Scores cohérents : Les relevanceScore sont bien calibrés ?
- ✅ Pas d'hallucinations : Rien d'inventé ?

**Usage :**
```typescript
import { evaluateSearch } from '../lib/evaluators';

const evaluation = await evaluateSearch(
  query,
  { facts, memories, notes },
  searchResults,
  {
    XAI_API_KEY: c.env.XAI_API_KEY,
    enableEvaluation: c.env.ENABLE_LANGFUSE === 'true',
    samplingRate: 0.25
  }
);
```

### Configuration du sampling

**Par défaut : 25% (1 sur 4)**

Le sampling réduit les coûts d'évaluation de 75% tout en gardant une bonne visibilité.

**Modifier le taux de sampling :**

```typescript
// 10% = 1 sur 10 (encore moins cher)
samplingRate: 0.1

// 50% = 1 sur 2 (plus de données)
samplingRate: 0.5

// 100% = tout évaluer (pour debug)
samplingRate: 1.0
```

**Configurer dans le code :**
- `backend/src/lib/evaluators.ts:36` - Type par défaut
- `backend/src/lib/evaluators.ts:45` - Fonction shouldEvaluate()

### Coûts

| Item | Coût |
|------|------|
| **LangFuse Cloud (free tier)** | $0 - 50k observations/mois |
| **LangFuse Pro** | $59/mois - Plus de volume |
| **LLM-as-a-judge (Grok 4.1 Fast)** | ~$0.15 / 1000 évaluations |
| **Avec sampling 25%** | Réduit coûts eval de 75% |

**Exemple :** Si tu fais 10,000 extractions/mois avec sampling 25% :
- Observations LangFuse : 10,000 (gratuit)
- Évaluations : 2,500 (10k × 25%) = ~$0.38/mois

### Dashboard LangFuse

**URL :** https://cloud.langfuse.com

**Onglets disponibles :**

1. **Traces** : Tous les appels LLM avec input/output complets
2. **Sessions** : Regroupement par utilisateur/conversation
3. **Metrics** : Graphiques de latency, coûts, volumes
4. **Scores** : Résultats des évaluations qualité
5. **Users** : Analytics par utilisateur
6. **Prompts** : Gestion et versioning des prompts

**Filtres utiles :**
- Par route : `/extract`, `/search`, `/summary`
- Par provider : `grok`, `cerebras`
- Par score qualité : `< 7/10` (pour voir les problèmes)
- Par durée : `> 2s` (pour optimiser les lents)

### Comparer Grok vs Cerebras en prod

Avec LangFuse activé, tu peux facilement comparer :

1. **Dashboard → Metrics → Filter by provider**
2. Voir pour chaque provider :
   - Latency moyenne (p50, p95, p99)
   - Coûts totaux
   - Quality scores moyens
   - Volume d'utilisation

3. **Tester les deux :**
   ```bash
   # Semaine 1 : Grok
   AI_PROVIDER=grok

   # Semaine 2 : Cerebras
   AI_PROVIDER=cerebras
   ```

4. **Analyser dans le dashboard** :
   - Quel provider est le plus rapide ?
   - Quel provider a les meilleurs quality scores ?
   - Quel provider coûte le moins cher ?

### Désactiver LangFuse

```bash
ENABLE_LANGFUSE=false
```

Ou simplement enlever la variable de .env

**Note :** Le système continue de fonctionner normalement sans LangFuse. L'observabilité est optionnelle.

### Self-hosting (optionnel)

Si tu veux héberger LangFuse toi-même (gratuit, open source MIT) :

1. Suivre la doc : https://langfuse.com/docs/deployment/self-host
2. Deploy via Docker, Railway, ou Render
3. Changer `LANGFUSE_BASE_URL` vers ton instance

### Prochaines étapes recommandées

- [ ] Créer compte LangFuse gratuit
- [ ] Ajouter les clés API dans `.env`
- [ ] Activer `ENABLE_LANGFUSE=true`
- [ ] Tester quelques appels en dev
- [ ] Explorer le dashboard
- [ ] Optionnel : Intégrer evaluators dans les routes
- [ ] Optionnel : Créer datasets de test
- [ ] Déployer en production avec les secrets Cloudflare
