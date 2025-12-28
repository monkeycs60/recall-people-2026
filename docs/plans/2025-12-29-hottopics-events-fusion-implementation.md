# Hot Topics + Events Fusion - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the `events` table into `hot_topics` with an optional `eventDate` field, unifying the review UI and enabling birthday auto-generation.

**Architecture:** Add `event_date`, `notified_at`, `birthday_contact_id` columns to `hot_topics`, migrate existing events, remove the `events` table, update the LLM prompt to output `suggestedDate` on hotTopics instead of a separate events array, and update the review UI to show a date checkbox under each hot topic.

**Tech Stack:** Expo/React Native, SQLite (expo-sqlite), TypeScript, Hono (backend), Zod, react-i18next

---

## Task 1: Database Migration - Add columns to hot_topics

**Files:**
- Modify: `frontend/lib/db.ts:230-240` (inside runMigrations)

**Step 1: Add migration for new hot_topics columns**

After the existing hot_topics migrations (around line 239), add:

```typescript
  // Migration: Add event_date, notified_at, birthday_contact_id to hot_topics
  const hasEventDate = hotTopicsInfo.some((col) => col.name === 'event_date');
  if (!hasEventDate) {
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN event_date TEXT");
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN notified_at TEXT");
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN birthday_contact_id TEXT");
    await database.execAsync("CREATE INDEX IF NOT EXISTS idx_hot_topics_event_date ON hot_topics(event_date)");
    await database.execAsync("CREATE INDEX IF NOT EXISTS idx_hot_topics_birthday ON hot_topics(birthday_contact_id)");
  }
```

**Step 2: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add event_date, notified_at, birthday_contact_id columns to hot_topics"
```

---

## Task 2: Database Migration - Migrate events to hot_topics

**Files:**
- Modify: `frontend/lib/db.ts:240+` (continue in runMigrations)

**Step 1: Add migration to copy events to hot_topics**

After the previous migration, add:

```typescript
  // Migration: Migrate events to hot_topics (one-time)
  const eventsTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
  );

  if (eventsTableExists) {
    // Copy events to hot_topics
    await database.execAsync(`
      INSERT INTO hot_topics (id, contact_id, title, context, status, event_date, source_note_id, created_at, updated_at)
      SELECT id, contact_id, title, NULL, 'active', event_date, source_note_id, created_at, created_at
      FROM events
    `);

    // Copy notified_at values
    await database.execAsync(`
      UPDATE hot_topics
      SET notified_at = (SELECT events.notified_at FROM events WHERE events.id = hot_topics.id)
      WHERE id IN (SELECT id FROM events)
    `);

    // Drop the events table
    await database.execAsync("DROP TABLE events");
    await database.execAsync("DROP INDEX IF EXISTS idx_events_contact");
    await database.execAsync("DROP INDEX IF EXISTS idx_events_date");
  }
```

**Step 2: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): migrate events to hot_topics and drop events table"
```

---

## Task 3: Update TypeScript Types

**Files:**
- Modify: `frontend/types/index.ts:98-134`

**Step 1: Update HotTopic type**

Replace the HotTopic type:

```typescript
export type HotTopic = {
  id: string;
  contactId: string;
  title: string;
  context?: string;
  resolution?: string;
  status: HotTopicStatus;
  sourceNoteId?: string;
  // New fields for event fusion
  eventDate?: string;        // ISO 8601, if set = reminder/notification
  notifiedAt?: string;       // When notification was sent
  birthdayContactId?: string; // If non-null = auto-generated birthday
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};
```

**Step 2: Remove Event and ExtractedEvent types**

Delete the following types (lines 121-134):

```typescript
// DELETE THESE:
export type Event = {
  id: string;
  contactId: string;
  title: string;
  eventDate: string;
  sourceNoteId?: string;
  notifiedAt?: string;
  createdAt: string;
};

export type ExtractedEvent = {
  title: string;
  eventDate: string;
};
```

**Step 3: Update ExtractedHotTopic type**

```typescript
export type ExtractedHotTopic = {
  title: string;
  context: string;
  suggestedDate?: string; // DD/MM/YYYY format, optional
  resolvesExisting?: string;
};
```

**Step 4: Update ExtractionResult type**

