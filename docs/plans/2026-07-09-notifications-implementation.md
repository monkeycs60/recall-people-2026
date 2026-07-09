# Chantier Notifications — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Double rappel (veille au soir + jour J au matin) pour tout hot topic daté, snooze "Me le rappeler demain matin", réglage global des heures dans Profile, rappel anniversaire J-7 — 100 % local via expo-notifications, replanifié à l'ouverture.

**Architecture:** Les fonctions pures de calcul de dates vivent dans `lib/notification-schedule.ts` (testées via `node --test`). `services/notification.service.ts` encapsule expo-notifications (catégories/actions incluses). `services/reminder.service.ts` orchestre DB → notifications. Une nouvelle passe `rescheduleEventReminders()` au lancement rend le système auto-réparant (heures modifiées, anniversaires, notifs legacy). Les heures sont persistées en strings "HH:mm" dans `stores/settings-store.ts`.

**Tech Stack:** Expo / React Native, expo-notifications ~0.31, Zustand persist, date-fns, i18n 5 langues (FR/EN/ES/IT/DE), `node --test` + helper `test/helpers/load-ts-module.mjs`.

**Design de référence:** `docs/plans/2026-07-04-product-roadmap-design.md` section 3. Décisions verrouillées : PAS de push serveur, un seul réglage global d'heures (pas par contact/type), snooze = fusion avec le rappel jour J.

**Contraintes frontend (CLAUDE.md):** pas de `useEffect` nouveau (réutiliser les blocs existants de `_layout.tsx`/`profile.tsx` si besoin), pas de `any`, StyleSheet + `@/constants/theme.ts`, toutes les strings en 5 langues, max 5 props par composant.

**État actuel (vérifié le 2026-07-09):**
- `lib/notification-schedule.ts` : veille 19h en dur, not_seen/post_event 10h en dur, digest lundi 9h.
- Rappels d'événements planifiés UNIQUEMENT à la création (`app/review.tsx:523`, `app/contact/[id]/coming-up.tsx:305`) — jamais au lancement.
- Anniversaires : `syncBirthdayHotTopics` (services/hot-topic.service.ts:430) crée le hot topic avec `birthday_contact_id` mais NE PLANIFIE AUCUNE notification.
- `_layout.tsx:243-245` : replanifie not_seen / digest / post_event au lancement avec `{ requestPermission: false }`.
- Aucune catégorie expo-notifications. Le listener (`notification.service.ts:262`) ignore `actionIdentifier`.
- Payloads data actuels : `{eventId}` (event), `{contactId, type:'not_seen'}`, `{type:'weekly_digest'}`, `{contactId, hotTopicId, type:'post_event'}`.
- Tests frontend : `npm test` = `TZ=Europe/Paris node --test test/*.test.mjs`.

---

## Task 0: Branche

```bash
cd /home/clement/Desktop/recall-people-2026 && git checkout master && git checkout -b feat/notifications
```

---

## Task 1: notification-schedule.ts — heures configurables + nouveaux triggers (TDD)

**Files:**
- Modify: `frontend/lib/notification-schedule.ts`
- Test: `frontend/test/notification-schedule.test.mjs`

**Step 1: Écrire les tests qui échouent**

Ajouter à `frontend/test/notification-schedule.test.mjs` (et MODIFIER le test existant `schedules follow-up reminders tomorrow morning` : 10:00 → 08:30) :

