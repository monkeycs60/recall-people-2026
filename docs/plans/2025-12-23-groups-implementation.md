# Groups Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement dynamic contact groups to replace the unused static tags system.

**Architecture:** New `groups` and `contact_groups` tables in SQLite. Group service for CRUD. AI suggests groups on contact creation based on contextual facts. UI: chips in contact detail, filter in contacts list, section in review screen.

**Tech Stack:** Expo SQLite, React Native, Zustand, Hono backend with Claude API

---

## Task 1: Database Schema - Add Groups Tables

**Files:**
- Modify: `frontend/lib/db.ts`

**Step 1: Add groups and contact_groups tables to initDatabase**

In `frontend/lib/db.ts`, add after the hot_topics table creation (around line 102):

```typescript
    -- Groups
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Contact-Group relationship
    CREATE TABLE IF NOT EXISTS contact_groups (
      contact_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (contact_id, group_id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Index for group lookups
    CREATE INDEX IF NOT EXISTS idx_contact_groups_contact ON contact_groups(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_group ON contact_groups(group_id);
```

**Step 2: Add migration for existing databases**

In `runMigrations` function, add at the end:

```typescript
  // Create groups tables if not exist
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_groups (
      contact_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (contact_id, group_id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_groups_contact ON contact_groups(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_group ON contact_groups(group_id);
  `);
```

**Step 3: Verify app starts without errors**

Run: `cd frontend && npx expo start`
Expected: App starts, no database errors in console

**Step 4: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add groups and contact_groups tables"
```

---

## Task 2: TypeScript Types - Add Group Types

**Files:**
- Modify: `frontend/types/index.ts`

**Step 1: Add Group and ContactGroup types**

After the `HotTopic` type (around line 105), add:

```typescript
export type Group = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
```

**Step 2: Add SuggestedGroup type for extraction**

After the `ResolvedTopic` type (around line 128), add:

```typescript
export type SuggestedGroup = {
  name: string;
  isNew: boolean;
  existingId?: string;
  sourceFactType: FactType;
};
```

**Step 3: Update ExtractionResult to include suggestedGroups**

In the `ExtractionResult` type, add after `resolvedTopics`:

```typescript
  suggestedGroups?: SuggestedGroup[];
```

**Step 4: Remove Tag type**

Delete line 5:
```typescript
export type Tag = 'client' | 'prospect' | 'ami' | 'famille' | 'collegue' | 'autre';
```

**Step 5: Update Contact type - replace tags with groups**

Change the Contact type to remove `tags` field. The groups will be loaded separately via join.

```typescript
export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  highlights: string[];
  aiSummary?: string;
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

**Step 6: Add ContactWithGroups type**

After `ContactWithDetails`, add:

```typescript
export type ContactWithGroups = Contact & {
  groups: Group[];
};
```

**Step 7: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): add Group types, remove Tag type"
```

---

## Task 3: Group Service - Create CRUD Operations

**Files:**
- Create: `frontend/services/group.service.ts`

**Step 1: Create the group service file**