Remove `events` from ExtractionResult (around line 190):

```typescript
export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
    suggestedNickname?: string;
  };
  noteTitle: string;
  contactInfo?: ExtractedContactInfo;
  facts: ExtractedFact[];
  hotTopics: ExtractedHotTopic[];
  resolvedTopics: ResolvedTopic[];
  memories: ExtractedMemory[];
  // REMOVED: events: ExtractedEvent[];
  suggestedGroups?: SuggestedGroup[];
  note: {
    summary: string;
    keyPoints: string[];
  };
};
```

**Step 5: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): update HotTopic with eventDate, remove Event type"
```

---

## Task 4: Update hot-topic.service.ts

**Files:**
- Modify: `frontend/services/hot-topic.service.ts`

**Step 1: Update row type and mapping**

Update the row type in getByContact (around line 13):

```typescript
const result = await db.getAllAsync<{
  id: string;
  contact_id: string;
  title: string;
  context: string | null;
  resolution: string | null;
  status: string;
  source_note_id: string | null;
  event_date: string | null;
  notified_at: string | null;
  birthday_contact_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}>(query, params);

return result.map((row) => ({
  id: row.id,
  contactId: row.contact_id,
  title: row.title,
  context: row.context || undefined,
  resolution: row.resolution || undefined,
  status: row.status as HotTopicStatus,
  sourceNoteId: row.source_note_id || undefined,
  eventDate: row.event_date || undefined,
  notifiedAt: row.notified_at || undefined,
  birthdayContactId: row.birthday_contact_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  resolvedAt: row.resolved_at || undefined,
}));
```

**Step 2: Update create function**

```typescript
create: async (data: {
  contactId: string;
  title: string;
  context?: string;
  eventDate?: string;
  birthdayContactId?: string;
  sourceNoteId?: string;
}): Promise<HotTopic> => {
  const db = await getDatabase();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO hot_topics (id, contact_id, title, context, status, event_date, birthday_contact_id, source_note_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.contactId,
      data.title,
      data.context || null,
      'active',
      data.eventDate || null,
      data.birthdayContactId || null,
      data.sourceNoteId || null,
      now,
      now,
    ]
  );

  return {
    id,
    contactId: data.contactId,
    title: data.title,
    context: data.context,
    status: 'active',
    eventDate: data.eventDate,
    birthdayContactId: data.birthdayContactId,
    sourceNoteId: data.sourceNoteId,
    createdAt: now,
    updatedAt: now,
  };
},
```

**Step 3: Update update function**

```typescript
update: async (id: string, data: Partial<{
  title: string;
  context: string;
  eventDate: string | null;
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
  if (data.eventDate !== undefined) {
    updates.push('event_date = ?');
    values.push(data.eventDate);
  }

  if (updates.length === 0) return;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(`UPDATE hot_topics SET ${updates.join(', ')} WHERE id = ?`, values);
},
```

**Step 4: Add new methods for events functionality**

```typescript
getUpcoming: async (daysAhead: number = 30): Promise<HotTopic[]> => {
  const db = await getDatabase();
  const today = startOfDay(new Date()).toISOString();
  const endDate = addDays(startOfDay(new Date()), daysAhead).toISOString();

  const result = await db.getAllAsync<{
    id: string;
    contact_id: string;
    title: string;
    context: string | null;
    resolution: string | null;
    status: string;
    source_note_id: string | null;
    event_date: string | null;
    notified_at: string | null;
    birthday_contact_id: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  }>(
    `SELECT * FROM hot_topics
     WHERE event_date IS NOT NULL
     AND event_date >= ? AND event_date <= ?
     AND status = 'active'
     ORDER BY event_date ASC`,
    [today, endDate]
  );

  return result.map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    context: row.context || undefined,
    resolution: row.resolution || undefined,
    status: row.status as HotTopicStatus,
    sourceNoteId: row.source_note_id || undefined,
    eventDate: row.event_date || undefined,
    notifiedAt: row.notified_at || undefined,
    birthdayContactId: row.birthday_contact_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || undefined,
  }));
},