```js
test('parses and formats reminder times with fallback', async () => {
  const { parseReminderTime, formatReminderTime, DEFAULT_EVENING_REMINDER_TIME } = await loadModule();

  assert.deepEqual(parseReminderTime('19:00', DEFAULT_EVENING_REMINDER_TIME), { hour: 19, minute: 0 });
  assert.deepEqual(parseReminderTime('8:30', DEFAULT_EVENING_REMINDER_TIME), { hour: 8, minute: 30 });
  assert.deepEqual(parseReminderTime('25:00', DEFAULT_EVENING_REMINDER_TIME), DEFAULT_EVENING_REMINDER_TIME);
  assert.deepEqual(parseReminderTime('garbage', DEFAULT_EVENING_REMINDER_TIME), DEFAULT_EVENING_REMINDER_TIME);
  assert.equal(formatReminderTime({ hour: 8, minute: 30 }), '08:30');
});

test('event evening reminder honors a custom evening time', async () => {
  const { getEventReminderTriggerDate } = await loadModule();

  assert.equal(
    getEventReminderTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00'),
      { hour: 20, minute: 15 }
    )?.toISOString(),
    new Date('2026-05-06T20:15:00+02:00').toISOString()
  );
});

test('schedules a morning-of-event reminder at the configured morning time', async () => {
  const { getEventDayMorningTriggerDate } = await loadModule();

  assert.equal(
    getEventDayMorningTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00')
    )?.toISOString(),
    new Date('2026-05-07T08:30:00+02:00').toISOString()
  );

  assert.equal(
    getEventDayMorningTriggerDate(
      '2026-05-07T12:00:00+02:00',
      new Date('2026-05-07T09:00:00+02:00')
    ),
    null
  );
});

test('schedules a birthday week-ahead reminder 7 days before at morning time', async () => {
  const { getBirthdayWeekAheadTriggerDate } = await loadModule();

  assert.equal(
    getBirthdayWeekAheadTriggerDate(
      '2026-05-14T00:00:00+02:00',
      new Date('2026-05-05T10:00:00+02:00')
    )?.toISOString(),
    new Date('2026-05-07T08:30:00+02:00').toISOString()
  );

  assert.equal(
    getBirthdayWeekAheadTriggerDate(
      '2026-05-14T00:00:00+02:00',
      new Date('2026-05-08T10:00:00+02:00')
    ),
    null
  );
});

test('next morning occurrence is today before the slot, tomorrow after', async () => {
  const { getNextMorningOccurrence } = await loadModule();

  assert.equal(
    getNextMorningOccurrence(new Date('2026-05-05T07:00:00+02:00'), { hour: 8, minute: 30 }).toISOString(),
    new Date('2026-05-05T08:30:00+02:00').toISOString()
  );
  assert.equal(
    getNextMorningOccurrence(new Date('2026-05-05T21:00:00+02:00'), { hour: 8, minute: 30 }).toISOString(),
    new Date('2026-05-06T08:30:00+02:00').toISOString()
  );
});
```

**Step 2: Vérifier l'échec**

Run: `cd frontend && npm test 2>&1 | tail -20`
Expected: FAIL (`parseReminderTime is not a function`, etc.) + le test modifié 08:30 échoue.

**Step 3: Implémentation**

Dans `frontend/lib/notification-schedule.ts` :

```ts
export type ReminderTime = { hour: number; minute: number };

export const DEFAULT_EVENING_REMINDER_TIME: ReminderTime = { hour: 19, minute: 0 };
export const DEFAULT_MORNING_REMINDER_TIME: ReminderTime = { hour: 8, minute: 30 };

export const parseReminderTime = (value: string, fallback: ReminderTime): ReminderTime => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  return { hour, minute };
};

export const formatReminderTime = (time: ReminderTime): string =>
  `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
