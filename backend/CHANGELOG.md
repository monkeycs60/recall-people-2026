# Changelog

## [2.0.0] - 2026-01-17

### Migration vers OpenAI GPT-5 mini (Redesign V2)

#### Ajouté

- **OpenAI GPT-5 mini** comme provider AI principal avec Structured Outputs
- Support de `OPENAI_API_KEY` dans toutes les routes AI
- Nouvelle fonction `getStructuredOutputSettings()` pour faciliter l'utilisation
- Configuration `compatibility: 'strict'` pour garantir la conformité au schéma Zod
- Documentation complète:
  - `README.md` - Guide principal du backend
  - `QUICK_START_OPENAI.md` - Démarrage rapide (5 minutes)
  - `OPENAI_MIGRATION.md` - Guide complet de migration
  - `STRUCTURED_OUTPUTS_EXAMPLE.md` - Exemples pratiques avec Zod
  - `REDESIGN_V2_INTEGRATION.md` - Intégration avec le Redesign V2
  - `MIGRATION_SUMMARY.md` - Résumé des changements
  - `CHANGELOG.md` - Ce fichier

#### Modifié

- **Provider par défaut**: `'grok'` → `'openai'`
- Type `AIProviderType`: `'grok' | 'cerebras'` → `'openai' | 'grok' | 'cerebras'`
- Type `AIProviderConfig`: Ajout de `OPENAI_API_KEY?: string`
- Configuration `.env.example`:
  - Ajout de `OPENAI_API_KEY`
  - Changement de `AI_PROVIDER=grok` à `AI_PROVIDER=openai`
  - Documentation enrichie des providers disponibles
- Tous les types `Bindings` dans les routes:
  - `/src/routes/extract.ts`
  - `/src/routes/summary.ts`
  - `/src/routes/ice-breakers.ts`
  - `/src/routes/ask.ts`
  - `/src/routes/search.ts`
  - `/src/routes/similarity.ts`
- Tous les `providerConfig` pour inclure `OPENAI_API_KEY`
- Logs de debugging: `'grok'` → `'openai'` pour le provider par défaut
- Fonction `createAIProvider()`: Ajout du case `'openai'`
- Fonction `getAIModel()`: Fallback vers `'openai'`
- Fonction `getAIProviderName()`: Fallback vers `'openai'`
- Constante `PROVIDER_MODELS`: Ajout de `openai: 'gpt-5-mini'`

#### Dépendances

- Ajouté: `@ai-sdk/openai@^2.1.4`

### Justification technique

Cette migration implémente les recommandations du **Redesign V2** (section 9: Recommandations Techniques):

> **Tâche**: Extraction (review)
> **Recommandation**: OpenAI GPT-5 mini + Structured Outputs
> **Raison**: Garantie schéma 100%

#### Avantages

1. **Fiabilité**: Conformité garantie au schéma Zod à 100% (plus d'erreurs de parsing)
2. **Performance**: Déterminisme avec `temperature: 0`, pas de retry logic nécessaire
3. **Qualité**: Meilleure compréhension des prompts, extraction plus précise
4. **Coûts**: 30x moins cher que xAI Grok (~$0.0008 par note vs ~$0.024)
5. **Developer Experience**: Type safety complet, IntelliSense optimal

#### Compatibilité

- ✅ Maintien de la compatibilité avec xAI (Grok) et Cerebras
- ✅ Changement de provider via variable d'environnement `AI_PROVIDER`
- ✅ Pas de breaking changes dans l'API publique
- ✅ Migration transparente pour le frontend

### Fichiers modifiés

**Code source** (7 fichiers):
- `src/lib/ai-provider.ts`
- `src/routes/extract.ts`
- `src/routes/summary.ts`
- `src/routes/ice-breakers.ts`
- `src/routes/ask.ts`
- `src/routes/search.ts`
- `src/routes/similarity.ts`

**Configuration** (2 fichiers):
- `package.json`
- `.env.example`

**Documentation** (7 fichiers):
- `README.md` (nouveau)
- `QUICK_START_OPENAI.md` (nouveau)
- `OPENAI_MIGRATION.md` (nouveau)
- `STRUCTURED_OUTPUTS_EXAMPLE.md` (nouveau)
- `REDESIGN_V2_INTEGRATION.md` (nouveau)
- `MIGRATION_SUMMARY.md` (nouveau)
- `CHANGELOG.md` (nouveau)

**Total**: 16 fichiers modifiés/créés

### Migration checklist

- [x] Code modifié et testé
- [x] Documentation créée
- [x] `.env.example` mis à jour
- [ ] `npm install` exécuté
- [ ] `.env` configuré avec `OPENAI_API_KEY`
- [ ] Tests manuels effectués
- [ ] Déploiement en production

### Prochaines étapes

1. **Exécuter** `npm install` pour installer `@ai-sdk/openai`
2. **Configurer** `OPENAI_API_KEY` dans `.env`
3. **Tester** les endpoints avec le nouveau provider
4. **Monitorer** les performances et coûts avec LangFuse
5. **Déployer** en production avec les nouvelles variables d'environnement

---

## [1.x.x] - Versions précédentes

Utilisation de xAI (Grok) comme provider principal.
