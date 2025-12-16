# Contact Page Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refondre la page contact avec Résumé IA, Profil (vue carte), Sujets chauds, et Archive des transcriptions.

**Architecture:**
- Nouvelle table `hot_topics` pour les sujets temporels
- Nouveaux champs `title` sur notes et `ai_summary` sur contacts
- Backend: nouveaux endpoints pour résumé IA et extraction enrichie
- Frontend: composants modulaires pour chaque section

**Tech Stack:** Expo/React Native, SQLite (expo-sqlite), Hono backend, Claude API (@ai-sdk/anthropic)

---

## Phase 1: Base de données et Types

### Task 1: Ajouter les nouvelles colonnes et table

**Files:**
- Modify: `frontend/lib/db.ts:16-97`

**Step 1: Ajouter le champ title aux notes et ai_summary aux contacts**

Dans `initDatabase`, modifier le CREATE TABLE notes:

```typescript
-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  title TEXT,
  audio_uri TEXT,
  audio_duration_ms INTEGER,
  transcription TEXT,
  summary TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);
```

Et ajouter après la table similarity_cache:

```typescript
-- Hot Topics (sujets chauds)
CREATE TABLE IF NOT EXISTS hot_topics (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  title TEXT NOT NULL,
  context TEXT,
  status TEXT DEFAULT 'active',
  source_note_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hot_topics_contact ON hot_topics(contact_id);
CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status);
```

**Step 2: Ajouter les migrations**

Dans `runMigrations`, ajouter:

```typescript
// Check if title column exists on notes
const notesInfo = await database.getAllAsync<{ name: string }>(
  "PRAGMA table_info(notes)"
);
const hasTitle = notesInfo.some((col) => col.name === 'title');
if (!hasTitle) {
  await database.execAsync("ALTER TABLE notes ADD COLUMN title TEXT");
}

// Check if ai_summary column exists on contacts
const hasAiSummary = contactsInfo.some((col) => col.name === 'ai_summary');
if (!hasAiSummary) {
  await database.execAsync("ALTER TABLE contacts ADD COLUMN ai_summary TEXT");
}

// Create hot_topics table if not exists
await database.execAsync(`
  CREATE TABLE IF NOT EXISTS hot_topics (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    title TEXT NOT NULL,
    context TEXT,
    status TEXT DEFAULT 'active',
    source_note_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_hot_topics_contact ON hot_topics(contact_id);
  CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status);
`);
```

**Step 3: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add hot_topics table, title on notes, ai_summary on contacts"
```

---

### Task 2: Mettre à jour les types TypeScript

**Files:**
- Modify: `frontend/types/index.ts`

**Step 1: Ajouter le type HotTopic et mettre à jour FactType**

Après les FactType existants, ajouter les nouvelles catégories:

```typescript
export type FactType =
  | 'work'        // Métier
  | 'company'     // Entreprise
  | 'education'   // Formation
  | 'location'    // Lieu de vie
  | 'origin'      // Origine / Nationalité
  | 'partner'     // Conjoint
  | 'children'    // Enfants
  | 'hobby'       // Loisirs
  | 'sport'       // Sports
  | 'language'    // Langues parlées
  | 'pet'         // Animaux
  | 'birthday'    // Anniversaire
  | 'how_met'     // Comment connu
  | 'where_met'   // Lieu de rencontre
  | 'shared_ref'  // Références communes
  | 'trait'       // Signe distinctif
  | 'gift_idea'   // Idées cadeaux
  | 'gift_given'  // Cadeaux faits
  | 'contact'     // Téléphone, email
  | 'relationship'// Relations familiales (legacy)
  | 'other';

export type HotTopicStatus = 'active' | 'resolved';

export type HotTopic = {
  id: string;
  contactId: string;
  title: string;
  context?: string;
  status: HotTopicStatus;
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};
```

**Step 2: Mettre à jour Note avec title**

```typescript
export type Note = {
  id: string;
  contactId: string;
  title?: string;
  audioUri?: string;
  audioDurationMs?: number;
  transcription?: string;
  summary?: string;
  createdAt: string;
};
```

**Step 3: Mettre à jour Contact avec aiSummary**

```typescript
export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  tags: Tag[];
  highlights: string[];
  aiSummary?: string;
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

**Step 4: Mettre à jour ContactWithDetails**

```typescript
export type ContactWithDetails = Contact & {
  facts: Fact[];
  notes: Note[];
  hotTopics: HotTopic[];
};
```

**Step 5: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): add HotTopic type, extend FactType, add title/aiSummary"
```

---

## Phase 2: Services Frontend

### Task 3: Créer le service hot-topic

**Files:**
- Create: `frontend/services/hot-topic.service.ts`

**Step 1: Créer le service complet**

```typescript
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { HotTopic, HotTopicStatus } from '@/types';

