# Semantic Search Feature Design

## Overview

Replace the "Réseau" (Network) tab with a "Recherche" (Search) tab that allows natural language queries across contacts with semantic understanding.

**Examples:**
- "je cherche quel instrument joue Joel" → "Joel joue du trombone" (ref: inscrit à la symphonie)
- "je cherche un contact qui aime les sports de combat" → "Niko fait de la boxe"

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React Native)               │
├─────────────────────────────────────────────────────────┤
│  SearchTab.tsx                                           │
│  ├── SearchInput (barre de recherche)                   │
│  ├── SearchResults (liste des résultats)                │
│  └── SearchResultItem (contact + fact + référence)      │
├─────────────────────────────────────────────────────────┤
│  useSemanticSearch() hook                                │
│  ├── Collecte facts/memories/notes localement (SQLite)  │
│  ├── Envoie au backend pour analyse LLM                 │
│  └── Retourne résultats structurés                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Hono/Node/Coolify)             │
├─────────────────────────────────────────────────────────┤
│  POST /api/search                                        │
│  ├── Reçoit: query + facts[] + memories[] + notes[]     │
│  ├── Prompt XAI grok-4-1-fast                           │
│  └── Retourne: SearchResult[] trié par pertinence       │
└─────────────────────────────────────────────────────────┘
```

## Data Model

```typescript
// Request sent to backend
type SearchRequest = {
  query: string;
  facts: Array<{
    id: string;
    contactId: string;
    contactName: string;
    factType: FactType;
    factKey: string;
    factValue: string;
  }>;
  memories: Array<{
    id: string;
    contactId: string;
    contactName: string;
    description: string;
    eventDate?: string;
  }>;
  notes: Array<{
    id: string;
    contactId: string;
    contactName: string;
    transcription: string;
  }>;
};

// Result returned
type SearchResult = {
  contactId: string;
  contactName: string;
  answer: string;           // "Joel joue du trombone"
  reference: string;        // "Inscrit à la symphonie"
  sourceType: 'fact' | 'memory' | 'note';
  sourceId: string;         // ID of fact/memory/note
  relevanceScore: number;   // 0-100
};

type SearchResponse = {
  results: SearchResult[];
  processingTimeMs: number;
};
```

## LLM Prompt Structure

```typescript
const buildSearchPrompt = (query: string, data: SearchRequest) => `
Tu es un assistant de recherche dans un carnet de contacts personnel.

REQUÊTE UTILISATEUR: "${query}"

INSTRUCTIONS:
1. Trouve TOUS les résultats pertinents pour la requête
2. Utilise la compréhension sémantique (ex: "sports de combat" = boxe, MMA, judo...)
3. Priorise: FACT > MEMORY > NOTE à pertinence égale
4. Score de 0-100 basé sur la pertinence

Réponds en JSON:
{
  "results": [
    {
      "contactId": "...",
      "contactName": "...",
      "answer": "réponse concise à la requête",
      "reference": "contexte/source de l'info",
      "sourceType": "fact|memory|note",
      "sourceId": "ID entre crochets",
      "relevanceScore": 85
    }
  ]
}

Si aucun résultat pertinent, retourne {"results": []}

DONNÉES DISPONIBLES:

=== FACTS (infos structurées, priorité haute) ===
${data.facts.map(f =>
  `[FACT:${f.id}] ${f.contactName} - ${f.factKey}: ${f.factValue}`
).join('\n')}

=== MEMORIES (événements, priorité moyenne) ===
${data.memories.map(m =>
  `[MEMORY:${m.id}] ${m.contactName} - ${m.description} (${m.eventDate || 'date inconnue'})`
).join('\n')}

=== NOTES (transcriptions brutes, priorité basse) ===
${data.notes.map(n =>
  `[NOTE:${n.id}] ${n.contactName} - ${n.transcription.slice(0, 200)}...`
).join('\n')}
`;
```

## UI Design

```
┌─────────────────────────────────────────┐
│  🔍 [____Rechercher un contact____]     │  ← Input with icon
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🎵 Joel Dupont           95%    │    │  ← ResultItem
│  │ Joue du trombone                │    │
│  │ 📎 Inscrit à la symphonie       │    │  ← Reference
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🥊 Niko Martin            87%   │    │
│  │ Pratique la boxe                │    │
│  │ 📎 Fait de la boxe thaï         │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

**UI States:**
1. **Empty** - Placeholder inviting to search
2. **Loading** - Skeleton animation + rotating text
3. **Results** - List of results
4. **No results** - "No results" message + suggestions

## Files to Create/Modify

```
frontend/
├── app/(tabs)/
│   ├── _layout.tsx          # Modify tab config
│   ├── network.tsx          # Delete
│   └── search.tsx           # New
├── components/
│   └── search/
│       ├── SearchInput.tsx
│       ├── SearchResults.tsx
│       ├── SearchResultItem.tsx
│       └── SearchSkeleton.tsx
├── hooks/
│   └── useSemanticSearch.ts
├── services/
│   └── search.service.ts
└── types/
    └── index.ts             # Add Search types

backend/
└── src/routes/
    └── search.ts            # New endpoint
```

## Technical Decisions

- **LLM Model:** XAI grok-4-1-fast (already used elsewhere)
- **Latency target:** 1-3 seconds
- **Priority:** facts > memories > notes (at equal relevance)
- **Navigation:** Click result → open contact page