```

- `atTime(date, time.hour, time.minute)` : réutiliser le helper existant.
- `getEventReminderTriggerDate(eventDate, now = new Date(), eveningTime = DEFAULT_EVENING_REMINDER_TIME)` : remplacer `19, 0` par `eveningTime`.
- Nouveau `getEventDayMorningTriggerDate(eventDate, now = new Date(), morningTime = DEFAULT_MORNING_REMINDER_TIME): Date | null` : `atTime(eventDateObj, ...)` jour J, `null` si passé.
- Nouveau `getBirthdayWeekAheadTriggerDate(eventDate, now, morningTime)` : `atTime(addDays(eventDateObj, -7), ...)`, `null` si passé.
- Nouveau `getNextMorningOccurrence(now, morningTime): Date` : aujourd'hui au créneau si futur, sinon demain.
- `getNotSeenReminderTriggerDate(now = new Date(), morningTime = DEFAULT_MORNING_REMINDER_TIME)` et `getPostEventFollowUpTriggerDate(...)` : remplacer `10, 0` par `morningTime`.

**Step 4: Vérifier le vert**

Run: `npm test 2>&1 | tail -8` → tous PASS.

**Step 5: Commit**

```bash
git add frontend/lib/notification-schedule.ts frontend/test/notification-schedule.test.mjs
git commit -m "feat(frontend): triggers de rappel a heures configurables + jour J + anniversaire J-7"
```

---

## Task 2: settings-store — eveningReminderTime / morningReminderTime

**Files:**
- Modify: `frontend/stores/settings-store.ts`

**Step 1: Implémentation** (pas de test dédié : le store est du câblage zustand ; la logique de parsing est testée en Task 1)

Ajouter au state (avec persistance via `partialize`) :

```ts
eveningReminderTime: string;   // "HH:mm", défaut '19:00'
morningReminderTime: string;   // "HH:mm", défaut '08:30'
```

Actions : `setEveningReminderTime: (time: string) => void` et `setMorningReminderTime: (time: string) => void` (simples `set({...})`, PAS de sync backend — réglage purement local, comme `notSeenThresholdDays`). Ajouter les deux champs dans `partialize`.

**Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -c error` → même nombre d'erreurs qu'avant (baseline pré-existante : vérifier avant de commencer avec `git stash && npx tsc --noEmit 2>&1 | grep -c "error TS" ; git stash pop`).

**Step 3: Commit**

```bash
git add frontend/stores/settings-store.ts
git commit -m "feat(frontend): reglages heures rappels soir/matin dans settings-store"
```

---

## Task 3: notification.service — double rappel, catégorie snooze, anniversaire J-7

**Files:**
- Modify: `frontend/services/notification.service.ts`
- Modify: `frontend/locales/{fr,en,es,it,de}.json`

**Step 1: Constantes et catégorie**

```ts
export const EVENT_EVENING_CATEGORY = 'event_evening_reminder';
export const SNOOZE_TOMORROW_MORNING_ACTION = 'snooze_tomorrow_morning';
```

Nouvelle méthode :

```ts
registerNotificationCategories: async (): Promise<void> => {
  await Notifications.setNotificationCategoryAsync(EVENT_EVENING_CATEGORY, [
    {
      identifier: SNOOZE_TOMORROW_MORNING_ACTION,
      buttonTitle: i18n.t('reminder.snoozeTomorrowMorning'),
      options: { opensAppToForeground: false },
    },
  ]);
},
```

**Step 2: Lire les heures depuis le store**

En haut du fichier :

```ts
import { useSettingsStore } from '@/stores/settings-store';
import {
  parseReminderTime,
  DEFAULT_EVENING_REMINDER_TIME,
  DEFAULT_MORNING_REMINDER_TIME,
  getEventDayMorningTriggerDate,
  getBirthdayWeekAheadTriggerDate,
  getNextMorningOccurrence,
} from '@/lib/notification-schedule';

const getEveningTime = () =>
  parseReminderTime(useSettingsStore.getState().eveningReminderTime, DEFAULT_EVENING_REMINDER_TIME);
const getMorningTime = () =>
  parseReminderTime(useSettingsStore.getState().morningReminderTime, DEFAULT_MORNING_REMINDER_TIME);
```

**Step 3: `scheduleEventReminder` planifie LA PAIRE (veille + jour J)**

Même signature (les appelants `review.tsx` et `coming-up.tsx` ne changent pas). Corps :

- Veille : trigger `getEventReminderTriggerDate(eventDate, new Date(), getEveningTime())`, content `{ title: contactName, body: i18n.t('reminder.eventTomorrow', { title }), categoryIdentifier: EVENT_EVENING_CATEGORY, data: { eventId, type: 'event_evening', title, contactName } }`. (`title`/`contactName` dans data = nécessaire au snooze pour reconstruire la notif du matin sans accès DB.)
- Jour J matin : trigger `getEventDayMorningTriggerDate(eventDate, new Date(), getMorningTime())`, content `{ title: contactName, body: i18n.t('reminder.eventToday', { title }), data: { eventId, type: 'event_morning' } }`.
- Chaque trigger peut être `null` indépendamment (événement demain → veille peut être passée, matin encore valide). Retourner l'identifier de la veille sinon celui du matin, sinon `null`.