getPendingNotifications: async (): Promise<HotTopic[]> => {
  const db = await getDatabase();
  const tomorrow = addDays(startOfDay(new Date()), 1).toISOString();
  const dayAfterTomorrow = addDays(startOfDay(new Date()), 2).toISOString();

  const result = await db.getAllAsync<{
    id: string;
    contact_id: string;
    title: string;
    context: string | null;
    resolution: string | null;
    status: string;
    source_note_id: string | null;
    event_date: string | null;
    notified_at: string | null;
    birthday_contact_id: string | null;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
  }>(
    `SELECT * FROM hot_topics
     WHERE event_date >= ? AND event_date < ?
     AND notified_at IS NULL
     AND status = 'active'
     ORDER BY event_date ASC`,
    [tomorrow, dayAfterTomorrow]
  );

  return result.map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    title: row.title,
    context: row.context || undefined,
    resolution: row.resolution || undefined,
    status: row.status as HotTopicStatus,
    sourceNoteId: row.source_note_id || undefined,
    eventDate: row.event_date || undefined,
    notifiedAt: row.notified_at || undefined,
    birthdayContactId: row.birthday_contact_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || undefined,
  }));
},

markNotified: async (id: string): Promise<void> => {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE hot_topics SET notified_at = ? WHERE id = ?', [now, id]);
},

deleteByBirthdayContact: async (contactId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM hot_topics WHERE birthday_contact_id = ?', [contactId]);
},

cleanupPastBirthdays: async (): Promise<void> => {
  const db = await getDatabase();
  const today = startOfDay(new Date()).toISOString();
  await db.runAsync(
    'DELETE FROM hot_topics WHERE birthday_contact_id IS NOT NULL AND event_date < ?',
    [today]
  );
},

parseExtractedDate: (dateStr: string): string | null => {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const dayNum = parseInt(match[1]);
  const monthNum = parseInt(match[2]);
  const yearNum = parseInt(match[3]);

  if (dayNum < 1 || dayNum > 31) return null;
  if (monthNum < 1 || monthNum > 12) return null;

  const date = new Date(yearNum, monthNum - 1, dayNum);

  if (isNaN(date.getTime())) return null;
  if (date.getDate() !== dayNum) return null;
  if (isBefore(date, startOfDay(new Date()))) return null;

  return date.toISOString();
},
```

**Step 5: Add imports at top**

```typescript
import { startOfDay, addDays, isBefore } from 'date-fns';
```

**Step 6: Commit**

```bash
git add frontend/services/hot-topic.service.ts
git commit -m "feat(hot-topic): add eventDate support and event-like methods"
```

---

## Task 5: Delete event.service.ts

**Files:**
- Delete: `frontend/services/event.service.ts`

**Step 1: Delete the file**

```bash
rm frontend/services/event.service.ts
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove event.service.ts (merged into hot-topic.service)"
```

---

## Task 6: Update Backend Extraction Schema

**Files:**
- Modify: `backend/src/routes/extract.ts:86-119`

**Step 1: Update hotTopics schema to include suggestedDate**

Replace the hotTopics schema (around line 86):

```typescript
hotTopics: z.array(
  z.object({
    title: z.string().describe('Titre court du sujet (ex: "Examen de droit", "Recherche appart", "Mariage")'),
    context: z.string().describe('1-2 phrases de contexte'),
    suggestedDate: z.string().nullable().describe('Date au format DD/MM/YYYY si un événement daté est associé, sinon null'),
  })
).describe('NOUVEAUX sujets temporels/actionnables mentionnés dans la note, avec date optionnelle'),
```

**Step 2: Remove the events schema**

Delete the events array from the schema (around line 105-110):

```typescript
// DELETE THIS:
events: z.array(
  z.object({
    title: z.string().describe('Titre court de l\'événement (ex: "Part pêcher", "Exam de conduite")'),
    eventDate: z.string().describe('Date au format DD/MM/YYYY calculée à partir de la date de référence'),
  })
).describe('Événements futurs avec une date précise mentionnée (pas les intentions vagues)'),
```

**Step 3: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): add suggestedDate to hotTopics, remove events array"
```

---

## Task 7: Update Backend Extraction Prompt

**Files:**
- Modify: `backend/src/routes/extract.ts:383-464` (buildExtractionPrompt function)

