# Events Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract temporal events from voice notes, display them in a timeline feed, and send push notifications J-1.

**Architecture:** New `Event` entity with extraction via Claude, review screen integration, dedicated tab with timeline UI, and expo-notifications for reminders.

**Tech Stack:** Expo, SQLite, expo-notifications, date-fns, Prisma (backend)

---

## Task 1: Add Event Type to Frontend

**Files:**
- Modify: `frontend/types/index.ts`

**Step 1: Add Event types**

Add after line 114 (after Memory type):

```typescript
export type Event = {
  id: string;
  contactId: string;
  title: string;
  eventDate: string; // ISO 8601
  sourceNoteId?: string;
  notifiedAt?: string;
  createdAt: string;
};

export type ExtractedEvent = {
  title: string;
  eventDate: string; // DD/MM/YYYY format from LLM
};
```

**Step 2: Update ExtractionResult type**

Add `events` field to ExtractionResult (around line 176):

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
  facts: ExtractedFact[];
  hotTopics: ExtractedHotTopic[];
  resolvedTopics: ResolvedTopic[];
  memories: ExtractedMemory[];
  events: ExtractedEvent[]; // NEW
  suggestedGroups?: SuggestedGroup[];
  note: {
    summary: string;
    keyPoints: string[];
  };
};
```

**Step 3: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): add Event and ExtractedEvent types"
```

---

## Task 2: Add Events Table to SQLite

**Files:**
- Modify: `frontend/lib/db.ts`

**Step 1: Add events table to initDatabase**

Add after memories table creation (around line 133):

```typescript
    -- Events (événements temporels)
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      source_note_id TEXT,
      notified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_contact ON events(contact_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
```

**Step 2: Add migration for existing databases**

Add at end of `runMigrations` function:

```typescript
  // Create events table if not exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      source_note_id TEXT,
      notified_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_events_contact ON events(contact_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
  `);
```

**Step 3: Commit**

```bash
git add frontend/lib/db.ts
git commit -m "feat(db): add events table to SQLite schema"
```

---

## Task 3: Create Event Service

**Files:**
- Create: `frontend/services/event.service.ts`

**Step 1: Create event service file**

```typescript
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Event } from '@/types';
import { parseISO, startOfDay, addDays, isBefore } from 'date-fns';

type EventRow = {
  id: string;
  contact_id: string;
  title: string;
  event_date: string;
  source_note_id: string | null;
  notified_at: string | null;
  created_at: string;
};

const mapRowToEvent = (row: EventRow): Event => ({
  id: row.id,
  contactId: row.contact_id,
  title: row.title,
  eventDate: row.event_date,
  sourceNoteId: row.source_note_id || undefined,
  notifiedAt: row.notified_at || undefined,
  createdAt: row.created_at,
});