**Step 4: Anniversaire J-7**

```ts
scheduleBirthdayWeekAheadReminder: async (
  eventId: string,
  eventDate: string,
  contactFirstName: string,
  options: { requestPermission?: boolean } = {}
): Promise<string | null>
```

Trigger `getBirthdayWeekAheadTriggerDate(eventDate, new Date(), getMorningTime())` ; content `{ title: contactFirstName, body: i18n.t('reminder.birthdayWeekAhead', { firstName: contactFirstName }), data: { eventId, type: 'birthday_week_ahead' } }`.

**Step 5: Snooze + cancel global + listener**

```ts
snoozeEventReminderToMorning: async (eventId: string, title: string, contactName: string): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const morningDuplicates = scheduled.filter(
    (notification) =>
      notification.content.data?.eventId === eventId &&
      notification.content.data?.type === 'event_morning'
  );
  await Promise.all(
    morningDuplicates.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );

  await Notifications.scheduleNotificationAsync({
    content: {
      title: contactName,
      body: i18n.t('reminder.eventToday', { title }),
      data: { eventId, type: 'event_morning' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: getNextMorningOccurrence(new Date(), getMorningTime()),
    },
  });
},

cancelAllEventReminders: async (): Promise<void> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const eventReminders = scheduled.filter((notification) => {
    const data = notification.content.data;
    return typeof data?.eventId === 'string' && data.eventId.length > 0;
  });
  await Promise.all(
    eventReminders.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier)
    )
  );
},
```

(`cancelAllEventReminders` filtre sur la présence de `eventId` → couvre aussi les notifs legacy sans `type`.)

Listener : signature du callback devient `(data: Record<string, unknown>, actionIdentifier: string) => void` ; passer `response.actionIdentifier`.

**Step 6: i18n (5 langues, toutes obligatoires)**

Clés à ajouter sous `reminder`:

| clé | fr | en | es | it | de |
|---|---|---|---|---|---|
| `eventToday` | `C'est aujourd'hui : {{title}}. Envoie un petit mot 💬` | `It's today: {{title}}. Send them a note 💬` | `Es hoy: {{title}}. Mándale un mensaje 💬` | `È oggi: {{title}}. Manda un messaggio 💬` | `Heute ist es so weit: {{title}}. Schreib eine Nachricht 💬` |
| `birthdayWeekAhead` | `Anniversaire de {{firstName}} dans une semaine 🎁` | `{{firstName}}'s birthday is in a week 🎁` | `El cumpleaños de {{firstName}} es en una semana 🎁` | `Il compleanno di {{firstName}} è tra una settimana 🎁` | `{{firstName}} hat in einer Woche Geburtstag 🎁` |
| `snoozeTomorrowMorning` | `Me le rappeler demain matin` | `Remind me tomorrow morning` | `Recuérdamelo mañana por la mañana` | `Ricordamelo domani mattina` | `Morgen früh erinnern` |

**Step 7: Typecheck + tests + commit**

Run: `npx tsc --noEmit` (baseline inchangée) et `npm test` (tous PASS).

```bash
git add frontend/services/notification.service.ts frontend/locales/
git commit -m "feat(frontend): double rappel veille+jour J, snooze demain matin, anniversaire J-7"
```

---

## Task 4: replanification au lancement + handler snooze dans _layout

**Files:**
- Modify: `frontend/services/reminder.service.ts`
- Modify: `frontend/app/_layout.tsx`

**Step 1: `reminderService.rescheduleEventReminders`**