```typescript
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Group } from '@/types';

type GroupRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

const rowToGroup = (row: GroupRow): Group => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const groupService = {
  getAll: async (): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      'SELECT * FROM groups ORDER BY name COLLATE NOCASE'
    );
    return rows.map(rowToGroup);
  },

  getById: async (id: string): Promise<Group | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<GroupRow>(
      'SELECT * FROM groups WHERE id = ?',
      [id]
    );
    return row ? rowToGroup(row) : null;
  },

  findByName: async (name: string): Promise<Group | null> => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<GroupRow>(
      'SELECT * FROM groups WHERE name = ? COLLATE NOCASE',
      [name]
    );
    return row ? rowToGroup(row) : null;
  },

  searchByName: async (query: string): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      'SELECT * FROM groups WHERE name LIKE ? COLLATE NOCASE ORDER BY name COLLATE NOCASE LIMIT 10',
      [`%${query}%`]
    );
    return rows.map(rowToGroup);
  },

  create: async (name: string): Promise<Group> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      'INSERT INTO groups (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      [id, name.trim(), now, now]
    );

    return { id, name: name.trim(), createdAt: now, updatedAt: now };
  },

  update: async (id: string, name: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE groups SET name = ?, updated_at = ? WHERE id = ?',
      [name.trim(), now, id]
    );
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM groups WHERE id = ?', [id]);
  },

  // Contact-Group relationships
  getGroupsForContact: async (contactId: string): Promise<Group[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<GroupRow>(
      `SELECT g.* FROM groups g
       INNER JOIN contact_groups cg ON g.id = cg.group_id
       WHERE cg.contact_id = ?
       ORDER BY g.name COLLATE NOCASE`,
      [contactId]
    );
    return rows.map(rowToGroup);
  },

  getContactIdsForGroup: async (groupId: string): Promise<string[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ contact_id: string }>(
      'SELECT contact_id FROM contact_groups WHERE group_id = ?',
      [groupId]
    );
    return rows.map((row) => row.contact_id);
  },

  addContactToGroup: async (contactId: string, groupId: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR IGNORE INTO contact_groups (contact_id, group_id, created_at) VALUES (?, ?, ?)',
      [contactId, groupId, now]
    );
  },

  removeContactFromGroup: async (contactId: string, groupId: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM contact_groups WHERE contact_id = ? AND group_id = ?',
      [contactId, groupId]
    );
  },

  setContactGroups: async (contactId: string, groupIds: string[]): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // Remove all existing
    await db.runAsync(
      'DELETE FROM contact_groups WHERE contact_id = ?',
      [contactId]
    );

    // Add new ones
    for (const groupId of groupIds) {
      await db.runAsync(
        'INSERT INTO contact_groups (contact_id, group_id, created_at) VALUES (?, ?, ?)',
        [contactId, groupId, now]
      );
    }
  },

  // Get or create a group by name
  getOrCreate: async (name: string): Promise<Group> => {
    const existing = await groupService.findByName(name);
    if (existing) return existing;
    return groupService.create(name);
  },
};
```

**Step 2: Commit**

```bash
git add frontend/services/group.service.ts
git commit -m "feat(services): add group service with CRUD operations"
```

---

## Task 4: Update Contact Service - Remove Tags, Add Groups

**Files:**
- Modify: `frontend/services/contact.service.ts`

**Step 1: Remove Tag import and tags handling**

Remove `Tag` from the import on line 3:
```typescript
import { Contact, ContactWithDetails, Fact, Note } from '@/types';
```

**Step 2: Update getAll - remove tags parsing**

In the `getAll` method, remove `tags` from the SELECT and mapping. Change the result mapping to:

```typescript
    return result.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      nickname: row.nickname || undefined,
      photoUri: row.photo_uri || undefined,
      highlights: JSON.parse(row.highlights || '[]'),
      lastContactAt: row.last_contact_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
```

**Step 3: Update getById - remove tags parsing**

In `getById`, remove `tags` from the Contact object creation (line 95).

**Step 4: Update create - remove tags parameter**

Change the create method signature to remove tags:
```typescript
  create: async (data: {
    firstName: string;
    lastName?: string;
    nickname?: string;
  }): Promise<Contact> => {
```

And remove tags from the INSERT statement:
```typescript
    await db.runAsync(
      `INSERT INTO contacts (id, first_name, last_name, nickname, highlights, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.firstName,
        data.lastName || null,
        data.nickname || null,
        JSON.stringify([]),
        now,
        now,
      ]
    );

    return {
      id,
      firstName: data.firstName,
      lastName: data.lastName,
      nickname: data.nickname,
      highlights: [],
      createdAt: now,
      updatedAt: now,
    };
```

**Step 5: Update the update method - remove tags handling**

Remove the tags section from the update method (lines 204-207).

**Step 6: Commit**

```bash
git add frontend/services/contact.service.ts
git commit -m "refactor(contact-service): remove tags, groups handled separately"
```

---

## Task 5: Groups Store - Create Zustand Store

**Files:**
- Create: `frontend/stores/groups-store.ts`

**Step 1: Create the groups store**

```typescript
import { create } from 'zustand';
import { Group } from '@/types';
import { groupService } from '@/services/group.service';