export const hotTopicService = {
  getByContact: async (contactId: string, includeResolved = false): Promise<HotTopic[]> => {
    const db = await getDatabase();
    const query = includeResolved
      ? 'SELECT * FROM hot_topics WHERE contact_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM hot_topics WHERE contact_id = ? AND status = ? ORDER BY created_at DESC';
    const params = includeResolved ? [contactId] : [contactId, 'active'];

    const result = await db.getAllAsync<{
      id: string;
      contact_id: string;
      title: string;
      context: string | null;
      status: string;
      source_note_id: string | null;
      created_at: string;
      updated_at: string;
      resolved_at: string | null;
    }>(query, params);

    return result.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title,
      context: row.context || undefined,
      status: row.status as HotTopicStatus,
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
    }));
  },

  create: async (data: {
    contactId: string;
    title: string;
    context?: string;
    sourceNoteId?: string;
  }): Promise<HotTopic> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO hot_topics (id, contact_id, title, context, status, source_note_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.contactId, data.title, data.context || null, 'active', data.sourceNoteId || null, now, now]
    );

    return {
      id,
      contactId: data.contactId,
      title: data.title,
      context: data.context,
      status: 'active',
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
      updatedAt: now,
    };
  },

  update: async (id: string, data: Partial<{
    title: string;
    context: string;
  }>): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.title) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.context !== undefined) {
      updates.push('context = ?');
      values.push(data.context || null);
    }
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(`UPDATE hot_topics SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  resolve: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?',
      ['resolved', now, now, id]
    );
  },

  reopen: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE hot_topics SET status = ?, resolved_at = NULL, updated_at = ? WHERE id = ?',
      ['active', now, id]
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM hot_topics WHERE id = ?', [id]);
  },
};
```

**Step 2: Commit**

```bash
git add frontend/services/hot-topic.service.ts
git commit -m "feat(services): add hot-topic service"
```

---

### Task 4: Mettre à jour le service note

**Files:**
- Modify: `frontend/services/note.service.ts`

**Step 1: Ajouter title dans getByContact et create**

Modifier `getByContact` pour inclure title:

```typescript
getByContact: async (contactId: string): Promise<Note[]> => {
  const db = await getDatabase();
  const result = await db.getAllAsync<{
    id: string;
    contact_id: string;
    title: string | null;
    audio_uri: string | null;
    audio_duration_ms: number | null;
    transcription: string | null;
    summary: string | null;
    created_at: string;
  }>('SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC', [contactId]);

  return result.map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    title: row.title || undefined,
    audioUri: row.audio_uri || undefined,
    audioDurationMs: row.audio_duration_ms || undefined,
    transcription: row.transcription || undefined,
    summary: row.summary || undefined,
    createdAt: row.created_at,
  }));
},
```

Modifier `create` pour accepter title:

```typescript
create: async (data: {
  contactId: string;
  title?: string;
  audioUri?: string;
  audioDurationMs?: number;
  transcription?: string;
  summary?: string;
}): Promise<Note> => {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO notes (id, contact_id, title, audio_uri, audio_duration_ms, transcription, summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.contactId,
      data.title || null,
      data.audioUri || null,
      data.audioDurationMs || null,
      data.transcription || null,
      data.summary || null,
      now,
    ]
  );

  return {
    id,
    contactId: data.contactId,
    title: data.title,
    audioUri: data.audioUri,
    audioDurationMs: data.audioDurationMs,
    transcription: data.transcription,
    summary: data.summary,
    createdAt: now,
  };
},
```

**Step 2: Commit**

```bash
git add frontend/services/note.service.ts
git commit -m "feat(services): add title support to note service"
```

---

### Task 5: Mettre à jour le service contact

**Files:**
- Modify: `frontend/services/contact.service.ts`

**Step 1: Ajouter aiSummary et hotTopics dans getById**

Modifier la query et le mapping pour inclure ai_summary:

```typescript
getById: async (id: string): Promise<ContactWithDetails | null> => {
  const db = await getDatabase();
  const contactRow = await db.getFirstAsync<{
    id: string;
    first_name: string;
    last_name: string | null;
    nickname: string | null;
    photo_uri: string | null;
    tags: string;
    highlights: string | null;
    ai_summary: string | null;
    last_contact_at: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM contacts WHERE id = ?', [id]);

  if (!contactRow) return null;

  // ... existing facts and notes queries ...

  // Add hot topics query
  const hotTopicsRows = await db.getAllAsync<{
    id: string;
    contact_id: string;
    title: string;
    context: string | null;
    status: string;
    source_note_id: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  }>('SELECT * FROM hot_topics WHERE contact_id = ? ORDER BY created_at DESC', [id]);

  const contact: ContactWithDetails = {
    // ... existing fields ...
    aiSummary: contactRow.ai_summary || undefined,
    // ... existing facts and notes mapping ...
    hotTopics: hotTopicsRows.map((row) => ({
      id: row.id,
      contactId: row.contact_id,
      title: row.title,
      context: row.context || undefined,
      status: row.status as 'active' | 'resolved',
      sourceNoteId: row.source_note_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at || undefined,
    })),
  };

  return contact;
},
```

**Step 2: Ajouter aiSummary dans update**

```typescript
update: async (
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    nickname: string;
    tags: string[];
    highlights: string[];
    aiSummary: string;
    lastContactAt: string;
  }>
): Promise<void> => {
  // ... existing code ...
  if (data.aiSummary !== undefined) {
    updates.push('ai_summary = ?');
    values.push(data.aiSummary || null);
  }
  // ... rest of existing code ...
},
```

**Step 3: Commit**

```bash
git add frontend/services/contact.service.ts
git commit -m "feat(services): add aiSummary and hotTopics to contact service"
```

---

## Phase 3: Backend API

### Task 6: Mettre à jour le schema d'extraction

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Étendre le schema avec les nouvelles catégories et hotTopics**

Remplacer `extractionSchema`:

```typescript
const extractionSchema = z.object({
  contactIdentified: z.object({
    firstName: z.string().describe('Prénom extrait de la transcription'),
    lastName: z.string().nullable().describe('Nom de famille si mentionné'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  noteTitle: z.string().describe('Titre court de 2-4 mots résumant le contexte de la note (ex: "Café rattrapage", "Soirée Marc", "Appel pro")'),
  facts: z.array(
    z.object({
      factType: z.enum([
        'work', 'company', 'education', 'location', 'origin', 'partner',
        'children', 'hobby', 'sport', 'language', 'pet', 'birthday',
        'how_met', 'where_met', 'shared_ref', 'trait', 'gift_idea',
        'gift_given', 'contact', 'relationship', 'other',
      ]),
      factKey: z.string().describe('Label lisible en français'),
      factValue: z.string().describe('La valeur extraite'),
      action: z.enum(['add', 'update']),
      previousValue: z.string().nullable(),
    })
  ),
  hotTopics: z.array(
    z.object({
      title: z.string().describe('Titre court du sujet (ex: "Examen de droit", "Recherche appart")'),
      context: z.string().describe('1-2 phrases de contexte'),
      resolvesExisting: z.string().nullable().describe('Titre du sujet existant que cette info résout, si applicable'),
    })
  ).describe('Sujets temporels/actionnables: projets en cours, événements à venir, situations à suivre'),
});
```

**Step 2: Mettre à jour le prompt d'extraction**

Remplacer `buildExtractionPrompt`:

```typescript
const buildExtractionPrompt = (
  transcription: string,
  currentContact?: ExtractionRequest['currentContact']
): string => {
  const currentContactContext = currentContact
    ? `
CONTACT ACTUELLEMENT SÉLECTIONNÉ:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}
- Infos existantes:
${currentContact.facts.map((fact) => `  • ${fact.factKey}: ${fact.factValue}`).join('\n')}`
    : '';

  return `Tu es un assistant qui extrait des informations structurées à partir de notes vocales en français.