**Step 1: Update HOT TOPICS section**

Replace section 4 (HOT TOPICS) and section 8 (EVENTS) with a merged section:

```typescript
4. HOT TOPICS (Sujets chauds - temporaires/actionnables):
   NOUVEAUX sujets à créer:
   - Projets en cours: "Cherche un appart", "Prépare un examen"
   - Événements à suivre: "Mariage prévu en juin"
   - Situations: "Problème au travail", "En recherche d'emploi"

   CHAMP suggestedDate (optionnel):
   Si une date est mentionnée pour ce sujet, calcule-la au format DD/MM/YYYY.

   RÈGLES DE CALCUL DES DATES (utilise la DATE DE RÉFÉRENCE ci-dessus):
   - "dans X jours/semaines/mois" → date exacte calculée
   - "la semaine prochaine" → lundi prochain
   - "le 15 janvier" → 15/01/YYYY
   - "mi-février" → 15/02/YYYY
   - "fin mars" → dernier jour du mois (31/03/YYYY)
   - "en juin" → 01/06/YYYY (1er du mois)
   - "cet été" → 01/07/YYYY
   - "à la rentrée" → 01/09/YYYY
   - "pour Noël" → 25/12/YYYY

   Si aucune date n'est mentionnée ou si c'est trop vague → suggestedDate = null

   Exemples (si date de référence = 29/12/2024):
   - "Eric part pêcher dans deux semaines"
     → { title: "Part pêcher", context: "...", suggestedDate: "12/01/2025" }
   - "Elle prépare un examen" (sans date)
     → { title: "Examen", context: "...", suggestedDate: null }
   - "Mariage prévu en juin"
     → { title: "Mariage", context: "...", suggestedDate: "01/06/2025" }
   - "Il veut faire un resto en juin"
     → { title: "Resto", context: "...", suggestedDate: "01/06/2025" }
```

**Step 2: Remove section 8 (EVENTS)**

Delete section 8 entirely (lines 428-453).

**Step 3: Update RÈGLES section**

```typescript
RÈGLES:
- facts = infos PERMANENTES du profil (hobbies = activités régulières)
- hotTopics = NOUVEAUX sujets TEMPORAIRES à suivre (pas ceux existants), avec date optionnelle
- resolvedTopics = sujets existants TERMINÉS avec leur résolution détaillée
- memories = événements PONCTUELS / souvenirs PASSÉS (PAS des hobbies réguliers)
- suggestedGroups = groupes suggérés UNIQUEMENT pour nouveaux contacts
- N'extrais QUE ce qui est EXPLICITEMENT mentionné
- action="add" pour nouvelle info, "update" si modification d'un fact existant
```

**Step 4: Update resolution instructions**

Update section 5 (DÉTECTION DE RÉSOLUTION):

```typescript
5. DÉTECTION DE RÉSOLUTION DE SUJETS EXISTANTS:
   Si des SUJETS CHAUDS EXISTANTS (listés ci-dessus) semblent RÉSOLUS ou TERMINÉS selon la transcription:
   - Retourne leurs IDs dans resolvedTopics avec une résolution

   RÈGLE CRITIQUE pour la résolution:
   - Extrais TOUS les détails concrets mentionnés dans la transcription
   - Inclus : résultats chiffrés, noms, lieux, dates, anecdotes
   - Si aucun détail concret n'est mentionné → résolution = "Effectué" ou "Terminé"

   Exemples:
   • "Niko a couru son semi" (sans détails)
     → { id: "...", resolution: "Effectué" }
   • "Niko a couru son semi en 1h40, il a fêté ça au bar avec ses potes"
     → { id: "...", resolution: "Terminé en 1h40, a fêté au bar avec ses amis" }
   • "Elle a eu son examen"
     → { id: "...", resolution: "Réussi" }
   • "Elle a eu son examen avec 16/20, major de sa promo"
     → { id: "...", resolution: "Réussi avec 16/20, major de promo" }
   • "Il a trouvé un appart dans le 11ème, 45m²"
     → { id: "...", resolution: "Trouvé dans le 11ème, 45m²" }

   - Ne marque comme résolu QUE si la transcription indique CLAIREMENT que c'est terminé
```