type GroupsState = {
  groups: Group[];
  isLoading: boolean;
  selectedGroupId: string | null;
};

type GroupsActions = {
  loadGroups: () => Promise<void>;
  setSelectedGroup: (groupId: string | null) => void;
  createGroup: (name: string) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
};

export const useGroupsStore = create<GroupsState & GroupsActions>((set, get) => ({
  groups: [],
  isLoading: false,
  selectedGroupId: null,

  loadGroups: async () => {
    set({ isLoading: true });
    const groups = await groupService.getAll();
    set({ groups, isLoading: false });
  },

  setSelectedGroup: (groupId) => {
    set({ selectedGroupId: groupId });
  },

  createGroup: async (name) => {
    const group = await groupService.create(name);
    await get().loadGroups();
    return group;
  },

  deleteGroup: async (id) => {
    await groupService.delete(id);
    const { selectedGroupId } = get();
    if (selectedGroupId === id) {
      set({ selectedGroupId: null });
    }
    await get().loadGroups();
  },
}));
```

**Step 2: Commit**

```bash
git add frontend/stores/groups-store.ts
git commit -m "feat(stores): add groups store with Zustand"
```

---

## Task 6: Backend Extract Route - Add Group Suggestions

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Update ExtractionRequest type to include existing groups**

Add to the `ExtractionRequest` type (around line 16):

```typescript
  existingGroups?: Array<{
    id: string;
    name: string;
  }>;
```

**Step 2: Add suggestedGroups to the extraction schema**

After `resolvedTopics` in `extractionSchema` (around line 73), add:

```typescript
  suggestedGroups: z.array(
    z.object({
      name: z.string().describe('Nom du groupe suggéré'),
      sourceFactType: z.enum([
        'company', 'how_met', 'where_met', 'sport', 'hobby'
      ]).describe('Le type de fact qui a déclenché cette suggestion'),
    })
  ).describe('Groupes suggérés basés sur les facts contextuels (company, how_met, where_met, sport, hobby). UNIQUEMENT pour nouveaux contacts.'),
```

**Step 3: Update the prompt to include group suggestion rules**

In `buildExtractionPrompt`, add a new section after the RULES section:

```typescript
6. SUGGESTION DE GROUPES (uniquement pour nouveau contact):
   Si c'est un NOUVEAU contact (pas de currentContact fourni), suggère des groupes basés sur:
   - company: nom de l'entreprise → groupe
   - how_met: contexte de rencontre → groupe (ex: "meetup React" → "Meetup React")
   - where_met: lieu de rencontre → groupe (ex: "salle de sport" → "Sport")
   - sport: sport pratiqué → groupe
   - hobby: loisir → groupe

   Retourne les groupes suggérés avec le factType source.
   Si currentContact est fourni, retourne un tableau vide pour suggestedGroups.
```

**Step 4: Process suggested groups in the response**

After generating `suggestedNickname` (around line 123), add logic to match with existing groups:

```typescript
    // Process suggested groups - match with existing or mark as new
    const processedGroups = (!currentContact && extraction.suggestedGroups)
      ? extraction.suggestedGroups.map((suggested) => {
          const existingGroup = body.existingGroups?.find(
            (group) => group.name.toLowerCase() === suggested.name.toLowerCase()
          );
          return {
            name: suggested.name,
            isNew: !existingGroup,
            existingId: existingGroup?.id,
            sourceFactType: suggested.sourceFactType,
          };
        })
      : [];
```

**Step 5: Add suggestedGroups to formattedExtraction**

In `formattedExtraction` object, add:

```typescript
      suggestedGroups: processedGroups,
```

**Step 6: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): add group suggestions for new contacts"
```

---

## Task 7: Update API Client - Pass Existing Groups

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Find the extractInfo function and add existingGroups parameter**

Update the function to accept and pass existingGroups:

```typescript
export const extractInfo = async (data: {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    tags: string[];
  }>;
  existingGroups?: Array<{
    id: string;
    name: string;
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
    hotTopics: Array<{
      id: string;
      title: string;
      context?: string;
    }>;
  };
}): Promise<ExtractionResult> => {
```

