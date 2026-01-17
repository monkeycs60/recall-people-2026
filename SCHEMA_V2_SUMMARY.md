# Schéma SQLite V2 - Résumé Technique

## Vue d'ensemble

Le schéma V2 simplifie drastiquement la structure de données en se concentrant sur les **notes comme source de vérité**.

## Changements clés

### ✅ Ce qui a été ajouté

**Table `contacts`:**
- `relationship_type` (TEXT) - Type de relation avec le contact
- `suggested_questions` (TEXT) - JSON array de questions suggérées par l'IA

**Table `notes`:**
- `updated_at` (TEXT) - Timestamp de dernière modification

### ❌ Ce qui a été supprimé

**Tables complètes:**
- `facts` - Les 18 catégories de facts
- `memories` - Souvenirs/événements
- `pending_facts` - Facts en attente de validation
- `similarity_cache` - Cache de similarité

**Colonnes:**
- `contacts.tags` - Tags manuels
- `contacts.highlights` - Points saillants
- `contacts.ice_breakers` - Remplacé par `suggested_questions`
- `notes.summary` - Résumé (la transcription est la source)

### 🔄 Ce qui reste inchangé

**Tables conservées:**
- `contacts` - Informations de base sur les contacts
- `notes` - Notes vocales et textuelles
- `hot_topics` - Actualités à suivre
- `groups` - Groupes de contacts
- `contact_groups` - Relation many-to-many

## Nouveau schéma complet

```sql
-- Contacts (V2)
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  nickname TEXT,
  gender TEXT DEFAULT 'unknown',

  -- Contact info
  phone TEXT,
  email TEXT,
  birthday_day INTEGER,
  birthday_month INTEGER,
  birthday_year INTEGER,

  -- Relationship
  relationship_type TEXT DEFAULT 'connaissance',

  -- Avatar
  photo_uri TEXT,
  avatar_url TEXT,

  -- AI-generated
  ai_summary TEXT,
  suggested_questions TEXT, -- JSON array

  -- Meta
  last_contact_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Notes (V2)
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,

  -- Content
  title TEXT,
  transcription TEXT NOT NULL,

  -- Audio
  audio_uri TEXT,
  audio_duration_ms INTEGER,

  -- Meta
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Hot Topics (V2)
CREATE TABLE hot_topics (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,

  -- Content
  title TEXT NOT NULL,
  context TEXT,

  -- Event
  event_date TEXT,

  -- Status
  status TEXT DEFAULT 'active',
  resolution TEXT,
  resolved_at TEXT,

  -- Meta
  source_note_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  -- Legacy (for birthday reminders)
  notified_at TEXT,
  birthday_contact_id TEXT,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE SET NULL
);

-- Groups
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Contact-Group relationship
CREATE TABLE contact_groups (
  contact_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (contact_id, group_id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Migration markers
CREATE TABLE migration_markers (
  key TEXT PRIMARY KEY,
  value TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Types TypeScript (V2)

Les types ont été mis à jour pour refléter le nouveau schéma:

```typescript
// Contact
export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  gender?: Gender;

  // Contact info
  phone?: string;
  email?: string;
  birthdayDay?: number;
  birthdayMonth?: number;
  birthdayYear?: number;

  // Relationship
  relationshipType?: RelationshipType;

  // Avatar
  photoUri?: string;
  avatarUrl?: string;

  // AI-generated
  aiSummary?: string;
  suggestedQuestions?: string[];

  // Meta
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};

// Note
export type Note = {
  id: string;
  contactId: string;
  title?: string;
  transcription: string; // EDITABLE
  audioUri?: string;
  audioDurationMs?: number;
  createdAt: string;
  updatedAt: string;
};

// HotTopic
export type HotTopic = {
  id: string;
  contactId: string;
  title: string;
  context?: string;
  eventDate?: string;
  status: HotTopicStatus;
  resolution?: string;
  resolvedAt?: string;
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
};