**Step 5: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): merge events into hotTopics with suggestedDate, improve resolution prompt"
```

---

## Task 8: Update Backend Response Formatting

**Files:**
- Modify: `backend/src/routes/extract.ts:180-250` (response formatting section)

**Step 1: Remove events from response**

Find where the response is formatted and remove the events field. The response should no longer include an `events` array.

**Step 2: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): remove events from response"
```

---

## Task 9: Add Translations

**Files:**
- Modify: `frontend/locales/fr.json`
- Modify: `frontend/locales/en.json`

**Step 1: Add French translations**

Add under `review` key:

```json
"reminder": "Rappel",
"reminderDate": "Date du rappel",
"noDate": "Pas de date"
```

**Step 2: Add English translations**

Add under `review` key:

```json
"reminder": "Reminder",
"reminderDate": "Reminder date",
"noDate": "No date"
```

**Step 3: Commit**

```bash
git add frontend/locales/fr.json frontend/locales/en.json
git commit -m "feat(i18n): add reminder translations for hot topics"
```

---

## Task 10: Update Review Screen - State Management

**Files:**
- Modify: `frontend/app/review.tsx`

**Step 1: Remove event-related state**

Remove these state variables and functions:
- `editableEvents`
- `selectedEvents`
- `editingEventIndex`
- `toggleEvent`
- `updateEvent`

**Step 2: Add reminder state to hot topics**

Update the hot topic state to include date selection:

```typescript
const [hotTopicDates, setHotTopicDates] = useState<Record<number, { enabled: boolean; date: string }>>(() => {
  const initial: Record<number, { enabled: boolean; date: string }> = {};
  extraction.hotTopics.forEach((topic, index) => {
    initial[index] = {
      enabled: !!topic.suggestedDate,
      date: topic.suggestedDate || '',
    };
  });
  return initial;
});
```

**Step 3: Add toggle and update functions**

```typescript
const toggleHotTopicDate = (index: number) => {
  setHotTopicDates((prev) => ({
    ...prev,
    [index]: {
      ...prev[index],
      enabled: !prev[index]?.enabled,
    },
  }));
};

const updateHotTopicDate = (index: number, date: string) => {
  setHotTopicDates((prev) => ({
    ...prev,
    [index]: {
      ...prev[index],
      date,
    },
  }));
};
```

**Step 4: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): add hot topic date state management"
```

---

## Task 11: Update Review Screen - UI

**Files:**
- Modify: `frontend/app/review.tsx:806-940`

**Step 1: Remove Events section**

Delete the entire events section (lines 873-940).

**Step 2: Update Hot Topics rendering**

Update the hot topic card to include the date checkbox:

```typescript
return (
  <View key={index} style={styles.cardRow}>
    <Pressable onPress={() => toggleHotTopic(index)}>
      <View
        style={[
          styles.checkbox,
          selectedHotTopics.includes(index) && styles.checkboxSelected
        ]}
      >
        {selectedHotTopics.includes(index) && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
    </Pressable>

    <View style={styles.orangeDot} />

    <Pressable style={styles.cardContent} onPress={() => setEditingHotTopicIndex(index)}>
      <View style={styles.factRow}>
        <Text style={styles.factValue}>{topic.title}</Text>
        <Edit3 size={14} color={Colors.textMuted} />
      </View>
      {topic.context && (
        <Text style={styles.contextText}>{topic.context}</Text>
      )}

      {/* Date/Reminder row */}
      <View style={styles.reminderRow}>
        <Pressable
          style={styles.reminderCheckbox}
          onPress={() => toggleHotTopicDate(index)}
        >
          <View style={[
            styles.smallCheckbox,
            hotTopicDates[index]?.enabled && styles.smallCheckboxSelected
          ]}>
            {hotTopicDates[index]?.enabled && <Text style={styles.smallCheckmark}>✓</Text>}
          </View>
          <Text style={styles.reminderLabel}>{t('review.reminder')}</Text>
        </Pressable>

        {hotTopicDates[index]?.enabled && (
          <TextInput
            style={styles.dateInput}
            value={hotTopicDates[index]?.date || ''}
            onChangeText={(value) => updateHotTopicDate(index, value)}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />
        )}

        {hotTopicDates[index]?.enabled && hotTopicDates[index]?.date && (
          <Text style={styles.relativeDateText}>
            ({formatRelativeDate(hotTopicDates[index].date)})
          </Text>
        )}
      </View>
    </Pressable>
  </View>
);
```

**Step 3: Add styles**

```typescript
reminderRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
  gap: 8,
},
reminderCheckbox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
smallCheckbox: {
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 1.5,
  borderColor: Colors.border,
  justifyContent: 'center',
  alignItems: 'center',
},
smallCheckboxSelected: {
  backgroundColor: Colors.info,
  borderColor: Colors.info,
},
smallCheckmark: {
  color: Colors.textInverse,
  fontSize: 12,
  fontWeight: '600',
},
reminderLabel: {
  fontSize: 13,
  color: Colors.textSecondary,
},
dateInput: {
  flex: 1,
  backgroundColor: Colors.background,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 6,
  fontSize: 14,
  color: Colors.textPrimary,
  borderWidth: 1,
  borderColor: Colors.border,
  maxWidth: 120,
},
relativeDateText: {
  fontSize: 12,
  color: Colors.info,
  fontWeight: '500',
},
```

**Step 4: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): replace events section with date checkbox on hot topics"
```