```ts
const EVENT_RESCHEDULE_LIMIT = 15;

type UpcomingDatedHotTopic = {
  id: string;
  title: string;
  event_date: string;
  birthday_contact_id: string | null;
  first_name: string;
  last_name: string | null;
};

rescheduleEventReminders: async (options: ScheduleOptions = {}) => {
  const db = await getDatabase();
  await notificationService.cancelAllEventReminders();

  const todayIso = startOfDay(new Date()).toISOString();
  const upcomingTopics = await db.getAllAsync<UpcomingDatedHotTopic>(
    `SELECT ht.id, ht.title, ht.event_date, ht.birthday_contact_id, c.first_name, c.last_name
     FROM hot_topics ht
     JOIN contacts c ON c.id = ht.contact_id
     WHERE ht.status = 'active'
       AND ht.event_date IS NOT NULL
       AND ht.event_date >= ?
       AND ht.deleted_at IS NULL
       AND c.deleted_at IS NULL
     ORDER BY ht.event_date ASC
     LIMIT ${EVENT_RESCHEDULE_LIMIT}`,
    [todayIso]
  );

  for (const topic of upcomingTopics) {
    const contactName = topic.last_name
      ? `${topic.first_name} ${topic.last_name}`
      : topic.first_name;

    await notificationService.scheduleEventReminder(
      topic.id,
      topic.event_date,
      topic.title,
      contactName,
      options
    );

    if (topic.birthday_contact_id) {
      await notificationService.scheduleBirthdayWeekAheadReminder(
        topic.id,
        topic.event_date,
        topic.first_name,
        options
      );
    }
  }
},
```

(Limite 15 : iOS plafonne à 64 notifications programmées ; 15×2 + anniversaires + not_seen(5) + digest + post_event(3) reste sous la barre.)

**Step 2: câblage `_layout.tsx`**

Dans `syncAndScheduleReminders` (ligne ~236), ajouter APRÈS les trois appels existants :

```ts
await reminderService.rescheduleEventReminders(scheduleOptions);
await notificationService.registerNotificationCategories();
```

Dans le listener de notifications (ligne ~199), nouvelle signature `(data, actionIdentifier)` ; AVANT le routing :

```ts
if (actionIdentifier === SNOOZE_TOMORROW_MORNING_ACTION) {
  const eventId = typeof data.eventId === 'string' ? data.eventId : null;
  const title = typeof data.title === 'string' ? data.title : '';
  const contactName = typeof data.contactName === 'string' ? data.contactName : '';
  if (eventId) {
    await notificationService.snoozeEventReminderToMorning(eventId, title, contactName);
  }
  return;
}
```

(Import `SNOOZE_TOMORROW_MORNING_ACTION` depuis le service. Un tap normal a `actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER` → le routing existant reste inchangé.)

**Step 3: Typecheck + tests + commit**

```bash
git add frontend/services/reminder.service.ts frontend/app/_layout.tsx
git commit -m "feat(frontend): replanification des rappels d'evenements au lancement + action snooze"
```

---

## Task 5: réglage des heures dans Profile (UI + replanification immédiate)

**Files:**
- Modify: `frontend/app/(tabs)/profile.tsx`
- Modify: `frontend/locales/{fr,en,es,it,de}.json`

**Step 1: UI**

Dans la `SettingsSection` notifications (ligne ~304), ajouter DEUX `SettingsRow` NON premium-gated (avant le bloc `{isPremium && ...}`) :

- `label={t('settings.eveningReminderTime')}`, `description={t('settings.eveningReminderTimeDescription')}`, `value={eveningReminderTime}`, icône `Moon` (lucide-react-native), `onPress` ouvre un `DateTimePicker` mode `time`.
- Idem matin : `settings.morningReminderTime`, icône `Sun`, `value={morningReminderTime}`.

Pattern picker : copier l'usage de `@react-native-community/datetimepicker` de `components/contact/TimelineEventEditSheet.tsx` (state `showEveningPicker`/`showMorningPicker`, `mode="time"`, `is24Hour`). Convertir Date ↔ "HH:mm" avec `parseReminderTime`/`formatReminderTime` de `@/lib/notification-schedule`.

**Step 2: handlers avec replanification immédiate**