// Extraction result
export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    gender?: Gender;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
    suggestedNickname?: string;
    avatarHints?: AvatarHints | null;
  };
  noteTitle: string;
  contactInfo?: ExtractedContactInfo;
  newHotTopics: ExtractedHotTopic[];
  resolvedTopics: ResolvedTopic[];
};
```

## Migration automatique

La migration se déclenche **automatiquement** au prochain lancement de l'app.

### Processus

1. ✅ Vérification du marqueur de migration
2. 🗑️ Suppression des tables obsolètes
3. 🔄 Recréation des tables sans colonnes obsolètes
4. ➕ Ajout des nouvelles colonnes
5. ✅ Marquage de la migration comme terminée

### Sécurité

- **Idempotente** - Peut être exécutée plusieurs fois
- **Préserve les données** - Contacts, notes et hot_topics conservés
- **Pas de rollback** - Sauvegarde recommandée avant migration

## Outils de développement

### Vérifier le statut de la migration

```typescript
import { getDatabaseStatus } from '@/lib/db-utils';

const status = await getDatabaseStatus();
console.log(status);
// {
//   v2Migration: { completed: true, completedAt: '2026-01-17...' },
//   tables: ['contacts', 'notes', 'hot_topics', ...],
//   deprecatedTables: { facts: false, memories: false, ... },
//   counts: { contacts: 42, notes: 128, hotTopics: 15 }
// }
```

### Vérifier les champs V2

```typescript
import { checkV2Fields } from '@/lib/db-utils';

const fields = await checkV2Fields();
console.log(fields);
// {
//   contacts: {
//     hasRelationshipType: true,
//     hasSuggestedQuestions: true,
//     hasTags: false,
//     hasHighlights: false,
//     ...
//   },
//   ...
// }
```

### Exporter la base de données

```typescript
import { exportDatabase } from '@/lib/db-utils';

const backup = await exportDatabase();
// Returns JSON with all data
```

## Compatibilité

### Code à mettre à jour

Les services/composants utilisant les tables supprimées doivent être adaptés:

**Avant (V1):**
```typescript
// Récupérer les facts
const facts = await db.getAllAsync('SELECT * FROM facts WHERE contact_id = ?', [contactId]);

// Récupérer les memories
const memories = await db.getAllAsync('SELECT * FROM memories WHERE contact_id = ?', [contactId]);
```

**Après (V2):**
```typescript
// Utiliser les notes directement
const notes = await db.getAllAsync('SELECT * FROM notes WHERE contact_id = ?', [contactId]);
```

### Types dépréciés

Les types V1 sont marqués `@deprecated` mais conservés pour la compatibilité:
- `Fact`
- `PendingFact`
- `Memory`
- `ExtractedFact`
- `ExtractedMemory`
- `SuggestedGroup`

Ils seront supprimés dans une future version.

## Checklist de migration du code

- [ ] Remplacer les requêtes `facts` par des requêtes `notes`
- [ ] Remplacer les requêtes `memories` par des requêtes `notes`
- [ ] Supprimer les références à `ice_breakers` → utiliser `suggested_questions`
- [ ] Supprimer les références à `tags` et `highlights`
- [ ] Mettre à jour les types d'extraction (remplacer `facts` par `newHotTopics`)
- [ ] Adapter les prompts LLM pour le nouveau format
- [ ] Tester la migration avec des données existantes

## Ressources

- **Schéma complet**: `/home/clement/Desktop/recall-people-2026/frontend/lib/db.ts`
- **Types**: `/home/clement/Desktop/recall-people-2026/frontend/types/index.ts`
- **Utilitaires**: `/home/clement/Desktop/recall-people-2026/frontend/lib/db-utils.ts`
- **Documentation**: `/home/clement/Desktop/recall-people-2026/MIGRATION_V2.md`
- **Design doc**: `/home/clement/Desktop/recall-people-2026/REDESIGN_V2.md`

---

**Date**: 17 janvier 2026
**Version**: V2.0
**Status**: ✅ Ready for development