---

## Task 12: Update Review Screen - Save Handler

**Files:**
- Modify: `frontend/app/review.tsx` (handleSave function)

**Step 1: Remove event saving logic**

Find and remove the code that saves events.

**Step 2: Update hot topic saving to include eventDate**

```typescript
// Save hot topics with optional dates
for (const index of selectedHotTopics) {
  const topic = editableHotTopics[index];
  const dateInfo = hotTopicDates[index];

  let eventDate: string | undefined;
  if (dateInfo?.enabled && dateInfo?.date) {
    eventDate = hotTopicService.parseExtractedDate(dateInfo.date) || undefined;
  }

  await hotTopicService.create({
    contactId: finalContactId,
    title: topic.title,
    context: topic.context || undefined,
    eventDate,
    sourceNoteId: noteId,
  });
}
```

**Step 3: Update imports**

```typescript
import { hotTopicService } from '@/services/hot-topic.service';
// Remove: import { eventService } from '@/services/event.service';
```

**Step 4: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): save hot topics with eventDate"
```

---

## Task 13: Update Upcoming Screen

**Files:**
- Modify: `frontend/app/(tabs)/upcoming.tsx`

**Step 1: Replace eventService with hotTopicService**

Update imports:

```typescript
import { hotTopicService } from '@/services/hot-topic.service';
// Remove: import { eventService } from '@/services/event.service';
import { HotTopic, Contact } from '@/types';
// Remove: Event from types
```

**Step 2: Update types**

```typescript
type TimelineDay = {
  date: Date;
  events: Array<HotTopic & { contact: Contact }>;
  isToday: boolean;
};
```

**Step 3: Update loadEvents function**

```typescript
const loadEvents = useCallback(async () => {
  setLoading(true);

  if (view === 'upcoming') {
    const hotTopics = await hotTopicService.getUpcoming(30);
    const topicsWithContacts = await Promise.all(
      hotTopics
        .filter((topic) => !topic.birthdayContactId || isNextBirthdayForContact(topic))
        .map(async (topic) => {
          const contact = await contactService.getById(topic.contactId);
          return { ...topic, contact: contact! };
        })
    );

    const days: TimelineDay[] = [];
    const today = startOfDay(new Date());

    for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
      const date = addDays(today, dayIndex);
      const dayEvents = topicsWithContacts.filter((topic) =>
        topic.eventDate && isSameDay(new Date(topic.eventDate), date)
      );
      days.push({
        date,
        events: dayEvents,
        isToday: dayIndex === 0,
      });
    }

    setTimeline(days);
  } else {
    // For past events, we might want to show resolved hot topics
    // For now, just show empty
    setPastEvents([]);
  }

  setLoading(false);
}, [view]);
```

**Step 4: Add helper function to filter birthdays**

```typescript
// Show only the next upcoming birthday per contact
const isNextBirthdayForContact = (topic: HotTopic): boolean => {
  // If it's not a birthday topic, always show it
  if (!topic.birthdayContactId) return true;

  // For birthday topics, we filter in the query to show only the closest one
  // This is a placeholder - the actual filtering should happen in the service
  return true;
};
```

**Step 5: Commit**

```bash
git add frontend/app/(tabs)/upcoming.tsx
git commit -m "feat(upcoming): use hotTopicService instead of eventService"
```

---

## Task 14: Add Birthday Hot Topic Generation

**Files:**
- Modify: `frontend/services/hot-topic.service.ts`

**Step 1: Add syncBirthdayHotTopics function**

```typescript
syncBirthdayHotTopics: async (
  contactId: string,
  contactFirstName: string,
  birthdayDay: number,
  birthdayMonth: number
): Promise<void> => {
  const db = await getDatabase();

  // Delete existing birthday hot topics for this contact
  await db.runAsync('DELETE FROM hot_topics WHERE birthday_contact_id = ?', [contactId]);

  // Calculate the next 5 birthday occurrences
  const today = new Date();
  const dates: Date[] = [];

  for (let year = today.getFullYear(); dates.length < 5; year++) {
    const birthday = new Date(year, birthdayMonth - 1, birthdayDay);
    if (birthday > today) {
      dates.push(birthday);
    }
  }

  // Create 5 hot topics for upcoming birthdays
  const now = new Date().toISOString();
  for (const date of dates) {
    const id = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO hot_topics (id, contact_id, title, context, status, event_date, birthday_contact_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        contactId,
        `Anniversaire de ${contactFirstName}`,
        null,
        'active',
        date.toISOString(),
        contactId,
        now,
        now,
      ]
    );
  }
},