${currentContactContext}

TRANSCRIPTION DE LA NOTE VOCALE:
"${transcription}"

RÈGLES D'EXTRACTION:

1. IDENTIFICATION DU CONTACT:
   - Extrais le prénom COMPLET (Jean-Luc = UN prénom)
   - Nom de famille SEULEMENT si explicitement mentionné

2. TITRE DE LA NOTE:
   - Génère un titre court (2-4 mots) décrivant le contexte
   - Exemples: "Café rattrapage", "Après soirée Marc", "Appel pro", "Déjeuner networking"

3. FACTS (Profil permanent - infos stables):
   Catégories:
   - work: métier/poste (factKey="Métier")
   - company: entreprise (factKey="Entreprise")
   - education: formation/école (factKey="Formation")
   - location: lieu de vie (factKey="Ville")
   - origin: nationalité/origine (factKey="Origine")
   - partner: conjoint (factKey="Conjoint")
   - children: enfants avec prénoms (factKey="Enfants")
   - hobby: loisirs (factKey="Loisir")
   - sport: sports (factKey="Sport")
   - language: langues (factKey="Langue")
   - pet: animaux (factKey="Animal")
   - birthday: anniversaire (factKey="Anniversaire")
   - how_met: comment connu (factKey="Rencontre")
   - where_met: lieu de rencontre (factKey="Lieu rencontre")
   - shared_ref: références communes/inside jokes (factKey="Référence")
   - trait: signe distinctif (factKey="Trait")
   - gift_idea: idées cadeaux (factKey="Idée cadeau")
   - gift_given: cadeaux faits (factKey="Cadeau fait")
   - contact: coordonnées (factKey="Contact")

4. HOT TOPICS (Sujets chauds - temporaires/actionnables):
   - Projets en cours: "Cherche un appart", "Prépare un examen"
   - Événements à suivre: "Mariage prévu en juin"
   - Situations: "Problème au travail", "En recherche d'emploi"

   Si la note RÉSOUT un sujet existant (ex: "Il a eu son examen"),
   indique dans resolvesExisting le titre du sujet clos.

RÈGLES:
- facts = infos PERMANENTES du profil
- hotTopics = situations TEMPORAIRES à suivre
- N'extrais QUE ce qui est EXPLICITEMENT mentionné
- action="add" pour nouvelle info, "update" si modification d'un fact existant`;
};
```

**Step 3: Mettre à jour la réponse formatée**

```typescript
const formattedExtraction = {
  contactIdentified: {
    id: null as string | null,
    firstName: extraction.contactIdentified.firstName,
    lastName: extraction.contactIdentified.lastName,
    confidence: extraction.contactIdentified.confidence,
    needsDisambiguation,
    suggestedMatches,
    suggestedNickname,
  },
  noteTitle: extraction.noteTitle,
  facts: extraction.facts,
  hotTopics: extraction.hotTopics,
  note: {
    summary: extraction.hotTopics.length > 0
      ? extraction.hotTopics.map((topic) => topic.context).join(' ')
      : 'Note vocale enregistrée.',
    keyPoints: extraction.hotTopics.map((topic) => topic.title),
  },
};
```

**Step 4: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(api): extend extraction with hotTopics and noteTitle"
```

---

### Task 7: Créer l'endpoint de génération du résumé IA

