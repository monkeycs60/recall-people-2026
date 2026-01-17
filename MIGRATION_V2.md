# Migration V2 - Redesign du Schéma SQLite

## Vue d'ensemble

Cette migration transforme le schéma SQLite de Recall People pour s'aligner avec la philosophie V2 : **les notes sont la source de vérité**.

## Changements principaux

### 1. Tables SUPPRIMÉES

Les tables suivantes sont complètement supprimées car elles ne sont plus utilisées :

- `facts` - Les 18 catégories de facts sont remplacées par des notes libres
- `memories` - Redondant avec les notes
- `pending_facts` - Plus nécessaire sans les facts
- `similarity_cache` - Plus nécessaire sans les facts

### 2. Table `contacts` - SIMPLIFIÉE

**Colonnes ajoutées :**
- `relationship_type` (TEXT) - Type de relation : ami, collegue, famille, connaissance
- `suggested_questions` (TEXT) - JSON array de 3 questions max générées par l'IA

**Colonnes supprimées :**
- `tags` - Plus utilisé
- `highlights` - Plus utilisé
- `ice_breakers` - Remplacé par `suggested_questions`

**Colonnes conservées :**
- `id`, `first_name`, `last_name`, `nickname`, `gender`
- `phone`, `email`, `birthday_day`, `birthday_month`, `birthday_year`
- `photo_uri`, `avatar_url`
- `ai_summary`
- `last_contact_at`, `created_at`, `updated_at`

### 3. Table `notes` - SIMPLIFIÉE

**Colonnes conservées :**
- `id`, `contact_id`
- `title` - Titre généré (2-4 mots)
- `transcription` - ÉDITABLE par l'utilisateur
- `audio_uri`, `audio_duration_ms`
- `created_at`

**Colonnes ajoutées :**
- `updated_at` - Pour tracker les modifications

**Colonnes supprimées :**
- `summary` - Plus nécessaire, la transcription est la source de vérité

### 4. Table `hot_topics` - ENRICHIE

**Colonnes existantes (conservées) :**
- `id`, `contact_id`, `title`, `context`, `status`
- `event_date` - Date de l'événement (optionnel)
- `source_note_id`, `created_at`, `updated_at`
- `notified_at`, `birthday_contact_id` - Pour les rappels d'anniversaire

**Colonnes déjà présentes (V1) :**
- `resolution` - Ce qui s'est passé quand résolu
- `resolved_at` - Date de résolution

### 5. Tables CONSERVÉES

- `groups` - Groupes de contacts (optionnel)
- `contact_groups` - Relation many-to-many contacts ↔ groupes

## Migration automatique

La migration est **entièrement automatique** et se déclenche au prochain lancement de l'app.

### Processus de migration

1. **Vérification** : La migration vérifie si elle a déjà été exécutée via la table `migration_markers`

2. **Suppression des tables obsolètes** :
   - Drop `facts` + ses indexes
   - Drop `memories` + ses indexes
   - Drop `pending_facts`
   - Drop `similarity_cache` + ses indexes

3. **Nettoyage des colonnes obsolètes** :
   - Recréation de la table `contacts` sans `tags`, `highlights`, `ice_breakers`
   - Recréation de la table `notes` sans `summary`

4. **Ajout des nouvelles colonnes** :
   - `relationship_type` sur `contacts`
   - `suggested_questions` sur `contacts`
   - `updated_at` sur `notes`

5. **Marqueur de migration** : Insertion d'un marqueur pour éviter de re-exécuter la migration

### Sécurité

- **Idempotente** : La migration peut être exécutée plusieurs fois sans danger
- **Préserve les données** : Les contacts, notes et hot_topics existants sont conservés
- **Pas de perte de données** : Seules les colonnes inutilisées sont supprimées

## Compatibilité

### Données préservées

✅ **CONSERVÉES** :
- Tous les contacts existants
- Toutes les notes existantes
- Tous les hot_topics existants
- Tous les groupes et relations contact-groupe

❌ **PERDUES** (données inutilisées en V2) :
- Les facts des 18 catégories
- Les memories
- Les tags et highlights

### Code impacté

Les composants/services qui utilisaient ces tables doivent être mis à jour :

- `facts` → Utiliser les notes directement
- `memories` → Utiliser les notes directement
- `ice_breakers` → Utiliser `suggested_questions`

## Nouveau schéma (résumé)

```sql
-- Contacts (simplifié)
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

  -- Relation
  relationship_type TEXT DEFAULT 'connaissance',

  -- Avatar
  photo_uri TEXT,
  avatar_url TEXT,

  -- IA (régénérés après chaque note)
  ai_summary TEXT,
  suggested_questions TEXT, -- JSON array

  -- Meta
  last_contact_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notes (source de vérité)
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,

  -- Contenu
  title TEXT,
  transcription TEXT NOT NULL, -- ÉDITABLE

  -- Audio (optionnel)
  audio_uri TEXT,
  audio_duration_ms INTEGER,

  -- Meta
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Hot Topics (actualités à suivre)
CREATE TABLE hot_topics (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,

  -- Contenu
  title TEXT NOT NULL,
  context TEXT,

  -- Date d'événement (optionnel)
  event_date TEXT, -- Format ISO: 2026-01-25

  -- Statut
  status TEXT DEFAULT 'active', -- active, resolved
  resolution TEXT, -- Ce qui s'est passé (quand résolu)
  resolved_at TEXT,

  -- Meta
  source_note_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE SET NULL
);
```

## Rollback

Il n'y a **pas de rollback automatique** prévu. Si vous souhaitez revenir en arrière :

1. Restaurer une sauvegarde de la base de données
2. Réinstaller la version V1 de l'application

**Recommandation** : Tester la migration en environnement de développement avant de déployer en production.

## Tests

La migration a été testée avec :

- Base de données vide (nouvelle installation)
- Base de données avec contacts existants
- Base de données avec notes existantes
- Base de données avec hot_topics existants

Tous les cas de test passent avec succès.

---

**Date de migration** : 17 janvier 2026
**Version** : V2.0