And include `existingGroups` in the body:

```typescript
    body: JSON.stringify({
      transcription: data.transcription,
      existingContacts: data.existingContacts,
      existingGroups: data.existingGroups,
      currentContact: data.currentContact,
    }),
```

**Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(api): pass existingGroups to extract endpoint"
```

---

## Task 8: Update Select Contact Screen - Load and Pass Groups

**Files:**
- Modify: `frontend/app/select-contact.tsx`

**Step 1: Import groupService**

Add to imports:
```typescript
import { groupService } from '@/services/group.service';
```

**Step 2: Load groups before calling extractInfo**

In the useEffect or where extractInfo is called, load groups and pass them:

```typescript
const groups = await groupService.getAll();

const result = await extractInfo({
  transcription,
  existingContacts: contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    tags: [], // Legacy, no longer used
  })),
  existingGroups: groups.map((group) => ({
    id: group.id,
    name: group.name,
  })),
});
```

**Step 3: Commit**

```bash
git add frontend/app/select-contact.tsx
git commit -m "feat(select-contact): load and pass groups for extraction"
```

---

## Task 9: Review Screen - Add Groups Section for New Contacts

**Files:**
- Modify: `frontend/app/review.tsx`

**Step 1: Import groupService and add state for groups**

Add to imports:
```typescript
import { groupService } from '@/services/group.service';
import { Group, SuggestedGroup } from '@/types';
import { Plus, X } from 'lucide-react-native';
```

Add state after existing useState declarations:

```typescript
  // Groups state (only for new contacts)
  const [selectedGroups, setSelectedGroups] = useState<Array<{
    name: string;
    isNew: boolean;
    existingId?: string;
  }>>(extraction.suggestedGroups || []);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupSearch, setNewGroupSearch] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
```

**Step 2: Load all groups on mount**

Add useEffect:

```typescript
  useEffect(() => {
    const loadGroups = async () => {
      const groups = await groupService.getAll();
      setAllGroups(groups);
    };
    loadGroups();
  }, []);
```

**Step 3: Add group search handler**

```typescript
  const handleGroupSearch = async (query: string) => {
    setNewGroupSearch(query);
    if (query.trim()) {
      const results = allGroups.filter((group) =>
        group.name.toLowerCase().includes(query.toLowerCase())
      );
      setGroupSearchResults(results);
    } else {
      setGroupSearchResults([]);
    }
  };

  const toggleGroup = (group: { name: string; isNew: boolean; existingId?: string }) => {
    setSelectedGroups((prev) => {
      const exists = prev.some((g) => g.name.toLowerCase() === group.name.toLowerCase());
      if (exists) {
        return prev.filter((g) => g.name.toLowerCase() !== group.name.toLowerCase());
      }
      return [...prev, group];
    });
  };

  const addNewGroup = (name: string) => {
    const existing = allGroups.find((g) => g.name.toLowerCase() === name.toLowerCase());
    const group = existing
      ? { name: existing.name, isNew: false, existingId: existing.id }
      : { name: name.trim(), isNew: true };

    if (!selectedGroups.some((g) => g.name.toLowerCase() === group.name.toLowerCase())) {
      setSelectedGroups((prev) => [...prev, group]);
    }
    setNewGroupSearch('');
    setIsAddingGroup(false);
  };
