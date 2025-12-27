# Backend TODO

## Configuration AI Provider

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

### Switching entre providers:

- **Pour utiliser Grok (défaut):**
  ```
  AI_PROVIDER=grok
  ```

- **Pour utiliser Cerebras:**
  ```
  AI_PROVIDER=cerebras
  ```

### Models utilisés:

- **Grok:** `grok-4-1-fast`
- **Cerebras:** `gpt-oss-120b`

### Notes:

- Le système switche automatiquement entre providers selon la variable `AI_PROVIDER`
- Si `AI_PROVIDER` n'est pas défini, le système utilise Grok par défaut
- Les deux providers utilisent le Vercel AI SDK
- Tous les appels AI sont centralisés dans `/backend/src/lib/ai-provider.ts`
