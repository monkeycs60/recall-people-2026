# Design : AI Summary basé sur les transcriptions

**Date** : 2025-12-29
**Statut** : Validé

## Contexte et problème

Le summary AI actuel se base sur les **facts** extraits (ex: `Ville = Amiens`). Problème : les facts sont décontextualisés, ce qui amène le LLM à halluciner le contexte manquant (ex: "originaire d'Amiens" alors qu'il "habite à Amiens").

Les transcriptions contiennent le contexte exact et les nuances de la conversation.

## Solution

Générer le summary à partir des **transcriptions** avec une approche incrémentale :
- Summary existant + dernière transcription → nouveau summary
- Première note : uniquement la transcription → summary initial

## Architecture

### Flux global

```
┌──────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                │
├──────────────────────────────────────────────────────────────────┤
│  1. Récupère contact.aiSummary depuis SQLite local               │
│  2. Appelle /extract avec { transcription, existingSummary, ...} │
│  3. Reçoit { facts, ..., summary: { text, changed } }            │
│  4. Si changed: update contact.aiSummary dans SQLite local       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                           BACKEND                                 │
├──────────────────────────────────────────────────────────────────┤
│  /extract reçoit: { transcription, existingSummary, language }   │
│     → LLM #1: extraction (existant)                              │
│     → LLM #2: summary (Llama 3.1 8B via Cerebras)                │
│     → Retourne tout (pas de persistance côté backend)            │
└──────────────────────────────────────────────────────────────────┘
```

### Endpoint /extract enrichi

**Entrée (ajouts) :**
```typescript
{
  transcription: string,
  existingSummary: string | null,  // envoyé par le frontend
  language: 'fr' | 'en' | 'es' | 'it' | 'de',
  // ... autres champs existants
}
```

**Sortie (ajout) :**
```typescript
{
  facts: [...],
  memories: [...],
  events: [...],
  hotTopics: [...],
  resolvedTopics: [...],
  // NOUVEAU
  summary: {
    text: string,
    changed: boolean
  }
}
```

### Prompt LLM Summary

```
Tu es un assistant qui maintient un résumé concis d'une personne.

CONTEXTE :
- Résumé actuel : {existingSummary ?? "Aucun"}
- Nouvelle transcription : {transcription}

TÂCHE :

Si aucun résumé actuel :
→ Génère un résumé à partir des informations de la transcription,
  même si elles sont limitées.

Si résumé existant :
→ Analyse si la nouvelle transcription apporte des infos significatives
→ Si oui : mets à jour le résumé en intégrant les nouvelles infos
→ Si non : retourne le résumé existant tel quel

RÈGLES :
- 3-4 phrases maximum
- Ne jamais inventer d'informations absentes de la transcription
- Conserver les infos importantes du résumé existant
- Ton neutre et factuel
- Langue : {language}

SORTIE (JSON) :
{
  "summary": "...",
  "changed": true/false
}
```

**Valeurs de `changed` :**
- Première note (pas de résumé existant) → `changed: true`
- Résumé existant modifié → `changed: true`
- Résumé existant inchangé → `changed: false`

### Stockage (SQLite local)

Ajouter un champ à la table `Contact` côté frontend :

```sql
ALTER TABLE Contact ADD COLUMN aiSummary TEXT;
```

### Modèle LLM

- **Modèle** : Llama 3.1 8B
- **Provider** : Cerebras
- **Justification** : Rapide, peu coûteux, suffisant pour 3-4 phrases

## Décisions récapitulatives

| Élément | Décision |
|---------|----------|
| Déclencheur | Chaque nouvelle note |
| Input LLM | `existingSummary` + `transcription` + `language` |
| Output LLM | `{ summary, changed }` |
| Modèle | Llama 3.1 8B via Cerebras |
| Longueur | 3-4 phrases |
| Stockage | SQLite local (phone) |
| Persistance | Frontend, seulement si `changed: true` |
| Langue | Setting global de l'utilisateur |
| Endpoint | `/extract` enrichi (chaîne 2 LLM en interne) |

## Nettoyage

**À supprimer :**
- `/routes/summary.ts` — endpoint complet
- Appels frontend à `/summary`
- `evaluateSummary` dans `evaluators.ts` — à adapter ou supprimer

## Principes respectés

- **Local-first** : données utilisateur stockées sur le device
- **Backend stateless** : traite les requêtes sans persister les données utilisateur
- **Privacy** : l'utilisateur garde le contrôle de ses données
