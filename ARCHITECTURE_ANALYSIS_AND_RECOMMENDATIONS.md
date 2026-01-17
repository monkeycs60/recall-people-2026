# Analyse Architecture & Recommandations - Recall People

> **Mission** : Permettre de se remémorer facilement la vie des gens, les choses et détails qu'ils nous ont confiés, et les événements à venir dans leur vie.

---

## Table des Matières

1. [État Actuel de l'Architecture](#1-état-actuel-de-larchitecture)
2. [Limites et Points de Faiblesse](#2-limites-et-points-de-faiblesse)
3. [Analyse des LLM & Providers](#3-analyse-des-llm--providers)
4. [Recommandations d'Architecture](#4-recommandations-darchitecture)
5. [Stratégies de Robustesse](#5-stratégies-de-robustesse)
6. [Plan d'Action Priorisé](#6-plan-daction-priorisé)

---

## 1. État Actuel de l'Architecture

### Flow de Traitement

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│  Recording  │───▶│ Transcription│───▶│ Contact Detection│───▶│  Extraction │
│ (Audio/Text)│    │ (Deepgram/   │    │ (Cerebras       │    │ (xAI Grok)  │
│             │    │  Groq)       │    │  Llama 8B)      │    │             │
└─────────────┘    └──────────────┘    └─────────────────┘    └─────────────┘
                                                                     │
                                                                     ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    ┌─────────────┐
│   SQLite    │◀───│    Save      │◀───│  User Review    │◀───│  Structured │
│   Local     │    │              │    │  (Validation)   │    │    Output   │
└─────────────┘    └──────────────┘    └─────────────────┘    └─────────────┘
```

### Points Forts Actuels

| Aspect | Implémentation | Évaluation |
|--------|----------------|------------|
| **Privacy** | Local-first (SQLite), backend stateless | ✅ Excellent |
| **Sécurité prompts** | Wrappers avec tokens aléatoires, sanitization | ✅ Robuste |
| **Catégories** | 18 types de faits + hot topics + memories | ✅ Complet |
| **Review utilisateur** | Écran de validation avant sauvegarde | ✅ Critique et présent |
| **Multi-provider** | Switching facile STT/LLM | ✅ Flexible |
| **Évaluation** | LLM-as-judge avec sampling | ✅ En place |

### Configuration Actuelle

| Endpoint | Provider | Modèle | Coût estimé |
|----------|----------|--------|-------------|
| Transcription | Deepgram / Groq | Nova-3 / Whisper v3 | ~$0.003/min |
| Detection | Cerebras | Llama 3.1 8B | Très faible |
| Extraction | xAI | Grok 4.1 Fast | ~$0.01/req |
| Summary | xAI | Grok 4.1 Fast | ~$0.005/req |

---

## 2. Limites et Points de Faiblesse

### 2.1 Dépendances Critiques au LLM

#### ⚠️ Catégorisation des Faits (RISQUE ÉLEVÉ)

**Problème** : Le LLM doit distinguer entre 18 types de faits + hot topics + memories. Les frontières sont souvent floues.

| Exemple | Classification Attendue | Risque de Confusion |
|---------|------------------------|---------------------|
| "Il fait du tennis tous les dimanches" | `hobby` ou `sport` | Moyen |
| "Son fils commence le foot" | `children` (avec détail) | Faible |
| "Il déménage à Lyon en mars" | Hot topic (temporaire) OU `location` (permanent) | **Élevé** |
| "Elle a eu une promotion" | Hot topic OU `work` ? | **Élevé** |
| "On a fait du ski ensemble" | `memory` OU `hobby` ? | **Élevé** |

**Impact** : Données mal classées = difficiles à retrouver, UX dégradée.

#### ⚠️ Calcul des Dates (RISQUE MOYEN-ÉLEVÉ)

**Problème** : Le LLM doit convertir "dans 3 semaines", "mardi prochain", "fin janvier" en dates absolues.

```
"Son anniversaire c'est fin janvier"
→ Attendu: 25/01/2026 (estimation)
→ Risque: 31/01/2026, 30/01/2026, ou hallucination

"Il part en vacances la semaine prochaine"
→ Si dit le mercredi 15/01, "semaine prochaine" = 20-26/01
→ Risque: LLM interprète différemment selon le contexte
```

**Impact** : Rappels au mauvais moment = perte de confiance utilisateur.

#### ⚠️ Détection de Résolution des Hot Topics (RISQUE ÉLEVÉ)

**Problème** : Détecter quand un sujet précédemment mentionné est résolu ET extraire les détails.

```
Note 1: "Marie cherche un nouvel appart"
→ Hot topic créé: "Recherche appartement"

Note 2: "Marie a finalement trouvé un 3 pièces à Belleville"
→ Attendu: Résoudre le hot topic avec "3 pièces à Belleville"
→ Risque: Créer un NOUVEAU hot topic au lieu de résoudre l'ancien
```

**Impact** : Accumulation de hot topics non résolus, données incohérentes.

#### ⚠️ Hallucinations (RISQUE CRITIQUE)

**Problème** : Le LLM peut inventer des informations non présentes dans la transcription.

```
Transcription: "Paul travaille dans la tech"
→ Risque d'hallucination: "Paul travaille chez Google en tant que développeur senior"
```

**Mitigations actuelles** :
- Prompts avec instructions strictes ✅
- Security wrappers ✅
- User review ✅
- Mais: toujours possible si l'utilisateur ne fait pas attention

### 2.2 Problèmes de Consistance

#### Variabilité des Outputs

Même input → outputs différents selon :
- Le modèle utilisé
- La température (actuellement non fixée à 0)
- Le contexte précédent
- La charge du provider

#### Dépendance aux Prompts Longs

Le prompt d'extraction fait **485 lignes**. Problèmes :
- Difficile à maintenir
- Risque de contradictions internes
- Coût token élevé
- Performance dégradée sur certains modèles

### 2.3 Fragilités Opérationnelles

| Problème | Impact | Probabilité |
|----------|--------|-------------|
| Provider down (xAI, Cerebras) | App inutilisable | Moyenne |
| Changement de pricing | Coûts imprévus | Élevée |
| Deprecation de modèle | Migration forcée | Certaine |
| Rate limiting | Expérience dégradée | Moyenne |

---

## 3. Analyse des LLM & Providers

### 3.1 Comparatif Providers pour Extraction Structurée

| Provider/Modèle | Coût/10K extractions | Vitesse (tok/s) | Structured Output | Fiabilité |
|-----------------|---------------------|-----------------|-------------------|-----------|
| **Gemini 2.0 Flash** | ~$1.09 | 120 | Native JSON Schema | ⭐⭐⭐⭐ |
| **GPT-4o-mini** | ~$2.18 | 85 | 100% avec Structured Outputs API | ⭐⭐⭐⭐⭐ |
| **Mistral Small 3** | ~$1.25 | 150 | Bon | ⭐⭐⭐⭐ |
| **Groq (Llama 3.3 70B)** | ~$5.42 | 1660 | Via JSON mode | ⭐⭐⭐ |
| **Claude 3.5 Haiku** | ~$16.50 | 23 | Bon | ⭐⭐⭐⭐⭐ |
| **xAI Grok (actuel)** | ~$3-5 | ~80 | Bon | ⭐⭐⭐⭐ |

### 3.2 Recommandations par Use Case

#### Extraction Principale → **GPT-4o-mini** (Recommandé)

**Pourquoi** :
- **100% de conformité schéma** avec Structured Outputs API (aucun autre n'offre cette garantie)
- Excellent rapport qualité/prix
- API stable et mature
- Grande communauté, beaucoup de ressources

**Alternative économique** : Gemini 2.0 Flash (2x moins cher, 95%+ fiabilité)

#### Detection Contact → **Garder Cerebras Llama 3.1 8B** ✅

**Pourquoi** :
- Tâche simple (identification de nom)
- Ultra rapide et quasi gratuit
- Suffisamment fiable pour cette tâche

#### Transcription → **Groq Whisper v3 Turbo** (Recommandé)

**Pourquoi** :
- 8x plus rapide que Whisper v3 standard
- Qualité quasi équivalente
- Meilleur que Deepgram pour le français

### 3.3 Architecture Multi-Provider Recommandée

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION RECOMMANDÉE                   │
├─────────────────────────────────────────────────────────────────┤
│  TRANSCRIPTION                                                   │
│  ├── Primary: Groq Whisper v3 Turbo (rapide, bon français)      │
│  └── Fallback: Deepgram Nova-3                                  │
├─────────────────────────────────────────────────────────────────┤
│  DETECTION CONTACT                                               │
│  ├── Primary: Cerebras Llama 3.1 8B (actuel, garder)            │
│  └── Fallback: GPT-4o-mini                                      │
├─────────────────────────────────────────────────────────────────┤
│  EXTRACTION STRUCTURÉE                                           │
│  ├── Primary: OpenAI GPT-4o-mini + Structured Outputs           │
│  └── Fallback: Gemini 2.0 Flash                                 │
├─────────────────────────────────────────────────────────────────┤
│  SUMMARY / ICE-BREAKERS                                          │
│  ├── Primary: GPT-4o-mini (ou garder Grok)                      │
│  └── Fallback: Claude 3.5 Haiku (meilleure qualité rédaction)   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Estimation Coûts Mensuels

**Hypothèse** : 1000 utilisateurs actifs, 5 notes/jour/utilisateur

| Composant | Actuel (Grok/Cerebras) | Recommandé (GPT-4o-mini) |
|-----------|------------------------|--------------------------|
| Transcription | ~$150/mois | ~$100/mois (Groq) |
| Detection | ~$5/mois | ~$5/mois |
| Extraction | ~$200/mois | ~$100/mois |
| Summary | ~$50/mois | ~$50/mois |
| **TOTAL** | **~$405/mois** | **~$255/mois** |

---

## 4. Recommandations d'Architecture

### 4.1 Utiliser les Structured Outputs d'OpenAI

**Changement majeur recommandé** : Migrer l'extraction vers GPT-4o-mini avec Structured Outputs.

**Avant (actuel)** :
```typescript
// Prompt de 485 lignes avec instructions JSON
const response = await ai.complete({
  messages: [{ role: 'user', content: longPrompt }],
});
const parsed = JSON.parse(response); // Peut échouer
```

**Après (recommandé)** :
```typescript
import { zodResponseFormat } from 'openai/helpers/zod';

const ExtractionSchema = z.object({
  noteTitle: z.string().max(30),
  contactInfo: z.object({
    phone: z.string().nullable(),
    email: z.string().email().nullable(),
    birthday: z.object({
      day: z.number().min(1).max(31),
      month: z.number().min(1).max(12),
      year: z.number().nullable(),
    }).nullable(),
  }),
  facts: z.array(z.object({
    factType: z.enum(['work', 'company', 'education', /* ... */]),
    factKey: z.string(),
    factValue: z.string(),
    action: z.enum(['add', 'update']),
  })),
  // ... reste du schéma
});

const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  response_format: zodResponseFormat(ExtractionSchema, 'extraction'),
});

// Garanti d'être valide selon le schéma
const extraction = response.choices[0].message.parsed;
```

**Avantages** :
- ✅ 100% de conformité schéma (vs ~80-90% avec JSON mode)
- ✅ Validation automatique des types
- ✅ Pas de parsing JSON manuel qui peut échouer
- ✅ Meilleure gestion des enums (factType limité aux valeurs valides)

### 4.2 Pipeline Multi-Étapes

**Problème actuel** : Un seul appel LLM fait tout (detection + extraction + catégorisation).

**Recommandation** : Diviser en étapes spécialisées.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         PIPELINE MULTI-ÉTAPES                              │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ÉTAPE 1: EXTRACTION BRUTE (GPT-4o-mini)                                 │
│  ├── Input: Transcription seule                                          │
│  ├── Output: Liste de faits bruts sans catégorisation                    │
│  └── Prompt: Court, focalisé sur l'extraction                            │
│                                                                           │
│  ÉTAPE 2: CATÉGORISATION (GPT-4o-mini ou règles)                         │
│  ├── Input: Faits bruts + contexte existant du contact                   │
│  ├── Output: Faits catégorisés (factType assigné)                        │
│  └── Prompt: Focalisé sur la classification avec exemples                │
│                                                                           │
│  ÉTAPE 3: DÉTECTION HOT TOPICS (GPT-4o-mini)                             │
│  ├── Input: Faits + hot topics existants                                 │
│  ├── Output: Nouveaux hot topics + résolutions                           │
│  └── Prompt: Focalisé sur temporel vs permanent                          │
│                                                                           │
│  ÉTAPE 4: VALIDATION (Règles + LLM)                                      │
│  ├── Vérification croisée avec source                                    │
│  ├── Détection d'hallucinations potentielles                             │
│  └── Score de confiance par champ                                        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

**Avantages** :
- Chaque étape a un prompt court et focalisé
- Plus facile à débugger et améliorer
- Possibilité d'utiliser des modèles différents par étape
- Recherche montre : **+9% de qualité à 1/25 du coût** avec pipelines multi-étapes

**Inconvénients** :
- Latence additionnelle (mais parallélisable en partie)
- Complexité de code accrue

### 4.3 Validation et Détection d'Hallucinations

#### Méthode ChatExtract (90% de précision)

Ajouter une étape de **vérification par questions** :

```typescript
// Après extraction
const verificationPrompt = `
Basé sur cette transcription:
"${transcription}"

Le système a extrait les faits suivants:
${JSON.stringify(extractedFacts)}

Pour chaque fait, réponds:
1. Ce fait est-il EXPLICITEMENT mentionné dans la transcription? (oui/non)
2. Si non, quelle partie est une inférence ou hallucination?

Format JSON:
{
  "verifications": [
    { "factIndex": 0, "isExplicit": true/false, "issue": "..." }
  ]
}
`;
```

#### Scoring de Confiance

Assigner un score de confiance à chaque extraction :

```typescript
interface ExtractedFact {
  factType: FactType;
  factValue: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason?: string; // "Explicitly stated" | "Inferred from context"
}
```

Afficher le niveau de confiance dans l'UI de review pour alerter l'utilisateur.

### 4.4 Few-Shot Examples Dynamiques

**Problème** : Le prompt actuel a des exemples statiques. Ils ne couvrent pas tous les edge cases.

**Solution** : Banque d'exemples avec sélection dynamique.

```typescript
// Banque d'exemples par catégorie
const exampleBank = {
  dateCalculation: [
    { input: "dans 3 semaines", context: "dit le 15/01", output: "05/02" },
    { input: "mardi prochain", context: "dit le mercredi", output: "mardi suivant" },
    // ...
  ],
  hotTopicVsFact: [
    { input: "Il déménage à Lyon", output: "hot_topic", reason: "En cours" },
    { input: "Il habite à Lyon", output: "fact:location", reason: "État actuel" },
    // ...
  ],
  // ...
};

// Sélectionner les exemples pertinents basé sur le contenu
function selectExamples(transcription: string): Example[] {
  const examples = [];
  if (containsDateExpression(transcription)) {
    examples.push(...exampleBank.dateCalculation.slice(0, 2));
  }
  if (containsTransitionVerbs(transcription)) {
    examples.push(...exampleBank.hotTopicVsFact.slice(0, 2));
  }
  return examples.slice(0, 5); // Max 5 exemples
}
```

---

## 5. Stratégies de Robustesse

### 5.1 Fallback Automatique

```typescript
interface ProviderConfig {
  primary: Provider;
  fallback: Provider;
  timeout: number;
  maxRetries: number;
}

async function extractWithFallback(
  transcription: string,
  config: ProviderConfig
): Promise<Extraction> {
  try {
    return await withTimeout(
      extract(transcription, config.primary),
      config.timeout
    );
  } catch (error) {
    console.warn(`Primary failed: ${error.message}, trying fallback`);
    return await extract(transcription, config.fallback);
  }
}
```

### 5.2 Retry avec Feedback

```typescript
async function extractWithRetry(
  transcription: string,
  maxRetries: number = 3
): Promise<Extraction> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await extract(transcription);
      const validation = await validate(result, transcription);

      if (validation.isValid) {
        return result;
      }

      // Retry avec le feedback de validation
      transcription = `${transcription}\n\nNote: Previous extraction had issues: ${validation.errors.join(', ')}`;

    } catch (error) {
      lastError = error;
      await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

### 5.3 Temperature = 0

**Changement simple mais important** : Forcer `temperature: 0` pour toutes les extractions.

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  temperature: 0, // CRITIQUE: Output déterministe
  response_format: zodResponseFormat(ExtractionSchema, 'extraction'),
});
```

### 5.4 Circuit Breaker pour Providers

```typescript
class ProviderCircuitBreaker {
  private failures: number = 0;
  private lastFailure: Date | null = null;
  private readonly threshold = 5;
  private readonly resetTime = 60000; // 1 minute

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure!.getTime() < this.resetTime) {
        return true;
      }
      this.reset();
    }
    return false;
  }
}
```

### 5.5 Monitoring et Alertes

Métriques à tracker :

| Métrique | Seuil d'alerte | Action |
|----------|----------------|--------|
| Taux d'échec extraction | > 5% | Switch provider |
| Latence P95 | > 10s | Vérifier provider |
| Coût journalier | > budget × 1.5 | Alerter + throttle |
| Score qualité moyen | < 7/10 | Review prompts |
| Hallucinations détectées | > 2% | Review + fix |

---

## 6. Plan d'Action Priorisé

### Phase 1 : Quick Wins (1-2 semaines)

| Action | Impact | Effort | Priorité |
|--------|--------|--------|----------|
| ✅ Ajouter `temperature: 0` partout | Élevé | Faible | **P0** |
| ✅ Migrer vers GPT-4o-mini + Structured Outputs | Élevé | Moyen | **P0** |
| ✅ Implémenter fallback provider | Moyen | Faible | **P1** |
| ✅ Ajouter métriques de monitoring | Moyen | Faible | **P1** |

### Phase 2 : Améliorations Structurelles (2-4 semaines)

| Action | Impact | Effort | Priorité |
|--------|--------|--------|----------|
| 🔄 Pipeline multi-étapes | Élevé | Élevé | **P1** |
| 🔄 Validation ChatExtract | Élevé | Moyen | **P1** |
| 🔄 Scoring de confiance | Moyen | Moyen | **P2** |
| 🔄 Few-shot dynamiques | Moyen | Moyen | **P2** |

### Phase 3 : Optimisation Continue (Ongoing)

| Action | Impact | Effort | Priorité |
|--------|--------|--------|----------|
| 📊 A/B testing prompts | Moyen | Moyen | **P2** |
| 📊 Analyse erreurs utilisateurs | Élevé | Faible | **P1** |
| 📊 Fine-tuning si volume suffisant | Élevé | Élevé | **P3** |
| 📊 Évaluation continue qualité | Moyen | Faible | **P1** |

---

## Annexe A : Checklist Migration GPT-4o-mini

```markdown
- [ ] Créer compte OpenAI API (si pas déjà fait)
- [ ] Définir schémas Zod pour toutes les extractions
- [ ] Implémenter client OpenAI avec Structured Outputs
- [ ] Adapter les prompts (plus courts, focalisés)
- [ ] Tester sur échantillon de notes existantes
- [ ] Comparer qualité vs solution actuelle
- [ ] Implémenter fallback vers Gemini
- [ ] Déployer en A/B test (10% trafic)
- [ ] Monitor métriques pendant 1 semaine
- [ ] Rollout complet si métriques OK
```

## Annexe B : Schéma Zod Recommandé

```typescript
import { z } from 'zod';