**Files:**
- Create: `backend/src/routes/summary.ts`
- Modify: `backend/src/index.ts`

**Step 1: Créer le nouveau fichier de route**

```typescript
import { Hono } from 'hono';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  ANTHROPIC_API_KEY: string;
};

type SummaryRequest = {
  contact: {
    firstName: string;
    lastName?: string;
  };
  facts: Array<{
    factType: string;
    factKey: string;
    factValue: string;
  }>;
  hotTopics: Array<{
    title: string;
    context: string;
    status: string;
  }>;
};

export const summaryRoutes = new Hono<{ Bindings: Bindings }>();

summaryRoutes.use('/*', authMiddleware);

summaryRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<SummaryRequest>();
    const { contact, facts, hotTopics } = body;

    const anthropic = createAnthropic({
      apiKey: c.env.ANTHROPIC_API_KEY,
    });

    const factsText = facts.map((fact) => `${fact.factKey}: ${fact.factValue}`).join('\n');
    const activeTopics = hotTopics.filter((topic) => topic.status === 'active');
    const topicsText = activeTopics.map((topic) => topic.title).join(', ');

    const prompt = `Génère un résumé de 2-3 phrases maximum décrivant cette personne.
Le résumé doit être naturel, comme si tu présentais quelqu'un à un ami.

Prénom: ${contact.firstName}${contact.lastName ? ` ${contact.lastName}` : ''}

Informations connues:
${factsText || 'Aucune information'}

${activeTopics.length > 0 ? `Sujets actuels: ${topicsText}` : ''}

Règles:
- 2-3 phrases maximum
- Commence par le métier/entreprise si connu
- Mentionne un trait personnel (hobby, sport, origine)
- Si pertinent, mentionne comment vous vous êtes rencontrés
- Ton naturel et chaleureux
- Pas de liste, que du texte fluide`;

    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      prompt,
      maxTokens: 200,
    });

    return c.json({
      success: true,
      summary: text.trim(),
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    return c.json({ error: 'Summary generation failed' }, 500);
  }
});
```

**Step 2: Ajouter la route dans index.ts**

Ajouter l'import et le montage:

```typescript
import { summaryRoutes } from './routes/summary';

// ... existing routes ...
app.route('/summary', summaryRoutes);
```

**Step 3: Commit**

```bash
git add backend/src/routes/summary.ts backend/src/index.ts
git commit -m "feat(api): add AI summary generation endpoint"
```

---

## Phase 4: Frontend Components

### Task 8: Créer le composant AISummary

**Files:**
- Create: `frontend/components/contact/AISummary.tsx`

**Step 1: Créer le composant**

```typescript
import { View, Text, ActivityIndicator } from 'react-native';

type AISummaryProps = {
  summary?: string;
  isLoading?: boolean;
};

export function AISummary({ summary, isLoading }: AISummaryProps) {
  if (isLoading) {
    return (
      <View className="bg-surface/50 p-4 rounded-lg mb-4">
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text className="text-textSecondary ml-2">Génération du résumé...</Text>
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View className="bg-surface/30 p-4 rounded-lg mb-4 border border-dashed border-surfaceHover">
        <Text className="text-textMuted text-center italic">
          Ajoutez des notes pour générer un résumé automatique
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-primary/10 p-4 rounded-lg mb-4 border-l-4 border-primary">
      <Text className="text-textPrimary leading-6">{summary}</Text>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/contact/AISummary.tsx
git commit -m "feat(components): add AISummary component"
```

---

### Task 9: Créer le composant ProfileCard

**Files:**
- Create: `frontend/components/contact/ProfileCard.tsx`

**Step 1: Créer le composant**