deleteBirthdayHotTopics: async (contactId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM hot_topics WHERE birthday_contact_id = ?', [contactId]);
},
```

**Step 2: Commit**

```bash
git add frontend/services/hot-topic.service.ts
git commit -m "feat(hot-topic): add birthday hot topic sync functions"
```

---

## Task 15: Integrate Birthday Sync in Contact Service

**Files:**
- Modify: `frontend/services/contact.service.ts`

**Step 1: Import hotTopicService**

```typescript
import { hotTopicService } from './hot-topic.service';
```

**Step 2: Update the update function**

After updating contact, sync birthday hot topics if birthday changed:

```typescript
// At the end of the update function, after the UPDATE query:
if (data.birthdayDay !== undefined || data.birthdayMonth !== undefined) {
  const contact = await contactService.getById(id);
  if (contact && contact.birthdayDay && contact.birthdayMonth) {
    await hotTopicService.syncBirthdayHotTopics(
      id,
      contact.firstName,
      contact.birthdayDay,
      contact.birthdayMonth
    );
  } else if (contact && !contact.birthdayDay) {
    // Birthday was removed, delete birthday hot topics
    await hotTopicService.deleteBirthdayHotTopics(id);
  }
}
```

**Step 3: Commit**

```bash
git add frontend/services/contact.service.ts
git commit -m "feat(contact): sync birthday hot topics on birthday update"
```

---

## Task 16: Add Birthday Cleanup on App Start

**Files:**
- Modify: `frontend/app/_layout.tsx`

**Step 1: Add cleanup call after database init**

Find where `initDatabase()` is called and add:

```typescript
import { hotTopicService } from '@/services/hot-topic.service';

// After initDatabase() call:
await hotTopicService.cleanupPastBirthdays();
```

**Step 2: Commit**

```bash
git add frontend/app/_layout.tsx
git commit -m "feat(app): cleanup past birthday hot topics on startup"
```

---

## Task 17: Update Notification Service

**Files:**
- Modify: `frontend/services/notification.service.ts`

**Step 1: Update to use hotTopicService**

Replace eventService calls with hotTopicService:

```typescript
import { hotTopicService } from './hot-topic.service';
// Remove: import { eventService } from './event.service';

// Update getPendingNotifications call:
const pendingTopics = await hotTopicService.getPendingNotifications();