export const eventService = {
  getByContact: async (contactId: string): Promise<Event[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<EventRow>(
      'SELECT * FROM events WHERE contact_id = ? ORDER BY event_date ASC',
      [contactId]
    );
    return result.map(mapRowToEvent);
  },

  getUpcoming: async (daysAhead: number = 30): Promise<Event[]> => {
    const db = await getDatabase();
    const today = startOfDay(new Date()).toISOString();
    const endDate = addDays(startOfDay(new Date()), daysAhead).toISOString();

    const result = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE event_date >= ? AND event_date <= ?
       ORDER BY event_date ASC`,
      [today, endDate]
    );
    return result.map(mapRowToEvent);
  },

  getPast: async (daysBack: number = 30): Promise<Event[]> => {
    const db = await getDatabase();
    const today = startOfDay(new Date()).toISOString();
    const startDate = addDays(startOfDay(new Date()), -daysBack).toISOString();

    const result = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE event_date >= ? AND event_date < ?
       ORDER BY event_date DESC`,
      [startDate, today]
    );
    return result.map(mapRowToEvent);
  },

  getPendingNotifications: async (): Promise<Event[]> => {
    const db = await getDatabase();
    const tomorrow = addDays(startOfDay(new Date()), 1).toISOString();
    const dayAfterTomorrow = addDays(startOfDay(new Date()), 2).toISOString();

    const result = await db.getAllAsync<EventRow>(
      `SELECT * FROM events
       WHERE event_date >= ? AND event_date < ? AND notified_at IS NULL
       ORDER BY event_date ASC`,
      [tomorrow, dayAfterTomorrow]
    );
    return result.map(mapRowToEvent);
  },

  create: async (data: {
    contactId: string;
    title: string;
    eventDate: string;
    sourceNoteId?: string;
  }): Promise<Event> => {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO events (id, contact_id, title, event_date, source_note_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.contactId, data.title, data.eventDate, data.sourceNoteId || null, now]
    );

    return {
      id,
      contactId: data.contactId,
      title: data.title,
      eventDate: data.eventDate,
      sourceNoteId: data.sourceNoteId,
      createdAt: now,
    };
  },

  update: async (id: string, data: Partial<{
    title: string;
    eventDate: string;
  }>): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.title) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.eventDate) {
      updates.push('event_date = ?');
      values.push(data.eventDate);
    }

    if (updates.length === 0) return;

    values.push(id);
    await db.runAsync(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  markNotified: async (id: string): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync('UPDATE events SET notified_at = ? WHERE id = ?', [now, id]);
  },

  delete: async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
  },

  parseExtractedDate: (dateStr: string): string | null => {
    // Parse DD/MM/YYYY format from LLM
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Validate it's a real date and in the future
    if (isNaN(date.getTime())) return null;
    if (isBefore(date, startOfDay(new Date()))) return null;

    return date.toISOString();
  },
};
```

**Step 2: Commit**

```bash
git add frontend/services/event.service.ts
git commit -m "feat(services): add event service with CRUD operations"
```

---

## Task 4: Update Backend Extraction Schema

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Add events to Zod schema**

Add after `memories` in `extractionSchema` (around line 90):

```typescript
  events: z.array(
    z.object({
      title: z.string().describe('Titre court de l\'événement (ex: "Part pêcher", "Exam de conduite")'),
      eventDate: z.string().describe('Date au format DD/MM/YYYY calculée à partir de la date de référence'),
    })
  ).describe('Événements futurs avec une date précise mentionnée (pas les intentions vagues)'),
```

**Step 2: Update the prompt with reference date**

Modify `buildExtractionPrompt` function. Add at the beginning of the prompt (around line 288):

```typescript
const referenceDate = format(new Date(), 'dd/MM/yyyy');

return `Tu es un assistant qui extrait des informations structurées à partir de notes vocales dans la langue : ${language}.

DATE DE RÉFÉRENCE (fournie par le système, NE PAS déterminer toi-même): ${referenceDate}
```

**Step 3: Add events extraction rules**

Add new section in the prompt rules (after MEMORIES section):

```typescript
8. EVENTS (Événements futurs datés):
   Extrais les événements futurs avec une date PRÉCISE mentionnée.

   RÈGLE CRITIQUE:
   - Utilise UNIQUEMENT la DATE DE RÉFÉRENCE ci-dessus comme "aujourd'hui"
   - Ne détermine JAMAIS la date actuelle toi-même
   - Calcule la date cible à partir de cette référence
   - Retourne la date au format DD/MM/YYYY

   Expressions à convertir:
   - "dans X jours/semaines/mois" → calcule la date exacte
   - "la semaine prochaine" → lundi prochain
   - "le mois prochain" → 1er du mois suivant
   - "fin janvier" → dernier jour du mois
   - "mi-février" → 15 du mois
   - "le 15 janvier" → 15/01/YYYY

   Exemples (si date de référence = 27/12/2024):
   - "Eric part pêcher dans deux semaines" → { title: "Part pêcher", eventDate: "10/01/2025" }
   - "Marie a un exam la semaine prochaine" → { title: "Exam", eventDate: "30/12/2024" }

   NE PAS extraire:
   - Intentions vagues sans date ("il veut partir en vacances un jour")
   - Événements passés
   - Si la date est ambiguë ou incalculable
```

**Step 4: Add events to formatted extraction output**

Update `formattedExtraction` object (around line 230):