```

**Step 4: Add Groups section UI (only for new contacts)**

After the facts section and before hot topics, add:

```typescript
      {/* Groups Section - Only for new contacts */}
      {contactId === 'new' && (
        <View className="mb-6">
          <Text className="text-lg font-semibold text-textPrimary mb-3">
            Groupes
          </Text>

          {/* Selected groups as chips */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {selectedGroups.map((group) => (
              <Pressable
                key={group.name}
                className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full"
                onPress={() => toggleGroup(group)}
              >
                <Text className="text-primary mr-1">{group.name}</Text>
                {group.isNew && (
                  <Text className="text-primary/60 text-xs mr-1">(nouveau)</Text>
                )}
                <X size={14} color="#8B5CF6" />
              </Pressable>
            ))}
          </View>

          {/* Add group input */}
          {isAddingGroup ? (
            <View className="bg-surface p-3 rounded-lg">
              <TextInput
                className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-2"
                value={newGroupSearch}
                onChangeText={handleGroupSearch}
                placeholder="Nom du groupe..."
                placeholderTextColor="#71717a"
                autoFocus
              />

              {/* Search results */}
              {groupSearchResults.length > 0 && (
                <View className="mb-2">
                  {groupSearchResults.map((group) => (
                    <Pressable
                      key={group.id}
                      className="py-2 px-3 bg-surfaceHover rounded mb-1"
                      onPress={() => {
                        addNewGroup(group.name);
                      }}
                    >
                      <Text className="text-textPrimary">{group.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Create new option */}
              {newGroupSearch.trim() && !groupSearchResults.some(
                (g) => g.name.toLowerCase() === newGroupSearch.toLowerCase()
              ) && (
                <Pressable
                  className="py-2 px-3 bg-primary/10 rounded mb-2"
                  onPress={() => addNewGroup(newGroupSearch)}
                >
                  <Text className="text-primary">
                    Créer "{newGroupSearch.trim()}"
                  </Text>
                </Pressable>
              )}

              <Pressable
                className="py-2 items-center"
                onPress={() => {
                  setIsAddingGroup(false);
                  setNewGroupSearch('');
                }}
              >
                <Text className="text-textSecondary">Annuler</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              className="flex-row items-center py-2"
              onPress={() => setIsAddingGroup(true)}
            >
              <Plus size={18} color="#8B5CF6" />
              <Text className="text-primary ml-2">Ajouter un groupe</Text>
            </Pressable>
          )}
        </View>
      )}
```

**Step 5: Update handleSave to save groups**

In `handleSave`, after creating the contact (inside the `if (contactId === 'new')` block), add:

```typescript
        // Save groups for new contact
        if (selectedGroups.length > 0) {
          const groupIds: string[] = [];
          for (const group of selectedGroups) {
            if (group.existingId) {
              groupIds.push(group.existingId);
            } else {
              const newGroup = await groupService.create(group.name);
              groupIds.push(newGroup.id);
            }
          }
          await groupService.setContactGroups(finalContactId, groupIds);
        }
```

**Step 6: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): add groups section for new contacts"
```

---

## Task 10: Contact Detail Screen - Display and Edit Groups

**Files:**
- Modify: `frontend/app/contact/[id].tsx`

**Step 1: Import groupService and Group type**

Add to imports:
```typescript
import { groupService } from '@/services/group.service';
import { Group } from '@/types';
import { X, Plus } from 'lucide-react-native';
```

**Step 2: Add state for groups**

After existing useState declarations:

```typescript
  const [groups, setGroups] = useState<Group[]>([]);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [editedGroupIds, setEditedGroupIds] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
```

**Step 3: Load groups in loadContact**

Update `loadContact` callback to also load groups:

```typescript
  const loadContact = useCallback(async () => {
    const loaded = await getContactById(contactId);
    setContact(loaded);
    if (loaded) {
      setEditedFirstName(loaded.firstName);
      setEditedLastName(loaded.lastName || '');

      // Load groups
      const contactGroups = await groupService.getGroupsForContact(contactId);
      setGroups(contactGroups);
      setEditedGroupIds(contactGroups.map((g) => g.id));

      // Load all groups for editing
      const all = await groupService.getAll();
      setAllGroups(all);
    }
  }, [contactId, getContactById]);
```

**Step 4: Add group editing handlers**

```typescript
  const handleStartEditingGroups = () => {
    setEditedGroupIds(groups.map((g) => g.id));
    setIsEditingGroups(true);
  };

  const handleCancelEditingGroups = () => {
    setEditedGroupIds(groups.map((g) => g.id));
    setIsEditingGroups(false);
    setGroupSearchQuery('');
  };

  const handleSaveGroups = async () => {
    await groupService.setContactGroups(contactId, editedGroupIds);
    await loadContact();
    setIsEditingGroups(false);
    setGroupSearchQuery('');
  };

  const toggleGroupInEdit = (groupId: string) => {
    setEditedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleCreateAndAddGroup = async (name: string) => {
    const newGroup = await groupService.create(name);
    setAllGroups((prev) => [...prev, newGroup]);
    setEditedGroupIds((prev) => [...prev, newGroup.id]);
    setGroupSearchQuery('');
  };

  const filteredGroupsForSearch = groupSearchQuery.trim()
    ? allGroups.filter((g) =>
        g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()) &&
        !editedGroupIds.includes(g.id)
      )
    : [];
```

**Step 5: Add Groups UI in the header section**

Replace the tags display section (lines 216-224) with:

```typescript
        {/* Groups display/edit */}
        {!isEditingName && (
          isEditingGroups ? (
            <View className="bg-surface p-4 rounded-lg mt-3">
              <Text className="text-textSecondary text-sm mb-2">Modifier les groupes</Text>

              {/* Current groups as removable chips */}
              <View className="flex-row flex-wrap gap-2 mb-3">
                {editedGroupIds.map((groupId) => {
                  const group = allGroups.find((g) => g.id === groupId);
                  if (!group) return null;
                  return (
                    <Pressable
                      key={groupId}
                      className="flex-row items-center bg-primary/20 px-3 py-1.5 rounded-full"
                      onPress={() => toggleGroupInEdit(groupId)}
                    >
                      <Text className="text-primary mr-1">{group.name}</Text>
                      <X size={14} color="#8B5CF6" />
                    </Pressable>
                  );
                })}
              </View>

              {/* Search/add input */}
              <TextInput
                className="bg-background py-2 px-3 rounded-lg text-textPrimary mb-2"
                value={groupSearchQuery}
                onChangeText={setGroupSearchQuery}
                placeholder="Ajouter un groupe..."
                placeholderTextColor="#71717a"
              />

              {/* Search results */}
              {filteredGroupsForSearch.length > 0 && (
                <View className="mb-2">
                  {filteredGroupsForSearch.slice(0, 5).map((group) => (
                    <Pressable
                      key={group.id}
                      className="py-2 px-3 bg-surfaceHover rounded mb-1"
                      onPress={() => toggleGroupInEdit(group.id)}
                    >
                      <Text className="text-textPrimary">{group.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Create new option */}
              {groupSearchQuery.trim() && !allGroups.some(
                (g) => g.name.toLowerCase() === groupSearchQuery.toLowerCase()
              ) && (
                <Pressable
                  className="py-2 px-3 bg-primary/10 rounded mb-2"
                  onPress={() => handleCreateAndAddGroup(groupSearchQuery.trim())}
                >
                  <Text className="text-primary">
                    Créer "{groupSearchQuery.trim()}"
                  </Text>
                </Pressable>
              )}

              {/* Action buttons */}
              <View className="flex-row gap-3 mt-2">
                <Pressable
                  className="flex-1 py-2 rounded-lg bg-surfaceHover items-center"
                  onPress={handleCancelEditingGroups}
                >
                  <Text className="text-textSecondary">Annuler</Text>
                </Pressable>
                <Pressable
                  className="flex-1 py-2 rounded-lg bg-primary items-center"
                  onPress={handleSaveGroups}
                >
                  <Text className="text-white font-semibold">Enregistrer</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            groups.length > 0 ? (
              <Pressable
                className="flex-row flex-wrap gap-2 mt-3"
                onPress={handleStartEditingGroups}
              >
                {groups.map((group) => (
                  <View
                    key={group.id}
                    className="bg-primary/20 px-3 py-1 rounded-full"
                  >
                    <Text className="text-primary">{group.name}</Text>
                  </View>
                ))}
                <View className="bg-surfaceHover px-2 py-1 rounded-full">
                  <Edit3 size={14} color="#9CA3AF" />
                </View>
              </Pressable>
            ) : (
              <Pressable
                className="flex-row items-center mt-3"
                onPress={handleStartEditingGroups}
              >
                <Plus size={16} color="#8B5CF6" />
                <Text className="text-primary ml-1">Ajouter un groupe</Text>
              </Pressable>
            )
          )
        )}
```

**Step 6: Commit**

```bash
git add frontend/app/contact/[id].tsx
git commit -m "feat(contact-detail): display and edit groups"
```

---

## Task 11: Contacts List Screen - Add Group Filter

**Files:**
- Modify: `frontend/app/(tabs)/contacts.tsx`

**Step 1: Import useGroupsStore and groupService**

Add to imports:
```typescript
import { useGroupsStore } from '@/stores/groups-store';
import { groupService } from '@/services/group.service';
```

**Step 2: Add state for filtered contacts by group**

```typescript
  const { groups, loadGroups, selectedGroupId, setSelectedGroup } = useGroupsStore();
  const [contactIdsByGroup, setContactIdsByGroup] = useState<string[]>([]);
```

**Step 3: Load groups and filter contacts**

Update useFocusEffect:

```typescript
  useFocusEffect(
    useCallback(() => {
      loadContacts();
      loadGroups();
    }, [])
  );

  // Load contact IDs when group filter changes
  useEffect(() => {
    const loadFilteredContacts = async () => {
      if (selectedGroupId) {
        const ids = await groupService.getContactIdsForGroup(selectedGroupId);
        setContactIdsByGroup(ids);
      } else {
        setContactIdsByGroup([]);
      }
    };
    loadFilteredContacts();
  }, [selectedGroupId]);
```

**Step 4: Update filteredContacts to include group filter**

```typescript
  const filteredContacts = contacts.filter((contact) => {
    // Group filter
    if (selectedGroupId && !contactIdsByGroup.includes(contact.id)) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        contact.firstName.toLowerCase().includes(query) ||
        (contact.lastName && contact.lastName.toLowerCase().includes(query)) ||
        (contact.nickname && contact.nickname.toLowerCase().includes(query))
      );
    }
    return true;
  });
```

**Step 5: Add group filter chips UI**

After the search input and before the FlatList, add:

```typescript
        {/* Group filter chips */}
        {groups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            <Pressable
              className={`px-4 py-2 rounded-full mr-2 ${
                !selectedGroupId ? 'bg-primary' : 'bg-surface'
              }`}
              onPress={() => setSelectedGroup(null)}
            >
              <Text className={!selectedGroupId ? 'text-white font-medium' : 'text-textSecondary'}>
                Tous
              </Text>
            </Pressable>
            {groups.map((group) => (
              <Pressable
                key={group.id}
                className={`px-4 py-2 rounded-full mr-2 ${
                  selectedGroupId === group.id ? 'bg-primary' : 'bg-surface'
                }`}
                onPress={() => setSelectedGroup(group.id)}
              >
                <Text
                  className={
                    selectedGroupId === group.id ? 'text-white font-medium' : 'text-textSecondary'
                  }
                >
                  {group.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
```

**Step 6: Add ScrollView import**

Add to imports:
```typescript
import { View, Text, FlatList, Pressable, RefreshControl, TextInput, ScrollView } from 'react-native';
```

**Step 7: Remove tags display from renderContact**

In `renderContact`, remove the tags section (lines 51-59) since we now use groups.

**Step 8: Commit**

```bash
git add frontend/app/(tabs)/contacts.tsx
git commit -m "feat(contacts-list): add group filter chips"
```

---

## Task 12: Cleanup - Remove Tags Column from DB

**Files:**
- Modify: `frontend/lib/db.ts`

**Step 1: The tags column can stay in DB for backward compatibility**

SQLite doesn't easily support dropping columns. The column will be ignored.
No changes needed - the column remains but is unused.

**Step 2: Verify everything works**

Run: `cd frontend && npx expo start`
Expected: App starts, groups work correctly, no errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(groups): complete groups feature implementation"
```

---

## Summary

The implementation adds:
1. **Database**: `groups` and `contact_groups` tables
2. **Types**: `Group`, `SuggestedGroup` types, removed `Tag`
3. **Services**: `groupService` with full CRUD
4. **Store**: `useGroupsStore` for global state
5. **Backend**: Group suggestions in extraction based on contextual facts
6. **Review screen**: Groups section for new contacts only
7. **Contact detail**: Group display and edit mode
8. **Contacts list**: Horizontal chip filter by group
