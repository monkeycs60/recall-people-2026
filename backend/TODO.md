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
