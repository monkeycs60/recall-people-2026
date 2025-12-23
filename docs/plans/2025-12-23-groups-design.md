# Système de Groupes pour Contacts

## Contexte

Remplacer le système de `tags` actuel (enum fixe inutilisé) par un système de groupes dynamiques créés par l'utilisateur. Permet de catégoriser les contacts de manière flexible (ex: "Affilae", "Running club", "Promo 2018").

## Architecture

### Structure de données

Nouvelle table `groups` + table de liaison `contact_groups` :

```sql
-- Table des groupes (unique par utilisateur)
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Table de liaison contact <-> groupe
CREATE TABLE contact_groups (
  contact_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (contact_id, group_id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);
```

**Note :** Supprimer le champ `tags` du type `Contact` et de la table `contacts`.

### Types TypeScript

```typescript
// types/index.ts

export type Group = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ContactGroup = {
  contactId: string;
  groupId: string;
  createdAt: string;
};

// Mise à jour de Contact - supprimer tags, pas de champ groups
// (les groupes sont récupérés via jointure)

export type ContactWithGroups = Contact & {
  groups: Group[];
};
```

## Logique de suggestion IA

### Quand suggérer

- **Uniquement à la création du contact** (première note vocale)
- **Jamais sur les notes suivantes**

### Comment suggérer

L'IA suggère des groupes quand elle détecte des facts de type contextuel :

| FactType | Exemple de suggestion |
|----------|----------------------|
| `company` | "Affilae" → groupe "Affilae" |
| `how_met` | "rencontré au meetup React" → groupe "Meetup React" |
| `where_met` | "connu à la salle de sport" → groupe "Salle de sport" |
| `sport` | "fait du running" → groupe "Running" |
| `hobby` | "joue aux échecs" → groupe "Échecs" |

### Comportement de suggestion

1. Récupérer les groupes existants de l'utilisateur en DB
2. Pour chaque fact contextuel détecté :
   - Chercher si un groupe existant correspond (matching fuzzy)
   - Si oui, suggérer ce groupe existant
   - Si non, suggérer un nouveau groupe avec le nom extrait
3. Retourner la liste des groupes suggérés (existants + nouveaux)

### Modification du endpoint `/api/extract`

Ajouter au `ExtractionResult` :

```typescript
export type SuggestedGroup = {
  name: string;
  isNew: boolean;  // true si nouveau groupe, false si existant
  existingId?: string;  // id du groupe si existant
  sourceFactType: FactType;  // quel fact a déclenché la suggestion
};

export type ExtractionResult = {
  // ... champs existants ...
  suggestedGroups: SuggestedGroup[];  // seulement si nouveau contact
};
```

## UI - Écran Review

### Section Groupes (création contact uniquement)

Affichée **uniquement** quand `contactId === 'new'`.

Position : après la section "Infos extraites", avant "Sujets chauds".

```
┌─────────────────────────────────────────┐
│ Groupes                                 │
├─────────────────────────────────────────┤
│ ☑ Affilae (nouveau)                     │
│ ☑ Collègues                             │
│ ☐ Tech                                  │
│                                         │
│ [+ Ajouter un groupe...]                │
└─────────────────────────────────────────┘
```

**Comportement :**
- Chips cochables pour chaque suggestion
- Indication "(nouveau)" si le groupe n'existe pas encore
- Input autocomplete pour ajouter manuellement (suggère groupes existants)
- À la sauvegarde : créer les nouveaux groupes, créer les liaisons

## UI - Fiche Contact

### Affichage des groupes

Position : sous le nom du contact, discret.

```
┌─────────────────────────────────────────┐
│         [Photo]                         │
│       Jean Dupont                       │
│   [Affilae] [Collègues]          [edit] │
│                                         │
│ "Développeur senior passionné..."       │
└─────────────────────────────────────────┘
```

### Mode édition

Au tap sur la zone groupes ou bouton edit :

```
┌─────────────────────────────────────────┐
│ Modifier les groupes                    │
├─────────────────────────────────────────┤
│ [Affilae ×] [Collègues ×]               │
│                                         │
│ [+ Ajouter un groupe...]                │
│                                         │
│ [Annuler]              [Enregistrer]    │
└─────────────────────────────────────────┘
```

**Comportement :**
- Chips avec croix pour supprimer
- Input autocomplete pour ajouter (groupes existants + création nouveau)
- Boutons annuler/enregistrer

## UI - Page Contacts

### Filtre par groupe

Position : en haut de la liste, chips scrollables horizontalement.

```
┌─────────────────────────────────────────┐
│ [Tous] [Affilae] [Collègues] [Famille]→ │
├─────────────────────────────────────────┤
│ 🔍 Rechercher...                        │
├─────────────────────────────────────────┤
│ Jean Dupont                             │
│ Marie Martin                            │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Comportement :**
- "Tous" sélectionné par défaut
- Un seul groupe actif à la fois
- Filtrage instantané de la liste
- Afficher uniquement les groupes qui ont au moins un contact ? Non, afficher tous les groupes (conservés même vides)

## Services

### GroupService

```typescript
// services/group.service.ts

export const groupService = {
  // CRUD groupes
  getAll(): Promise<Group[]>;
  getById(id: string): Promise<Group | null>;
  create(name: string): Promise<Group>;
  update(id: string, name: string): Promise<Group>;
  delete(id: string): Promise<void>;

  // Liaisons contact-groupe
  getGroupsForContact(contactId: string): Promise<Group[]>;
  getContactsForGroup(groupId: string): Promise<Contact[]>;
  addContactToGroup(contactId: string, groupId: string): Promise<void>;
  removeContactFromGroup(contactId: string, groupId: string): Promise<void>;
  setContactGroups(contactId: string, groupIds: string[]): Promise<void>;

  // Utilitaires
  findByName(name: string): Promise<Group | null>;  // matching exact
  searchByName(query: string): Promise<Group[]>;    // autocomplete
};
```

## Migration

1. Créer les tables `groups` et `contact_groups`
2. Supprimer la colonne `tags` de la table `contacts`
3. Supprimer le type `Tag` de `types/index.ts`
4. Supprimer les références aux tags dans le code

## Règles métier

1. **Unicité des noms** : Un groupe ne peut pas avoir le même nom qu'un autre (case-insensitive)
2. **Groupes orphelins** : Un groupe sans contacts est conservé (pas de suppression automatique)
3. **Multi-appartenance** : Un contact peut appartenir à plusieurs groupes
4. **Suppression contact** : Les liaisons sont supprimées (CASCADE), les groupes restent
5. **Suppression groupe** : Les liaisons sont supprimées, les contacts restent

## Fichiers à modifier

### Backend
- `backend/src/routes/extract.ts` - Ajouter `suggestedGroups` à l'extraction

### Frontend
- `frontend/lib/db.ts` - Nouvelles tables, migration
- `frontend/types/index.ts` - Nouveaux types, supprimer Tag
- `frontend/services/group.service.ts` - Nouveau service (à créer)
- `frontend/app/review.tsx` - Section Groupes (création)
- `frontend/app/contact/[id].tsx` - Affichage + édition groupes
- `frontend/app/(tabs)/contacts.tsx` - Filtre par groupe
- `frontend/stores/groups-store.ts` - Store Zustand (à créer)