```typescript
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Fact, FactType } from '@/types';

type ProfileCardProps = {
  facts: Fact[];
  onEditFact: (fact: Fact) => void;
  onDeleteFact: (fact: Fact) => void;
};

const FACT_TYPE_CONFIG: Record<FactType, { label: string; priority: number; singular: boolean }> = {
  work: { label: 'Métier', priority: 1, singular: true },
  company: { label: 'Entreprise', priority: 2, singular: true },
  education: { label: 'Formation', priority: 3, singular: true },
  location: { label: 'Ville', priority: 4, singular: true },
  origin: { label: 'Origine', priority: 5, singular: true },
  partner: { label: 'Conjoint', priority: 6, singular: true },
  children: { label: 'Enfants', priority: 7, singular: false },
  hobby: { label: 'Loisirs', priority: 8, singular: false },
  sport: { label: 'Sports', priority: 9, singular: false },
  language: { label: 'Langues', priority: 10, singular: false },
  pet: { label: 'Animaux', priority: 11, singular: false },
  birthday: { label: 'Anniversaire', priority: 12, singular: true },
  how_met: { label: 'Rencontre', priority: 13, singular: true },
  where_met: { label: 'Lieu rencontre', priority: 14, singular: true },
  shared_ref: { label: 'Références', priority: 15, singular: false },
  trait: { label: 'Traits', priority: 16, singular: false },
  gift_idea: { label: 'Idées cadeaux', priority: 17, singular: false },
  gift_given: { label: 'Cadeaux faits', priority: 18, singular: false },
  contact: { label: 'Contact', priority: 19, singular: false },
  relationship: { label: 'Relations', priority: 20, singular: false },
  other: { label: 'Autre', priority: 99, singular: false },
};

export function ProfileCard({ facts, onEditFact, onDeleteFact }: ProfileCardProps) {
  const [expandedFactId, setExpandedFactId] = useState<string | null>(null);

  const sortedFacts = [...facts].sort((factA, factB) => {
    const configA = FACT_TYPE_CONFIG[factA.factType] || FACT_TYPE_CONFIG.other;
    const configB = FACT_TYPE_CONFIG[factB.factType] || FACT_TYPE_CONFIG.other;
    return configA.priority - configB.priority;
  });

  const primaryFacts = sortedFacts.filter(
    (fact) => ['work', 'company'].includes(fact.factType)
  );
  const secondaryFacts = sortedFacts.filter(
    (fact) => !['work', 'company'].includes(fact.factType)
  );

  const renderFact = (fact: Fact, isPrimary = false) => {
    const config = FACT_TYPE_CONFIG[fact.factType] || FACT_TYPE_CONFIG.other;
    const isExpanded = expandedFactId === fact.id;

    return (
      <View
        key={fact.id}
        className={`bg-surface rounded-lg overflow-hidden ${isPrimary ? 'flex-1' : 'mb-2'}`}
      >
        <Pressable
          className="p-3 flex-row items-start justify-between"
          onPress={() => onEditFact(fact)}
        >
          <View className="flex-1">
            <Text className={`text-textPrimary ${isPrimary ? 'font-semibold text-lg' : 'font-medium'}`}>
              {fact.factValue}
            </Text>
            <Text className="text-textSecondary text-xs mt-0.5">{fact.factKey}</Text>
            {fact.previousValues.length > 0 && (
              <Pressable
                className="flex-row items-center mt-1"
                onPress={() => setExpandedFactId(isExpanded ? null : fact.id)}
              >
                <Text className="text-textMuted text-xs mr-1">
                  {fact.previousValues.length} ancien{fact.previousValues.length > 1 ? 's' : ''}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={12} color="#71717a" />
                ) : (
                  <ChevronDown size={12} color="#71717a" />
                )}
              </Pressable>
            )}
          </View>
          <Pressable className="p-1" onPress={() => onDeleteFact(fact)}>
            <Trash2 size={16} color="#EF4444" />
          </Pressable>
        </Pressable>

        {isExpanded && fact.previousValues.length > 0 && (
          <View className="px-3 pb-3">
            {fact.previousValues.map((prevValue, idx) => (
              <View key={idx} className="flex-row items-center mt-1">
                <View className="w-1.5 h-1.5 rounded-full bg-textMuted mr-2" />
                <Text className="text-textMuted text-sm line-through">{prevValue}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (facts.length === 0) {
    return (
      <View className="bg-surface/30 p-4 rounded-lg border border-dashed border-surfaceHover">
        <Text className="text-textMuted text-center">
          Aucune information de profil
        </Text>
      </View>
    );
  }

  return (
    <View>
      {primaryFacts.length > 0 && (
        <View className="flex-row gap-2 mb-3">
          {primaryFacts.map((fact) => renderFact(fact, true))}
        </View>
      )}
      {secondaryFacts.map((fact) => renderFact(fact, false))}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/contact/ProfileCard.tsx
git commit -m "feat(components): add ProfileCard component with timeline support"
```

---

### Task 10: Créer le composant HotTopicsList

**Files:**
- Create: `frontend/components/contact/HotTopicsList.tsx`

**Step 1: Créer le composant**

