# Design: Feed "À Venir" avec Events Temporels

**Date:** 2025-12-27
**Status:** Validated

---

## Objectif

Extraire automatiquement les événements temporels depuis les notes vocales, les afficher dans un feed timeline, et notifier l'utilisateur J-1.

## Décisions prises

| Question | Décision |
|----------|----------|
| Calendar vs Feed | Feed interne (pas Google Calendar) |
| Interface | Tab dédiée + Push notifications |
| Extraction | Dates explicites uniquement, Claude calcule |
| Review | Nouveau type "Events" séparé des Hot Topics |
| Push timing | J-1 à 19h |
| Feed UX | Timeline visuelle jour par jour |
| Events passés | Disparaissent après 24h, sous-onglet "Passés" |
| Tap event | Ouvre la fiche contact |

---

## Data Model

### Backend — Prisma

```prisma
model Event {
  id           String    @id @default(cuid())
  contactId    String
  contact      Contact   @relation(fields: [contactId], references: [id])
  title        String
  eventDate    DateTime
  sourceNoteId String?
  note         Note?     @relation(fields: [sourceNoteId], references: [id])
  notifiedAt   DateTime?
  createdAt    DateTime  @default(now())
  userId       String
}
```

### Frontend — SQLite

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_date TEXT NOT NULL,
  source_note_id TEXT,
  notified_at TEXT,
  created_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);
```

### Type extraction

```typescript
type ExtractedEvent = {
  title: string;      // "Part pêcher"
  eventDate: string;  // "10/01/2025"
};
```

---

## Extraction temporelle

### Approche

Claude calcule la date directement. Pas de parsing regex côté backend.

### Modification du prompt

```typescript
const systemPrompt = `
REFERENCE DATE (provided by system, do not determine yourself): ${format(new Date(), 'dd/MM/yyyy')}

When the user mentions future events with relative dates:
1. USE ONLY the reference date above as your "today" — never infer or guess the current date
2. Calculate the target date based on this reference
3. Return the computed date in DD/MM/YYYY format

Examples (assuming reference date is 27/12/2024):
- "dans deux semaines" → "10/01/2025"
- "la semaine prochaine" → "30/12/2024" (next Monday)
- "fin janvier" → "31/01/2025"
- "le 15 février" → "15/02/2025"

If the date expression is ambiguous or you cannot compute a precise date, do not extract an event.
`;
```

### Expressions supportées

- "demain", "après-demain"
- "dans X jours/semaines/mois"
- "la semaine prochaine", "le mois prochain"
- "ce weekend", "ce soir"
- "fin/mi/début [mois]"
- "le 15 janvier", "le 15/01"

### Backend validation

```typescript
function parseEventDate(dateStr: string): Date | null {
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return isValid(date) && date > new Date() ? date : null;
}
```

---

## Review UI

### Position

Après Hot Topics, avant Memories.

### Maquette

```
┌─────────────────────────────────────────┐
│  EVENTS                                 │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ ☑️  Part pêcher                     ││
│  │     📅 10/01/2025  (dans 14 jours)  ││
│  │     [Modifier la date]              ││
│  └─────────────────────────────────────┘│
│                                         │
│  + Ajouter un event manuellement        │
└─────────────────────────────────────────┘
```

### Interactions

| Action | Comportement |
|--------|--------------|
| Toggle checkbox | Inclure/exclure de la sauvegarde |
| Tap titre | Éditer inline |
| Tap date | DatePicker natif |
| "+ Ajouter" | Création manuelle |

### Composant

```typescript
type EventCardProps = {
  event: ExtractedEvent;
  enabled: boolean;
  onToggle: () => void;
  onEditTitle: (title: string) => void;
  onEditDate: (date: Date) => void;
};
```

---

## Timeline Feed

### Structure tab

```
┌─────────────────────────────────────────┐
│  ┌──────────────┐ ┌──────────────┐      │
│  │   À venir    │ │   Passés 🕐  │      │
│  └──────────────┘ └──────────────┘      │
├─────────────────────────────────────────┤
│                                         │
│  Aujourd'hui — Ven 27 déc               │
│  └ (aucun event)                        │
│                                         │
│  Dim 29 déc                             │
│  └ 🎂 Anniv Paul                        │
│                                         │
│  Ven 10 jan                             │
│  └ 🎣 Eric part pêcher                  │
│  └ ✈️  Marie rentre de voyage           │
│                                         │
└─────────────────────────────────────────┘
```

### Logique

```typescript
type FeedView = 'upcoming' | 'past';
const [view, setView] = useState<FeedView>('upcoming');

type TimelineDay = {
  date: Date;
  events: Event[];
  isToday: boolean;
};

function buildTimeline(events: Event[], daysAhead: number = 30): TimelineDay[] {
  const days: TimelineDay[] = [];
  const today = startOfDay(new Date());

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i);
    days.push({
      date,
      events: events.filter(e => isSameDay(e.eventDate, date)),
      isToday: i === 0,
    });
  }
  return days;
}
```

### Onglet "À venir"

- Timeline 30 prochains jours
- Jours sans events affichés (discrets, opacity réduite)
- Scroll infini vers le futur

### Onglet "Passés"

- Events des 30 derniers jours
- Ordre inversé (plus récent en haut)
- Jours sans events masqués
- Style grisé

### Tap event

Navigation vers fiche contact : `router.push(/contact/${event.contactId})`

---

## Push Notifications

### Règle

J-1 à 19h, une notif par event.

### Format

```
┌─────────────────────────────────────────┐
│  Recall People                          │
│  Demain : Eric part pêcher 🎣           │
│  Tap pour voir sa fiche                 │
└─────────────────────────────────────────┘
```

### Implémentation

```typescript
import * as Notifications from 'expo-notifications';

async function scheduleEventReminder(event: Event, contact: Contact) {
  const triggerDate = new Date(event.eventDate);
  triggerDate.setDate(triggerDate.getDate() - 1);
  triggerDate.setHours(19, 0, 0, 0);

  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recall People',
      body: `Demain : ${contact.firstName} ${event.title}`,
      data: { contactId: contact.id, eventId: event.id },
    },
    trigger: triggerDate,
  });
}
```

### Gestion tap

```typescript
Notifications.addNotificationResponseReceivedListener((response) => {
  const { contactId } = response.notification.request.content.data;
  router.push(`/contact/${contactId}`);
});
```

### Scheduling

- À la sauvegarde d'un event
- Si modifié → annuler et reschedule

### Permissions

Demander au premier event créé (pas au lancement).

---

## Hors scope V1

- Intégration Google Calendar
- Events vagues sans date précise
- Configuration des rappels
- Récurrence

---

## Fichiers à créer/modifier

```
backend/
├── prisma/schema.prisma        # + model Event
├── src/routes/extract.ts       # + extraction events
└── src/routes/events.ts        # CRUD events (nouveau)

frontend/
├── lib/db.ts                   # + table events
├── types/event.ts              # types (nouveau)
├── services/events.ts          # service (nouveau)
├── services/notifications.ts   # scheduling (nouveau)
├── components/review/EventCard.tsx    # (nouveau)
├── app/(tabs)/upcoming.tsx     # tab feed (nouveau)
└── app/review.tsx              # + section Events
```