// Update markNotified call:
await hotTopicService.markNotified(topicId);
```

**Step 2: Commit**

```bash
git add frontend/services/notification.service.ts
git commit -m "feat(notification): use hotTopicService for event notifications"
```

---

## Task 18: Update Evaluators

**Files:**
- Modify: `backend/src/lib/evaluators.ts:49-121`

**Step 1: Update evaluateExtraction prompt**

Replace the evaluation prompt:

```typescript
const prompt = `Tu es un évaluateur de qualité pour un système d'extraction d'informations.

Ta tâche : Évaluer si l'extraction JSON correspond fidèlement à la transcription audio.

TRANSCRIPTION ORIGINALE:
${transcription}

EXTRACTION GÉNÉRÉE:
${JSON.stringify(extraction, null, 2)}

CONTEXTE IMPORTANT:
- Le nom du contact peut provenir de la base de données (pas une hallucination)
- Les dates calculées (ex: "dans 2 semaines" → date précise) sont attendues et correctes
- Les dates vagues comme "en juin" doivent être converties au 1er du mois

Évalue la qualité selon ces critères:
1. COMPLÉTUDE: Tous les sujets/infos mentionnés sont-ils extraits ?
2. EXACTITUDE: Les informations extraites correspondent-elles à la transcription ?
3. CATÉGORISATION: facts vs hotTopics vs memories correctement distingués ?
   - facts = infos permanentes (métier, hobby régulier, lieu de vie)
   - hotTopics = sujets temporaires à suivre (projets, événements à venir)
   - memories = événements passés ponctuels
4. DATES: Si une date est mentionnée pour un hot topic, suggestedDate est-il correctement calculé ?
5. RÉSOLUTIONS: Si un sujet existant est résolu, la résolution contient-elle les détails concrets ?
6. PAS D'HALLUCINATION: Rien n'est inventé au-delà de ce qui est dit ?

Donne un score de 0 à 10:
- 9-10: Parfait, extraction fidèle et bien catégorisée
- 7-8: Très bon, quelques détails manquants
- 4-6: Moyen, erreurs de catégorisation ou omissions importantes
- 1-3: Mauvais, hallucinations ou infos incorrectes

Sois strict et objectif.`;
```

**Step 2: Commit**

```bash
git add backend/src/lib/evaluators.ts
git commit -m "feat(evaluators): update extraction evaluator with new criteria"
```

---

## Task 19: Final Cleanup and Testing

**Files:**
- Review all modified files

**Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
cd ../backend && npx tsc --noEmit
```

Fix any type errors.

**Step 2: Search for remaining event.service imports**

```bash
grep -r "event.service" frontend/
grep -r "eventService" frontend/
```

Remove any remaining references.

**Step 3: Test the flow manually**

1. Open the app and verify no crashes
2. Record a new note mentioning a dated event ("Son anniversaire est le 15 mars", "Mariage en juin")
3. Verify the review screen shows hot topics with date checkboxes
4. Verify dates are pre-filled when detected
5. Save and verify the hot topic appears in Upcoming tab
6. Add a birthday to a contact and verify 5 birthday hot topics are created
7. Check that only one birthday shows in Upcoming

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup and verify hot topics + events fusion"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add columns to hot_topics | `lib/db.ts` |
| 2 | Migrate events to hot_topics | `lib/db.ts` |
| 3 | Update TypeScript types | `types/index.ts` |
| 4 | Update hot-topic.service | `services/hot-topic.service.ts` |
| 5 | Delete event.service | `services/event.service.ts` |
| 6 | Update backend schema | `backend/src/routes/extract.ts` |
| 7 | Update backend prompt | `backend/src/routes/extract.ts` |
| 8 | Update backend response | `backend/src/routes/extract.ts` |
| 9 | Add translations | `locales/*.json` |
| 10 | Update review state | `app/review.tsx` |
| 11 | Update review UI | `app/review.tsx` |
| 12 | Update review save | `app/review.tsx` |
| 13 | Update upcoming screen | `app/(tabs)/upcoming.tsx` |
| 14 | Add birthday sync | `services/hot-topic.service.ts` |
| 15 | Integrate birthday in contact | `services/contact.service.ts` |
| 16 | Add birthday cleanup | `app/_layout.tsx` |
| 17 | Update notification service | `services/notification.service.ts` |
| 18 | Update evaluators | `backend/src/lib/evaluators.ts` |
| 19 | Final cleanup | All files |