```typescript
      events: extraction.events?.map((event) => ({
        title: event.title,
        eventDate: event.eventDate,
      })) || [],
```

**Step 5: Add import for date-fns format**

Add at top of file:

```typescript
import { format } from 'date-fns';
```

**Step 6: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): add temporal events extraction with reference date"
```

---

## Task 5: Add Events Section to Review Screen

**Files:**
- Modify: `frontend/app/review.tsx`

**Step 1: Add imports**

Add to imports:

```typescript
import { eventService } from '@/services/event.service';
import { ExtractedEvent } from '@/types';
import { Calendar } from 'lucide-react-native';
```

**Step 2: Add state for events**

Add after `editingMemoryIndex` state (around line 62):

```typescript
  const [selectedEvents, setSelectedEvents] = useState<number[]>(
    extraction.events?.map((_, index) => index) || []
  );
  const [editableEvents, setEditableEvents] = useState<ExtractedEvent[]>(
    extraction.events?.map((event) => ({ ...event })) || []
  );
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
```

**Step 3: Add toggle and update functions**

Add after `updateMemory` function (around line 156):

```typescript
  const toggleEvent = (index: number) => {
    setSelectedEvents((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const updateEvent = (index: number, field: 'title' | 'eventDate', value: string) => {
    setEditableEvents((prev) =>
      prev.map((event, eventIndex) =>
        eventIndex === index ? { ...event, [field]: value } : event
      )
    );
  };

  const formatRelativeDate = (dateStr: string): string => {
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return dateStr;

    const [, day, month, year] = match;
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return dateStr;
    if (diffDays === 0) return t('review.today');
    if (diffDays === 1) return t('review.tomorrow');
    if (diffDays < 7) return t('review.inDays', { count: diffDays });
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return t('review.inWeeks', { count: weeks });
    }
    const months = Math.floor(diffDays / 30);
    return t('review.inMonths', { count: months });
  };
```

**Step 4: Add save logic for events**

Add in `handleSave` function, after memories saving (around line 308):

```typescript
      // Save events
      if (editableEvents.length > 0) {
        for (const index of selectedEvents) {
          const event = editableEvents[index];
          const parsedDate = eventService.parseExtractedDate(event.eventDate);
          if (parsedDate) {
            await eventService.create({
              contactId: finalContactId,
              title: event.title,
              eventDate: parsedDate,
              sourceNoteId: note.id,
            });
          }
        }
      }
```

**Step 5: Add Events section UI**

Add after Hot Topics section, before Memories (around line 674):

```typescript
      {editableEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={Colors.info} />
            <Text style={styles.sectionTitleWithIcon}>{t('review.events')}</Text>
          </View>

          {editableEvents.map((event, index) => {
            const isEditing = editingEventIndex === index;

            if (isEditing) {
              return (
                <View key={index} style={styles.card}>
                  <TextInput
                    style={[styles.textInput, styles.textInputBold]}
                    value={event.title}
                    onChangeText={(value) => updateEvent(index, 'title', value)}
                    placeholder={t('review.eventTitlePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={event.eventDate}
                    onChangeText={(value) => updateEvent(index, 'eventDate', value)}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Pressable
                    style={styles.confirmButton}
                    onPress={() => setEditingEventIndex(null)}
                  >
                    <Text style={styles.confirmButtonText}>{t('common.confirm')}</Text>
                  </Pressable>
                </View>
              );
            }

            return (
              <View key={index} style={styles.cardRow}>
                <Pressable onPress={() => toggleEvent(index)}>
                  <View
                    style={[
                      styles.checkbox,
                      selectedEvents.includes(index) && styles.checkboxInfo
                    ]}
                  >
                    {selectedEvents.includes(index) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                </Pressable>

                <View style={styles.calendarDot} />

                <Pressable style={styles.cardContent} onPress={() => setEditingEventIndex(index)}>
                  <View style={styles.factRow}>
                    <Text style={styles.factValue}>{event.title}</Text>
                    <Edit3 size={14} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.eventDate}>
                    {event.eventDate} ({formatRelativeDate(event.eventDate)})
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
```

**Step 6: Add styles**

Add to StyleSheet:

```typescript
  checkboxInfo: {
    backgroundColor: Colors.info,
  },
  calendarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.info,
    marginTop: 6,
    marginRight: 12,
  },
  eventDate: {
    fontSize: 14,
    color: Colors.info,
    marginTop: 4,
  },
```

**Step 7: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): add Events section for temporal events"
```

---

## Task 6: Add i18n Keys

**Files:**
- Modify: `frontend/i18n/locales/fr.json`
- Modify: `frontend/i18n/locales/en.json`

**Step 1: Add French translations**

Add in `review` section:

```json
"events": "Événements",
"eventTitlePlaceholder": "Titre de l'événement",
"today": "Aujourd'hui",
"tomorrow": "Demain",
"inDays": "Dans {{count}} jour",
"inDays_plural": "Dans {{count}} jours",
"inWeeks": "Dans {{count}} semaine",
"inWeeks_plural": "Dans {{count}} semaines",
"inMonths": "Dans {{count}} mois"
```

Add new `upcoming` section:

```json
"upcoming": {
  "title": "À venir",
  "past": "Passés",
  "noEvents": "Aucun événement prévu",
  "noPastEvents": "Aucun événement passé",
  "today": "Aujourd'hui"
}
```

Add in `tabs` section:

```json
"upcoming": "À venir"
```

**Step 2: Add English translations**

Add in `review` section:

```json
"events": "Events",
"eventTitlePlaceholder": "Event title",
"today": "Today",
"tomorrow": "Tomorrow",
"inDays": "In {{count}} day",
"inDays_plural": "In {{count}} days",
"inWeeks": "In {{count}} week",
"inWeeks_plural": "In {{count}} weeks",
"inMonths": "In {{count}} months"
```

Add new `upcoming` section:

```json
"upcoming": {
  "title": "Upcoming",
  "past": "Past",
  "noEvents": "No upcoming events",
  "noPastEvents": "No past events",
  "today": "Today"
}
```

Add in `tabs` section:

```json
"upcoming": "Upcoming"
```

**Step 3: Commit**

```bash
git add frontend/i18n/locales/fr.json frontend/i18n/locales/en.json
git commit -m "feat(i18n): add events and upcoming feed translations"
```

---

## Task 7: Create Upcoming Tab

**Files:**
- Create: `frontend/app/(tabs)/upcoming.tsx`

**Step 1: Create the upcoming tab component**

```typescript
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { format, startOfDay, addDays, isSameDay, isToday } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { eventService } from '@/services/event.service';
import { contactService } from '@/services/contact.service';
import { Event, Contact } from '@/types';
import { Colors } from '@/constants/theme';
import { Calendar } from 'lucide-react-native';

type TimelineDay = {
  date: Date;
  events: Array<Event & { contact: Contact }>;
  isToday: boolean;
};

type FeedView = 'upcoming' | 'past';

export default function UpcomingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<FeedView>('upcoming');
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);
  const [pastEvents, setPastEvents] = useState<Array<Event & { contact: Contact }>>([]);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language === 'fr' ? fr : enUS;

  const loadEvents = useCallback(async () => {
    setLoading(true);

    if (view === 'upcoming') {
      const events = await eventService.getUpcoming(30);
      const eventsWithContacts = await Promise.all(
        events.map(async (event) => {
          const contact = await contactService.getById(event.contactId);
          return { ...event, contact: contact! };
        })
      );

      // Build timeline for next 30 days
      const days: TimelineDay[] = [];
      const today = startOfDay(new Date());

      for (let i = 0; i < 30; i++) {
        const date = addDays(today, i);
        const dayEvents = eventsWithContacts.filter((event) =>
          isSameDay(new Date(event.eventDate), date)
        );
        days.push({
          date,
          events: dayEvents,
          isToday: i === 0,
        });
      }

      setTimeline(days);
    } else {
      const events = await eventService.getPast(30);
      const eventsWithContacts = await Promise.all(
        events.map(async (event) => {
          const contact = await contactService.getById(event.contactId);
          return { ...event, contact: contact! };
        })
      );
      setPastEvents(eventsWithContacts);
    }

    setLoading(false);
  }, [view]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const handleEventPress = (contactId: string) => {
    router.push(`/contact/${contactId}`);
  };

  const formatDayHeader = (date: Date, dayIsToday: boolean): string => {
    if (dayIsToday) {
      return `${t('upcoming.today')} — ${format(date, 'EEE d MMM', { locale })}`;
    }
    return format(date, 'EEE d MMM', { locale });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segment, view === 'upcoming' && styles.segmentActive]}
            onPress={() => setView('upcoming')}
          >
            <Text style={[styles.segmentText, view === 'upcoming' && styles.segmentTextActive]}>
              {t('upcoming.title')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, view === 'past' && styles.segmentActive]}
            onPress={() => setView('past')}
          >
            <Text style={[styles.segmentText, view === 'past' && styles.segmentTextActive]}>
              {t('upcoming.past')}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {view === 'upcoming' ? (
          timeline.length > 0 ? (
            timeline.map((day) => (
              <View key={day.date.toISOString()} style={styles.dayContainer}>
                <Text style={[styles.dayHeader, day.isToday && styles.dayHeaderToday]}>
                  {formatDayHeader(day.date, day.isToday)}
                </Text>

                {day.events.length > 0 ? (
                  day.events.map((event) => (
                    <Pressable
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => handleEventPress(event.contactId)}
                    >
                      <Calendar size={16} color={Colors.info} />
                      <View style={styles.eventContent}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventContact}>
                          {event.contact.firstName} {event.contact.lastName || ''}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.emptyDay} />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('upcoming.noEvents')}</Text>
          )
        ) : (
          pastEvents.length > 0 ? (
            pastEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.pastEventCard}
                onPress={() => handleEventPress(event.contactId)}
              >
                <Calendar size={16} color={Colors.textMuted} />
                <View style={styles.eventContent}>
                  <Text style={styles.pastEventTitle}>{event.title}</Text>
                  <Text style={styles.eventContact}>
                    {event.contact.firstName} {event.contact.lastName || ''} • {format(new Date(event.eventDate), 'd MMM', { locale })}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('upcoming.noPastEvents')}</Text>
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textInverse,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  dayContainer: {
    marginBottom: 16,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  dayHeaderToday: {
    color: Colors.primary,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventContent: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  eventContact: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyDay: {
    height: 4,
  },
  pastEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.7,
  },
  pastEventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: 40,
  },
});
```

**Step 2: Commit**

```bash
git add frontend/app/\(tabs\)/upcoming.tsx
git commit -m "feat(upcoming): create timeline feed tab"
```

---

## Task 8: Add Upcoming Tab to Navigation

**Files:**
- Modify: `frontend/app/(tabs)/_layout.tsx`

**Step 1: Add Calendar import**

```typescript
import { Users, User, Calendar } from 'lucide-react-native';
```

**Step 2: Add Upcoming tab**

Add after contacts tab (around line 60):

```typescript
      <Tabs.Screen
        name="upcoming"
        options={{
          title: t('tabs.upcoming'),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
```

**Step 3: Commit**

```bash
git add frontend/app/\(tabs\)/_layout.tsx
git commit -m "feat(navigation): add upcoming tab to bottom navigation"
```

---

## Task 9: Create Notification Service

**Files:**
- Create: `frontend/services/notification.service.ts`

**Step 1: Create notification service**

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { eventService } from './event.service';
import { contactService } from './contact.service';
import { addDays, setHours, setMinutes, setSeconds, isBefore } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  requestPermissions: async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  scheduleEventReminder: async (eventId: string, eventDate: string, title: string, contactName: string): Promise<string | null> => {
    const hasPermission = await notificationService.requestPermissions();
    if (!hasPermission) return null;

    // Calculate J-1 at 19h
    const eventDateObj = new Date(eventDate);
    let triggerDate = addDays(eventDateObj, -1);
    triggerDate = setHours(triggerDate, 19);
    triggerDate = setMinutes(triggerDate, 0);
    triggerDate = setSeconds(triggerDate, 0);

    // Don't schedule if trigger date is in the past
    if (isBefore(triggerDate, new Date())) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recall People',
        body: `Demain : ${contactName} ${title}`,
        data: { eventId },
      },
      trigger: triggerDate,
    });

    return identifier;
  },

  cancelEventReminder: async (notificationId: string): Promise<void> => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  cancelAllReminders: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  setupNotificationListener: (onNotificationTap: (eventId: string) => void): () => void => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const eventId = response.notification.request.content.data?.eventId as string;
      if (eventId) {
        onNotificationTap(eventId);
      }
    });

    return () => subscription.remove();
  },
};
```

**Step 2: Commit**

```bash
git add frontend/services/notification.service.ts
git commit -m "feat(notifications): add push notification service for event reminders"
```

---

## Task 10: Integrate Notifications with Event Creation

**Files:**
- Modify: `frontend/app/review.tsx`

**Step 1: Add notification service import**

```typescript
import { notificationService } from '@/services/notification.service';
```

**Step 2: Schedule notification when saving event**

Update event saving logic in `handleSave`:

```typescript
      // Save events and schedule notifications
      if (editableEvents.length > 0) {
        for (const index of selectedEvents) {
          const event = editableEvents[index];
          const parsedDate = eventService.parseExtractedDate(event.eventDate);
          if (parsedDate) {
            const savedEvent = await eventService.create({
              contactId: finalContactId,
              title: event.title,
              eventDate: parsedDate,
              sourceNoteId: note.id,
            });

            // Schedule notification for J-1 at 19h
            const contactName = extraction.contactIdentified.firstName;
            await notificationService.scheduleEventReminder(
              savedEvent.id,
              parsedDate,
              event.title,
              contactName
            );
          }
        }
      }
```

**Step 3: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): schedule push notifications when saving events"
```

---

## Task 11: Setup Notification Handler in App Layout

**Files:**
- Modify: `frontend/app/_layout.tsx`

**Step 1: Add notification handler**

Find the root layout and add notification listener setup:

```typescript
import { notificationService } from '@/services/notification.service';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// Inside the component
const router = useRouter();

useEffect(() => {
  const cleanup = notificationService.setupNotificationListener(async (eventId) => {
    // Navigate to contact when notification is tapped
    const event = await eventService.getById(eventId);
    if (event) {
      router.push(`/contact/${event.contactId}`);
    }
  });

  return cleanup;
}, []);
```

**Step 2: Add getById to event service**

Add to `frontend/services/event.service.ts`:

```typescript
  getById: async (id: string): Promise<Event | null> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<EventRow>(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    return result ? mapRowToEvent(result) : null;
  },
```

**Step 3: Commit**

```bash
git add frontend/app/_layout.tsx frontend/services/event.service.ts
git commit -m "feat(notifications): setup notification tap handler to navigate to contact"
```

---

## Task 12: Add Backend Prisma Schema (Optional - for sync)

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Step 1: Add Event model**

Add after Memory model:

```prisma
model Event {
  id           String    @id @default(cuid())
  contactId    String    @map("contact_id")
  title        String
  eventDate    DateTime  @map("event_date")
  sourceNoteId String?   @map("source_note_id")
  notifiedAt   DateTime? @map("notified_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  userId       String    @map("user_id")

  contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@map("events")
}
```

**Step 2: Update Contact model**

Add relation to Contact:

```prisma
  events   Event[]
```

**Step 3: Generate Prisma client**

```bash
cd backend && npx prisma generate
```

**Step 4: Commit**

```bash
git add backend/prisma/schema.prisma
git commit -m "feat(prisma): add Event model for future cloud sync"
```

---

## Summary

This plan implements:

1. **Event type & SQLite table** - Data layer for storing events
2. **Event service** - CRUD operations with date parsing
3. **Extraction update** - Claude extracts temporal events with computed dates
4. **Review screen** - Events section with toggle/edit capabilities
5. **Upcoming tab** - Timeline feed with past/future views
6. **Push notifications** - J-1 reminders via expo-notifications
7. **Backend schema** - Prisma model for future sync

Total: 12 tasks, ~30 steps