const FactTypeEnum = z.enum([
  'work', 'company', 'education', 'location', 'origin',
  'partner', 'children', 'hobby', 'sport', 'language',
  'pet', 'how_met', 'where_met', 'shared_ref', 'trait',
  'gift_idea', 'gift_given', 'relationship', 'other'
]);

const ExtractedFactSchema = z.object({
  factType: FactTypeEnum,
  factKey: z.string().describe('Identificateur court du fait'),
  factValue: z.string().describe('Valeur extraite de la transcription'),
  title: z.string().nullable().describe('Titre pour type "other" uniquement'),
  action: z.enum(['add', 'update']),
  previousValue: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
});

const HotTopicSchema = z.object({
  title: z.string().max(50),
  context: z.string().describe('Détails et contexte'),
  suggestedDate: z.string().nullable().describe('Format DD/MM/YYYY'),
  isNew: z.boolean().describe('true si nouveau, false si résolution'),
  resolvesTopicId: z.string().nullable().describe('ID du topic résolu'),
  resolution: z.string().nullable().describe('Détails de la résolution'),
});

const MemorySchema = z.object({
  description: z.string(),
  eventDate: z.string().nullable(),
  isShared: z.boolean().describe('true si vécu ensemble'),
});

export const ExtractionSchema = z.object({
  noteTitle: z.string().max(30).describe('2-4 mots résumant la note'),
  contactInfo: z.object({
    phone: z.string().nullable(),
    email: z.string().nullable(),
    birthday: z.object({
      day: z.number().min(1).max(31),
      month: z.number().min(1).max(12),
      year: z.number().nullable(),
    }).nullable(),
  }),
  facts: z.array(ExtractedFactSchema),
  hotTopics: z.array(HotTopicSchema),
  resolvedTopics: z.array(z.object({
    id: z.string(),
    resolution: z.string(),
  })),
  memories: z.array(MemorySchema),
});
```

## Annexe C : Ressources

### Documentation
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Gemini JSON Schema](https://ai.google.dev/gemini-api/docs/json-mode)
- [Zod Documentation](https://zod.dev/)

### Papers & Articles
- [ChatExtract: 90% accuracy with verification questions](https://www.nature.com/articles/s41467-024-45914-8)
- [Multi-stage pipelines: 9% better at 1/25th cost](https://www.emergentmind.com/topics/multi-stage-llm-based-classification-pipeline)
- [Hallucination rates 2021-2026](https://masterofcode.com/blog/hallucinations-in-llms-what-you-need-to-know-before-integration)

### Benchmarks
- [Artificial Analysis - Model comparisons](https://artificialanalysis.ai/)
- [LLM Pricing Comparison](https://llm-price.com/)

---

*Document généré le 17 janvier 2026*
*Basé sur l'analyse de l'architecture actuelle et la recherche des meilleures pratiques 2024-2026*