```ts
const handleEveningTimeChange = useCallback((time: string) => {
  setEveningReminderTime(time);
  reminderService.rescheduleEventReminders().catch((error) => {
    console.warn('[profile] Failed to reschedule event reminders:', error);
  });
}, [setEveningReminderTime]);

const handleMorningTimeChange = useCallback((time: string) => {
  setMorningReminderTime(time);
  Promise.all([
    reminderService.rescheduleEventReminders(),
    reminderService.scheduleNotSeenReminders(),
    reminderService.schedulePostEventFollowUps(),
  ]).catch((error) => {
    console.warn('[profile] Failed to reschedule reminders:', error);
  });
}, [setMorningReminderTime]);
```

**Step 3: i18n (5 langues)**

Sous `settings`:

| clé | fr | en | es | it | de |
|---|---|---|---|---|---|
| `eveningReminderTime` | `Rappels du soir` | `Evening reminders` | `Recordatorios de la tarde` | `Promemoria serali` | `Abenderinnerungen` |
| `eveningReminderTimeDescription` | `La veille d'un événement` | `The evening before an event` | `La víspera de un evento` | `La sera prima di un evento` | `Am Vorabend eines Ereignisses` |
| `morningReminderTime` | `Rappels du matin` | `Morning reminders` | `Recordatorios de la mañana` | `Promemoria mattutini` | `Morgenerinnerungen` |
| `morningReminderTimeDescription` | `Le jour J et les relances` | `On the day and follow-ups` | `El día del evento y seguimientos` | `Il giorno stesso e i follow-up` | `Am Tag selbst und Nachfassen` |

**Step 4: Typecheck + tests + commit**

```bash
git add frontend/app/\(tabs\)/profile.tsx frontend/locales/
git commit -m "feat(frontend): reglage global des heures de rappel dans Profile"
```

---

## Task 6: analytics + POSTHOG.md

**Files:**
- Modify: `frontend/lib/analytics.ts` (suivre le pattern de l'enum `AnalyticsEvent` existant)
- Modify: `frontend/app/_layout.tsx`, `frontend/app/(tabs)/profile.tsx`
- Modify: `POSTHOG.md`

**Step 1:** Ajouter les events (noms exacts à adapter au pattern de l'enum existant) :
- `NOTIFICATION_SNOOZED = 'notification_snoozed'` — capturé dans le handler snooze de `_layout.tsx` (propriété `type: 'event_evening'`).
- `REMINDER_TIME_CHANGED = 'reminder_time_changed'` — capturé dans les handlers de profile.tsx (propriétés `slot: 'evening' | 'morning'` ; PAS l'heure exacte, donnée peu utile).

**Step 2:** Mettre à jour `POSTHOG.md` (section mobile) : documenter les 2 nouveaux events + le double rappel (un événement daté programme désormais 2 notifications locales, 3 pour un anniversaire).

**Step 3: Commit**

```bash
git add frontend/lib/analytics.ts frontend/app/_layout.tsx frontend/app/\(tabs\)/profile.tsx POSTHOG.md
git commit -m "feat(frontend): analytics snooze + changement d'heure de rappel, POSTHOG.md a jour"
```

---

## Task 7: vérification finale

**Step 1:** `cd frontend && npm test` → tous PASS.
**Step 2:** `npx tsc --noEmit` → baseline inchangée (comparer au compte noté en Task 2).
**Step 3:** `npx expo lint 2>&1 | tail -5` → pas de nouvelle erreur.
**Step 4:** Relire le diff complet `git diff master...HEAD` : cohérence naming, pas de `any`, pas de nouveau `useEffect`, i18n 5 langues partout.

---

## Notes pour l'exécuteur

- **NE PAS toucher** aux quotas premium : les rappels d'événements et le réglage d'heures sont GRATUITS ; digest et post_event restent premium (le passage de post_event en gratuit est le chantier suivant, pas celui-ci).
- Le wording jour J est orienté ACTION (« envoie un mot »), pas saisie.
- `scheduleEventReminder` garde sa signature → `review.tsx` et `coming-up.tsx` ne changent pas.
- Les notifs legacy (data `{eventId}` sans `type`) sont nettoyées par `cancelAllEventReminders` à la première ouverture.
- Émulateur/QA : pour déclencher une notif réelle rapidement, régler l'heure du soir à now+2min avec un événement demain (la veille = aujourd'hui).