```typescript
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { Check, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { HotTopic } from '@/types';

type HotTopicsListProps = {
  hotTopics: HotTopic[];
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { title: string; context?: string }) => void;
};

export function HotTopicsList({
  hotTopics,
  onResolve,
  onReopen,
  onDelete,
  onEdit,
}: HotTopicsListProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContext, setEditContext] = useState('');

  const activeTopics = hotTopics.filter((topic) => topic.status === 'active');
  const resolvedTopics = hotTopics.filter((topic) => topic.status === 'resolved');

  const handleStartEdit = (topic: HotTopic) => {
    setEditingId(topic.id);
    setEditTitle(topic.title);
    setEditContext(topic.context || '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editTitle.trim()) return;
    onEdit(editingId, { title: editTitle.trim(), context: editContext.trim() || undefined });
    setEditingId(null);
  };

  const handleDelete = (topic: HotTopic) => {
    Alert.alert(
      'Supprimer ce sujet',
      `Supprimer "${topic.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onDelete(topic.id) },
      ]
    );
  };

  const renderTopic = (topic: HotTopic) => {
    const isResolved = topic.status === 'resolved';
    const isEditing = editingId === topic.id;

    if (isEditing) {
      return (
        <View key={topic.id} className="bg-surface p-4 rounded-lg mb-2">
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textPrimary font-medium mb-2"
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Titre du sujet"
            placeholderTextColor="#71717a"
          />
          <TextInput
            className="bg-background py-2 px-3 rounded-lg text-textSecondary mb-3"
            value={editContext}
            onChangeText={setEditContext}
            placeholder="Contexte (optionnel)"
            placeholderTextColor="#71717a"
            multiline
          />
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
              onPress={() => setEditingId(null)}
            >
              <Text className="text-textSecondary">Annuler</Text>
            </Pressable>
            <Pressable
              className="flex-1 py-2 rounded-lg bg-primary items-center"
              onPress={handleSaveEdit}
            >
              <Text className="text-white font-semibold">OK</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View
        key={topic.id}
        className={`bg-surface rounded-lg mb-2 overflow-hidden ${isResolved ? 'opacity-60' : ''}`}
      >
        <Pressable
          className="p-4 flex-row items-start"
          onPress={() => handleStartEdit(topic)}
        >
          <View
            className={`w-2.5 h-2.5 rounded-full mt-1.5 mr-3 ${
              isResolved ? 'bg-textMuted' : 'bg-orange-500'
            }`}
          />
          <View className="flex-1">
            <Text className={`font-medium ${isResolved ? 'text-textMuted line-through' : 'text-textPrimary'}`}>
              {topic.title}
            </Text>
            {topic.context && (
              <Text className="text-textSecondary text-sm mt-1">{topic.context}</Text>
            )}
            <Text className="text-textMuted text-xs mt-1">
              {new Date(topic.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isResolved ? (
              <Pressable className="p-2" onPress={() => onReopen(topic.id)}>
                <RotateCcw size={18} color="#8B5CF6" />
              </Pressable>
            ) : (
              <Pressable className="p-2" onPress={() => onResolve(topic.id)}>
                <Check size={18} color="#22C55E" />
              </Pressable>
            )}
            <Pressable className="p-2" onPress={() => handleDelete(topic)}>
              <Trash2 size={18} color="#EF4444" />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View>
      {activeTopics.length === 0 && resolvedTopics.length === 0 && (
        <View className="bg-surface/30 p-4 rounded-lg border border-dashed border-surfaceHover">
          <Text className="text-textMuted text-center">
            Aucun sujet en cours
          </Text>
        </View>
      )}

      {activeTopics.map(renderTopic)}

      {resolvedTopics.length > 0 && (
        <Pressable
          className="flex-row items-center justify-center py-3"
          onPress={() => setShowResolved(!showResolved)}
        >
          <Text className="text-textSecondary text-sm mr-1">
            Voir résolus ({resolvedTopics.length})
          </Text>
          {showResolved ? (
            <ChevronUp size={16} color="#9CA3AF" />
          ) : (
            <ChevronDown size={16} color="#9CA3AF" />
          )}
        </Pressable>
      )}

      {showResolved && resolvedTopics.map(renderTopic)}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/contact/HotTopicsList.tsx
git commit -m "feat(components): add HotTopicsList component"
```

---

### Task 11: Créer le composant TranscriptionArchive

**Files:**
- Create: `frontend/components/contact/TranscriptionArchive.tsx`

**Step 1: Créer le composant**

```typescript
import { View, Text, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, X, Trash2 } from 'lucide-react-native';
import { Note } from '@/types';

type TranscriptionArchiveProps = {
  notes: Note[];
  onDelete: (id: string) => void;
};

export function TranscriptionArchive({ notes, onDelete }: TranscriptionArchiveProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleDelete = (note: Note) => {
    Alert.alert(
      'Supprimer cette transcription',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDelete(note.id);
            setSelectedNote(null);
          },
        },
      ]
    );
  };

  if (notes.length === 0) {
    return null;
  }

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between py-3"
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View className="flex-row items-center">
          <FileText size={18} color="#9CA3AF" />
          <Text className="text-textSecondary ml-2">
            Transcriptions ({notes.length})
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={18} color="#9CA3AF" />
        ) : (
          <ChevronDown size={18} color="#9CA3AF" />
        )}
      </Pressable>

      {isExpanded && (
        <View className="bg-surface/30 rounded-lg overflow-hidden">
          {notes.map((note, index) => (
            <Pressable
              key={note.id}
              className={`flex-row items-center p-3 ${
                index < notes.length - 1 ? 'border-b border-surfaceHover' : ''
              }`}
              onPress={() => setSelectedNote(note)}
            >
              <Text className="text-textMuted mr-2">📝</Text>
              <Text className="text-textSecondary flex-1">
                {new Date(note.createdAt).toLocaleDateString()}
                {note.title && ` — ${note.title}`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Modal
        visible={selectedNote !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedNote(null)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between p-4 border-b border-surfaceHover">
            <View className="flex-1">
              <Text className="text-textPrimary font-semibold">
                {selectedNote?.title || 'Transcription'}
              </Text>
              <Text className="text-textMuted text-sm">
                {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                className="p-2"
                onPress={() => selectedNote && handleDelete(selectedNote)}
              >
                <Trash2 size={20} color="#EF4444" />
              </Pressable>
              <Pressable className="p-2" onPress={() => setSelectedNote(null)}>
                <X size={24} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>
          <ScrollView className="flex-1 p-4">
            <Text className="text-textPrimary leading-6">
              {selectedNote?.transcription || 'Aucune transcription disponible'}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/components/contact/TranscriptionArchive.tsx
git commit -m "feat(components): add TranscriptionArchive component"
```

---

### Task 12: Refondre la page contact

**Files:**
- Modify: `frontend/app/contact/[id].tsx`

**Step 1: Réécrire le composant complet**

Remplacer tout le contenu par la nouvelle version utilisant les nouveaux composants:

```typescript
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '@/hooks/useContacts';
import { ContactWithDetails, Fact } from '@/types';
import { factService } from '@/services/fact.service';
import { hotTopicService } from '@/services/hot-topic.service';
import { noteService } from '@/services/note.service';
import { Edit3 } from 'lucide-react-native';
import { AISummary } from '@/components/contact/AISummary';
import { ProfileCard } from '@/components/contact/ProfileCard';
import { HotTopicsList } from '@/components/contact/HotTopicsList';
import { TranscriptionArchive } from '@/components/contact/TranscriptionArchive';

type EditingFact = {
  id: string;
  factKey: string;
  factValue: string;
};

export default function ContactDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const contactId = params.id as string;

  const { getContactById, deleteContact, updateContact } = useContacts();
  const [contact, setContact] = useState<ContactWithDetails | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState('');
  const [editedLastName, setEditedLastName] = useState('');
  const [editingFact, setEditingFact] = useState<EditingFact | null>(null);

  const loadContact = useCallback(async () => {
    const loaded = await getContactById(contactId);
    setContact(loaded);
    if (loaded) {
      setEditedFirstName(loaded.firstName);
      setEditedLastName(loaded.lastName || '');
    }
  }, [contactId, getContactById]);

  useFocusEffect(
    useCallback(() => {
      loadContact();
    }, [loadContact])
  );

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le contact',
      `Êtes-vous sûr de vouloir supprimer ${contact?.firstName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (contact) {
              await deleteContact(contact.id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!contact || !editedFirstName.trim()) return;
    await updateContact(contact.id, {
      firstName: editedFirstName.trim(),
      lastName: editedLastName.trim() || undefined,
    });
    await loadContact();
    setIsEditingName(false);
  };

  const handleEditFact = (fact: Fact) => {
    setEditingFact({
      id: fact.id,
      factKey: fact.factKey,
      factValue: fact.factValue,
    });
  };

  const handleSaveFact = async () => {
    if (!editingFact) return;
    await factService.update(editingFact.id, {
      factKey: editingFact.factKey,
      factValue: editingFact.factValue,
    });
    await loadContact();
    setEditingFact(null);
  };

  const handleDeleteFact = (fact: Fact) => {
    Alert.alert(
      'Supprimer cette information',
      `Supprimer "${fact.factKey}: ${fact.factValue}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await factService.delete(fact.id);
            await loadContact();
          },
        },
      ]
    );
  };

  const handleResolveHotTopic = async (id: string) => {
    await hotTopicService.resolve(id);
    await loadContact();
  };

  const handleReopenHotTopic = async (id: string) => {
    await hotTopicService.reopen(id);
    await loadContact();
  };

  const handleDeleteHotTopic = async (id: string) => {
    await hotTopicService.delete(id);
    await loadContact();
  };

  const handleEditHotTopic = async (id: string, data: { title: string; context?: string }) => {
    await hotTopicService.update(id, data);
    await loadContact();
  };

  const handleDeleteNote = async (id: string) => {
    await noteService.delete(id);
    await loadContact();
  };

  if (!contact) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-textSecondary">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background px-6"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      {/* Header with name */}
      <View className="mb-6 mt-4">
        {isEditingName ? (
          <View className="bg-surface p-4 rounded-lg">
            <Text className="text-textSecondary text-sm mb-2">Prénom</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={editedFirstName}
              onChangeText={setEditedFirstName}
              placeholder="Prénom"
              placeholderTextColor="#71717a"
            />
            <Text className="text-textSecondary text-sm mb-2">Nom</Text>
            <TextInput
              className="bg-background py-3 px-4 rounded-lg text-textPrimary mb-3"
              value={editedLastName}
              onChangeText={setEditedLastName}
              placeholder="Nom (optionnel)"
              placeholderTextColor="#71717a"
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-lg bg-surfaceHover items-center"
                onPress={() => {
                  setIsEditingName(false);
                  setEditedFirstName(contact.firstName);
                  setEditedLastName(contact.lastName || '');
                }}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-lg bg-primary items-center"
                onPress={handleSaveName}
              >
                <Text className="text-white font-semibold">Enregistrer</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            className="flex-row items-center"
            onPress={() => setIsEditingName(true)}
          >
            <Text className="text-3xl font-bold text-textPrimary mr-3">
              {contact.firstName} {contact.lastName || ''}
            </Text>
            <Edit3 size={20} color="#9CA3AF" />
          </Pressable>
        )}

        {contact.tags && contact.tags.length > 0 && !isEditingName && (
          <View className="flex-row gap-2 mt-3">
            {contact.tags.map((tag) => (
              <View key={tag} className="bg-primary/20 px-3 py-1 rounded">
                <Text className="text-primary">{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {contact.lastContactAt && !isEditingName && (
          <Text className="text-textSecondary mt-2">
            Dernier contact : {new Date(contact.lastContactAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* AI Summary */}
      <AISummary summary={contact.aiSummary} />

      {/* Profile Section */}
      <View className="mb-6">
        <Text className="text-xl font-semibold text-textPrimary mb-3">Profil</Text>
        {editingFact ? (
          <View className="bg-surface p-4 rounded-lg mb-3">
            <TextInput
              className="bg-background py-2 px-3 rounded-lg text-textSecondary text-sm mb-2"
              value={editingFact.factKey}
              onChangeText={(value) => setEditingFact({ ...editingFact, factKey: value })}
              placeholder="Label"
              placeholderTextColor="#71717a"
            />
            <TextInput
              className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-3"
              value={editingFact.factValue}
              onChangeText={(value) => setEditingFact({ ...editingFact, factValue: value })}
              placeholder="Valeur"
              placeholderTextColor="#71717a"
            />
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                onPress={() => setEditingFact(null)}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-2 rounded-lg bg-primary items-center"
                onPress={handleSaveFact}
              >
                <Text className="text-white font-semibold">OK</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ProfileCard
            facts={contact.facts}
            onEditFact={handleEditFact}
            onDeleteFact={handleDeleteFact}
          />
        )}
      </View>

      {/* Hot Topics Section */}
      <View className="mb-6">
        <Text className="text-xl font-semibold text-textPrimary mb-3">Sujets chauds</Text>
        <HotTopicsList
          hotTopics={contact.hotTopics}
          onResolve={handleResolveHotTopic}
          onReopen={handleReopenHotTopic}
          onDelete={handleDeleteHotTopic}
          onEdit={handleEditHotTopic}
        />
      </View>

      {/* Transcriptions Archive */}
      <View className="mb-6">
        <TranscriptionArchive notes={contact.notes} onDelete={handleDeleteNote} />
      </View>

      {/* Delete button */}
      <Pressable
        className="bg-error/20 border border-error py-3 rounded-lg items-center"
        onPress={handleDelete}
      >
        <Text className="text-error font-semibold">Supprimer le contact</Text>
      </Pressable>
    </ScrollView>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/app/contact/[id].tsx
git commit -m "feat(ui): redesign contact page with new sections"
```

---

## Phase 5: Intégration du flow complet

### Task 13: Mettre à jour le flow de review

**Files:**
- Modify: `frontend/app/review.tsx` (si existant, adapter pour sauvegarder noteTitle et hotTopics)

**Step 1: Examiner le fichier review.tsx existant**

Lire le fichier pour comprendre le flow actuel et ajouter la sauvegarde des hotTopics et noteTitle.

**Step 2: Ajouter les appels aux nouveaux services**

Dans le handler de confirmation, ajouter:

```typescript
// Save hot topics
if (extraction.hotTopics && extraction.hotTopics.length > 0) {
  for (const topic of extraction.hotTopics) {
    await hotTopicService.create({
      contactId: contactId,
      title: topic.title,
      context: topic.context,
      sourceNoteId: noteId,
    });
  }
}

// Save note with title
await noteService.create({
  contactId: contactId,
  title: extraction.noteTitle,
  transcription: transcription,
  summary: extraction.note?.summary,
});
```

**Step 3: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): integrate hotTopics and noteTitle saving"
```

---

### Task 14: Déclencher la génération du résumé IA

**Files:**
- Modify: `frontend/app/review.tsx`
- Create: `frontend/lib/api.ts` (ajouter fonction generateSummary si pas existante)

**Step 1: Ajouter la fonction API**

Dans `lib/api.ts`:

```typescript
export const generateSummary = async (
  contact: { firstName: string; lastName?: string },
  facts: Array<{ factType: string; factKey: string; factValue: string }>,
  hotTopics: Array<{ title: string; context: string; status: string }>
): Promise<string> => {
  const response = await fetch(`${API_URL}/summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAuthToken()}`,
    },
    body: JSON.stringify({ contact, facts, hotTopics }),
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.summary;
};
```

**Step 2: Appeler après sauvegarde (en arrière-plan)**

Dans review.tsx, après la confirmation:

```typescript
// Generate AI summary in background (non-blocking)
generateSummary(
  { firstName: contact.firstName, lastName: contact.lastName },
  allFacts,
  allHotTopics
).then(async (summary) => {
  await contactService.update(contactId, { aiSummary: summary });
}).catch((error) => {
  console.warn('Summary generation failed:', error);
});
```

**Step 3: Commit**

```bash
git add frontend/lib/api.ts frontend/app/review.tsx
git commit -m "feat(summary): trigger AI summary generation after note save"
```

---

### Task 15: Tests manuels et ajustements

**Step 1: Lancer l'app et tester le flow complet**

```bash
cd frontend && npx expo start
```

Vérifier:
1. La nouvelle page contact s'affiche correctement
2. Le résumé IA apparaît (ou message placeholder)
3. Le profil en vue carte fonctionne
4. Les sujets chauds s'affichent et peuvent être résolus
5. L'archive des transcriptions s'ouvre/ferme
6. L'enregistrement d'une nouvelle note génère les hotTopics et le titre

**Step 2: Commit final**

```bash
git add -A
git commit -m "feat: complete contact page redesign implementation"
```

---

## Résumé des fichiers modifiés/créés

| Fichier | Action |
|---------|--------|
| `frontend/lib/db.ts` | Modify |
| `frontend/types/index.ts` | Modify |
| `frontend/services/hot-topic.service.ts` | Create |
| `frontend/services/note.service.ts` | Modify |
| `frontend/services/contact.service.ts` | Modify |
| `backend/src/routes/extract.ts` | Modify |
| `backend/src/routes/summary.ts` | Create |
| `backend/src/index.ts` | Modify |
| `frontend/components/contact/AISummary.tsx` | Create |
| `frontend/components/contact/ProfileCard.tsx` | Create |
| `frontend/components/contact/HotTopicsList.tsx` | Create |
| `frontend/components/contact/TranscriptionArchive.tsx` | Create |
| `frontend/app/contact/[id].tsx` | Modify |
| `frontend/app/review.tsx` | Modify |
| `frontend/lib/api.ts` | Modify |
