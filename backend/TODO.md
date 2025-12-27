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
