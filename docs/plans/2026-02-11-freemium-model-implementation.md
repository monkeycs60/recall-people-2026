# Freemium Model Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current one-time credit system with a reverse trial (14 days) + contact-based limit (15 contacts) + monthly renewable quotas + proactive reminder features.

**Architecture:** Backend tracks trial dates and monthly quotas (avatars, AI questions). Frontend enforces contact limit locally (SQLite contact count). Proactive reminders use local notifications only — zero API cost. Premium features gated by `isPremium` check in subscription store.

**Tech Stack:** Prisma (PostgreSQL backend), Expo SQLite (frontend), Zustand (state), expo-notifications (local notifications), RevenueCat (subscriptions), i18n (5 languages: fr, en, es, it, de).

**Design doc:** `docs/plans/2026-02-11-freemium-model-redesign.md`

---

## Task 1: Backend — Add Trial Dates & Monthly Quota Fields

**Files:**
- Modify: `backend/prisma/schema.prisma` (User model, lines 15-35)
- Modify: `backend/src/routes/subscription.ts` (all endpoints)

**Step 1: Update Prisma schema**

Add to the `User` model in `schema.prisma`:

```prisma
model User {
  // ... existing fields ...

  // Replace one-time trials with monthly quotas
  freeNoteTrials   Int      @default(10) @map("free_note_trials")   // KEEP for backward compat during migration
  freeAskTrials    Int      @default(10) @map("free_ask_trials")    // KEEP for backward compat
  freeAvatarTrials Int      @default(5) @map("free_avatar_trials")  // KEEP for backward compat

  // NEW: Trial tracking
  trialStartDate   DateTime? @map("trial_start_date")
  trialEndDate     DateTime? @map("trial_end_date")

  // NEW: Monthly quotas (renewable)
  avatarMonthlyUsed  Int      @default(0) @map("avatar_monthly_used")
  avatarMonthKey     String   @default("") @map("avatar_month_key")  // "2026-02"
  askMonthlyUsed     Int      @default(0) @map("ask_monthly_used")
  askMonthKey        String   @default("") @map("ask_month_key")     // "2026-02"
}
```

**Step 2: Generate and apply migration**

Run:
```bash
cd backend && npx prisma migrate dev --name add-trial-and-monthly-quotas
```

**Step 3: Rewrite subscription endpoints**

Replace the trial endpoints in `backend/src/routes/subscription.ts` with:

- `GET /api/subscription/trial-status` — Returns `{ isInTrial, trialStartDate, trialEndDate, daysRemaining }`. If `trialStartDate` is null, start the trial now (set `trialStartDate = now`, `trialEndDate = now + 14 days`).
- `GET /api/subscription/quotas` — Returns monthly quota status for avatars and AI questions. Auto-resets if `monthKey` has changed. Response: `{ avatarUsed, avatarLimit, askUsed, askLimit, isPremium }`.
- `POST /api/subscription/use-avatar-quota` — Decrement avatar monthly quota (replaces `use-avatar-trial`). Returns 403 if exhausted.
- `POST /api/subscription/use-ask-quota` — Decrement ask monthly quota (replaces `use-ask-trial`). Returns 403 if exhausted.

Constants at top of file:
```typescript
const TRIAL_DURATION_DAYS = 14;
const FREE_AVATARS_PER_MONTH = 5;
const FREE_ASK_PER_MONTH = 10;
const TRIAL_AVATARS_LIMIT = 20;
```

Quota logic: During trial, avatar limit = `TRIAL_AVATARS_LIMIT` (20). After trial, avatar limit = `FREE_AVATARS_PER_MONTH` (5/month). Premium = unlimited (-1).

Keep old endpoints (`use-note-trial`, `use-ask-trial`, `use-avatar-trial`, `trials`) working temporarily for backward compatibility with older app versions, but mark as deprecated.

**Step 4: Commit**

```bash
git add backend/prisma/ backend/src/routes/subscription.ts
git commit -m "feat(backend): add trial dates and monthly quota system"
```

---

## Task 2: Frontend — Subscription Store Refactor

**Files:**
- Modify: `frontend/stores/subscription-store.ts`
- Modify: `frontend/lib/api.ts` (add new API calls)

**Step 1: Add new API functions in `frontend/lib/api.ts`**

Add after the existing trial functions:

```typescript
// NEW: Trial status
export type TrialStatusResponse = {
  isInTrial: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemaining: number;
};

export const getTrialStatus = async (): Promise<TrialStatusResponse | null> => {
  try {
    return await apiCall<TrialStatusResponse>('/api/subscription/trial-status', { showErrorToast: false });
  } catch (error) {
    console.error('[API] getTrialStatus error:', error);
    return null;
  }
};

// NEW: Monthly quotas
export type QuotasResponse = {
  avatarUsed: number;
  avatarLimit: number;
  askUsed: number;
  askLimit: number;
  isPremium: boolean;
};

export const getQuotas = async (): Promise<QuotasResponse | null> => {
  try {
    return await apiCall<QuotasResponse>('/api/subscription/quotas', { showErrorToast: false });
  } catch (error) {
    console.error('[API] getQuotas error:', error);
    return null;
  }
};

export const useAvatarQuota = async (): Promise<UseTrialResponse> => {
  return apiCall('/api/subscription/use-avatar-quota', { method: 'POST', showErrorToast: false });
};

export const useAskQuota = async (): Promise<UseTrialResponse> => {
  return apiCall('/api/subscription/use-ask-quota', { method: 'POST', showErrorToast: false });
};
```

**Step 2: Refactor subscription store**

Rewrite `frontend/stores/subscription-store.ts` state type:

```typescript
type SubscriptionState = {
  isPremium: boolean;
  isTestPro: boolean;
  isHydrated: boolean;
  isSyncing: boolean;

  // Trial
  isInTrial: boolean;
  trialEndDate: string | null;
  trialDaysRemaining: number;

  // Monthly quotas
  avatarUsed: number;
  avatarLimit: number;
  askUsed: number;
  askLimit: number;

  // Legacy (keep for migration)
  notesCreatedThisMonth: number;
  currentMonthKey: string;
};
```

New actions:
```typescript
type SubscriptionActions = {
  // ... keep existing setIsPremium, activateTestPro, deactivateTestPro, checkWhitelistStatus ...

  // NEW
  syncTrialAndQuotas: () => Promise<void>;   // replaces syncTrialsStatus
  canCreateContact: (currentCount: number) => boolean;  // NEW: contact limit check
  canGenerateAvatar: () => boolean;          // rewritten for monthly quotas
  canUseAsk: () => boolean;                  // rewritten for monthly quotas
  getMaxRecordingDuration: () => number;     // keep as-is
  isTrialActive: () => boolean;              // NEW

  // ... keep canCreateNote, incrementNotesCount for backward compat ...
};
```

Constants:
```typescript
const FREE_CONTACTS_LIMIT = 15;
const FREE_MAX_DURATION_SECONDS = 60;
const PREMIUM_MAX_DURATION_SECONDS = 180;
```

Key logic:
- `canCreateContact(currentCount)`: returns `true` if premium OR `currentCount < FREE_CONTACTS_LIMIT`
- `canGenerateAvatar()`: returns `true` if premium OR (in trial AND `avatarUsed < 20`) OR (not in trial AND `avatarUsed < avatarLimit`)
- `canUseAsk()`: returns `true` if premium OR (in trial) OR `askUsed < askLimit`
- `syncTrialAndQuotas()`: calls `getTrialStatus()` + `getQuotas()` and updates store

**Step 3: Commit**

```bash
git add frontend/stores/subscription-store.ts frontend/lib/api.ts
git commit -m "feat(frontend): refactor subscription store for trial + monthly quotas"
```

---

## Task 3: Frontend — Contact Limit Enforcement

**Files:**
- Modify: `frontend/stores/contacts-store.ts` (add limit check before creation)
- Modify: `frontend/app/select-contact.tsx` (block creation when at limit)
- Modify: `frontend/app/review.tsx` (block creation when at limit)
- Modify: `frontend/components/Paywall.tsx` (add `contact_limit` reason)

**Step 1: Add contact limit check in contacts-store**

In `frontend/stores/contacts-store.ts`, modify `createContact`:

```typescript
createContact: async (data) => {
  const contactCount = get().contacts.length;
  const canCreate = useSubscriptionStore.getState().canCreateContact(contactCount);

  if (!canCreate) {
    throw new Error('CONTACT_LIMIT_REACHED');
  }

  const newContact = await contactService.create(data);
  await get().loadContacts();
  return newContact;
},
```

**Step 2: Handle limit in select-contact.tsx**

In `handleCreateNew` function, wrap the contact creation in a try/catch. If error message is `CONTACT_LIMIT_REACHED`, show the paywall with reason `contact_limit`.

**Step 3: Handle limit in review.tsx**

Same pattern: before creating a new contact during review, check `canCreateContact`. If false, show paywall.

**Step 4: Add `contact_limit` to Paywall**

In `frontend/components/Paywall.tsx`:
- Add `'contact_limit'` to the `PaywallReason` type
- Add case in `getReasonText()`: `case 'contact_limit': return t('paywall.reason.contactLimit');`
- Update features list to include contact-related messaging

**Step 5: Add i18n keys for `contact_limit`**

In all 5 locale files (`fr.json`, `en.json`, `es.json`, `it.json`, `de.json`), add under `paywall.reason`:
- FR: `"contactLimit": "Tu as atteint la limite de 15 contacts gratuits"`
- EN: `"contactLimit": "You've reached the 15 free contacts limit"`
- ES: `"contactLimit": "Has alcanzado el limite de 15 contactos gratuitos"`
- IT: `"contactLimit": "Hai raggiunto il limite di 15 contatti gratuiti"`
- DE: `"contactLimit": "Du hast das Limit von 15 kostenlosen Kontakten erreicht"`

**Step 6: Commit**

```bash
git add frontend/stores/contacts-store.ts frontend/app/select-contact.tsx frontend/app/review.tsx frontend/components/Paywall.tsx frontend/locales/
git commit -m "feat(frontend): enforce 15-contact limit for free users"
```

---

## Task 4: Frontend — Replace One-Time Trials with Monthly Quotas

**Files:**
- Modify: `frontend/components/contact/AvatarEditModal.tsx`
- Modify: `frontend/components/profile/UserAvatarEditModal.tsx`
- Modify: `frontend/app/(tabs)/search.tsx`
- Modify: `frontend/app/review.tsx` (avatar generation during review)

**Step 1: Update avatar generation checks**

In `AvatarEditModal.tsx` and `UserAvatarEditModal.tsx`:
- Replace `canGenerateAvatar()` check (already uses subscription store — logic is updated in Task 2)
- Replace `trialsRemaining` display with `avatarQuotaRemaining` (show `avatarLimit - avatarUsed`)
- Replace `useAvatarTrial()` API call with `useAvatarQuota()`

**Step 2: Update AI assistant checks**

In `search.tsx`:
- Replace `canUseAsk()` check (already uses subscription store)
- Replace `trialsRemaining` display with monthly quota remaining
- Replace `useAskTrial()` API call with `useAskQuota()`

**Step 3: Update review.tsx avatar generation**

Line 571: `canGenerateAvatar()` already reads from subscription store — no change needed after Task 2. But update the `useAvatarTrial()` call to `useAvatarQuota()`.

**Step 4: Update i18n**

Replace `trialsRemaining` strings in all 5 locales:
- FR: `"quotaRemaining": "{{used}}/{{limit}} ce mois-ci"` (for both avatar and ask sections)
- EN: `"quotaRemaining": "{{used}}/{{limit}} this month"`
- Similar for ES, IT, DE

**Step 5: Commit**

```bash
git add frontend/components/contact/AvatarEditModal.tsx frontend/components/profile/UserAvatarEditModal.tsx frontend/app/(tabs)/search.tsx frontend/app/review.tsx frontend/locales/
git commit -m "feat(frontend): replace one-time trials with monthly quotas"
```

---

## Task 5: Frontend — Trial UI (Countdown Banner)

**Files:**
- Create: `frontend/components/TrialBanner.tsx`
- Modify: `frontend/app/(tabs)/index.tsx` (or main layout — show banner at top)

**Step 1: Create TrialBanner component**

Simple banner at top of main screen showing:
- During trial: "Essai gratuit — X jours restants" with a progress bar
- Trial expired, not premium: "Essai termine — Passer a Pro" with upgrade button
- Premium: don't show

Uses `useSubscriptionStore` to read `isInTrial`, `trialDaysRemaining`, `isPremium`.

Tapping the banner opens the Paywall.

**Step 2: Add banner to main tab layout**

Add `<TrialBanner />` at the top of the main contacts list screen or in the tab layout wrapper.

**Step 3: Add i18n keys**

- FR: `"trial.daysRemaining": "Essai gratuit — {{count}} jour(s) restant(s)"`, `"trial.expired": "Essai termine"`, `"trial.upgrade": "Passer a Pro"`
- EN, ES, IT, DE equivalents

**Step 4: Commit**

```bash
git add frontend/components/TrialBanner.tsx frontend/app/ frontend/locales/
git commit -m "feat(frontend): add trial countdown banner"
```

---

## Task 6: Frontend — SQLite Migration for Reminder Features

**Files:**
- Modify: `frontend/lib/db.ts` (add migration in `runMigrations`)

**Step 1: Add `reminder_frequency_days` column to contacts table**

In `runMigrations()` in `frontend/lib/db.ts`, add after existing migrations:

```typescript
// Migration: Add reminder_frequency_days to contacts
const hasReminderFrequency = contactsInfo.some((col) => col.name === 'reminder_frequency_days');
if (!hasReminderFrequency) {
  await database.execAsync("ALTER TABLE contacts ADD COLUMN reminder_frequency_days INTEGER");
}
```

This column is nullable — `null` means "use global default", a number means "remind me every X days for this contact".

**Step 2: Update Contact type**

In `frontend/types/index.ts`, add to the `Contact` type:
```typescript
reminderFrequencyDays?: number;
```

**Step 3: Update contact service**

In `frontend/services/contact.service.ts`:
- Add `reminder_frequency_days` to the SELECT in `getAll()` and `getById()`
- Map it to `reminderFrequencyDays` in the return object

**Step 4: Commit**

```bash
git add frontend/lib/db.ts frontend/types/index.ts frontend/services/contact.service.ts
git commit -m "feat(frontend): add reminder_frequency_days column to contacts"
```

---

## Task 7: Frontend — "Not Seen" Reminders (Free Feature)

**Files:**
- Modify: `frontend/stores/settings-store.ts` (add `notSeenThresholdDays`)
- Create: `frontend/services/reminder.service.ts`
- Modify: `frontend/app/_layout.tsx` or app entry point (schedule on launch)
- Modify: `frontend/app/(tabs)/profile.tsx` (settings UI)

**Step 1: Add threshold to settings store**

In `frontend/stores/settings-store.ts`:
```typescript
type SettingsState = {
  language: Language;
  isHydrated: boolean;
  hasSeenOnboarding: boolean;
  notSeenThresholdDays: number; // NEW — default 60
};
```

Default: `60`. Persisted via AsyncStorage. Add `setNotSeenThresholdDays` action.

**Step 2: Create reminder service**

Create `frontend/services/reminder.service.ts`:

```typescript
import { getDatabase } from '@/lib/db';
import { notificationService } from './notification.service';
import { useSettingsStore } from '@/stores/settings-store';
import { useSubscriptionStore } from '@/stores/subscription-store';
import { differenceInDays } from 'date-fns';

export const reminderService = {
  scheduleNotSeenReminders: async () => {
    const db = await getDatabase();
    const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;

    // Get contacts not seen in > thresholdDays
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - thresholdDays);
    const cutoffISO = cutoffDate.toISOString();

    const staleContacts = await db.getAllAsync<{ id: string; first_name: string; last_name: string | null; last_contact_at: string }>(
      `SELECT id, first_name, last_name, last_contact_at FROM contacts
       WHERE last_contact_at IS NOT NULL AND last_contact_at < ?
       ORDER BY last_contact_at ASC LIMIT 5`,
      [cutoffISO]
    );

    // Schedule one notification per stale contact (max 5 to avoid spam)
    for (const contact of staleContacts) {
      const daysSince = differenceInDays(new Date(), new Date(contact.last_contact_at));
      const contactName = contact.last_name
        ? `${contact.first_name} ${contact.last_name}`
        : contact.first_name;

      await notificationService.scheduleNotSeenReminder(
        contact.id,
        contactName,
        daysSince
      );
    }
  },
};
```

**Step 3: Add `scheduleNotSeenReminder` to notification service**

In `frontend/services/notification.service.ts`, add:

```typescript
scheduleNotSeenReminder: async (
  contactId: string,
  contactName: string,
  daysSince: number
): Promise<string | null> => {
  const hasPermission = await notificationService.requestPermissions();
  if (!hasPermission) return null;

  // Schedule for tomorrow at 10:00 AM
  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() + 1);
  triggerDate.setHours(10, 0, 0, 0);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Recall People',
      body: `${contactName} — ${daysSince} jours sans nouvelles`,
      data: { contactId, type: 'not_seen' },
    },
    trigger: triggerDate,
  });

  return identifier;
},
```

**Step 4: Call on app launch**

In the app entry point (where `syncTrialsStatus` is called), add:
```typescript
await reminderService.scheduleNotSeenReminders();
```

**Step 5: Add settings UI**

In `frontend/app/(tabs)/profile.tsx`, add a new `SettingsRow` in the settings section for "Reminder threshold" with options: 30, 60, 90 days (or a picker).

**Step 6: Add i18n keys**

- FR: `"settings.notSeenThreshold": "Rappel de contact inactif"`, `"settings.notSeenThresholdDescription": "Nombre de jours sans nouvelles avant rappel"`, `"reminder.notSeen": "{{name}} — {{count}} jours sans nouvelles"`
- EN, ES, IT, DE equivalents

**Step 7: Commit**

```bash
git add frontend/stores/settings-store.ts frontend/services/reminder.service.ts frontend/services/notification.service.ts frontend/app/ frontend/locales/
git commit -m "feat(frontend): add not-seen reminders (free proactive feature)"
```

---

## Task 8: Frontend — Per-Contact Reminder Frequency (Premium)

**Files:**
- Modify: `frontend/app/contact/[id].tsx` (add frequency picker)
- Modify: `frontend/services/contact.service.ts` (update method)
- Modify: `frontend/services/reminder.service.ts` (use per-contact frequency)

**Step 1: Add frequency picker to contact page**

In `frontend/app/contact/[id].tsx`, add a new metadata row (similar to phone/email) that shows:
- "Reminder: Every 2 weeks" / "Every month" / "Every 3 months" / "Default (60 days)"
- Tapping opens a bottom sheet with options
- Premium check: if not premium, show paywall with reason `'proactive_reminders'`

Options: `[{ label: 'Default', value: null }, { label: '2 weeks', value: 14 }, { label: '1 month', value: 30 }, { label: '3 months', value: 90 }, { label: 'Never', value: -1 }]`

**Step 2: Update contact service**

Add `reminderFrequencyDays` to the `update` method parameters and SQL UPDATE in `contact.service.ts`.

**Step 3: Update reminder service**

In `reminderService.scheduleNotSeenReminders()`, modify the query to use per-contact frequency when set:

```sql
SELECT id, first_name, last_name, last_contact_at, reminder_frequency_days
FROM contacts
WHERE last_contact_at IS NOT NULL
  AND reminder_frequency_days != -1
  AND (
    (reminder_frequency_days IS NOT NULL AND julianday('now') - julianday(last_contact_at) > reminder_frequency_days)
    OR
    (reminder_frequency_days IS NULL AND julianday('now') - julianday(last_contact_at) > ?)
  )
ORDER BY last_contact_at ASC LIMIT 5
```

Where `?` is the global threshold from settings.

**Step 4: Add `proactive_reminders` paywall reason**

Add to Paywall component's reason type and `getReasonText()`.

**Step 5: i18n keys**

- FR: `"contact.reminderFrequency": "Frequence de rappel"`, options labels, `"paywall.reason.proactiveReminders": "Les rappels personnalises sont reserves aux membres Pro"`
- EN, ES, IT, DE equivalents

**Step 6: Commit**

```bash
git add frontend/app/contact/ frontend/services/ frontend/components/Paywall.tsx frontend/locales/
git commit -m "feat(frontend): add per-contact reminder frequency (premium)"
```

---

## Task 9: Frontend — Weekly Digest (Premium)

**Files:**
- Modify: `frontend/services/reminder.service.ts`
- Modify: `frontend/services/notification.service.ts`

**Step 1: Add digest scheduling to reminder service**

Add `scheduleWeeklyDigest()` to `reminderService`:

```typescript
scheduleWeeklyDigest: async () => {
  const isPremium = useSubscriptionStore.getState().isPremium;
  if (!isPremium) return;

  const db = await getDatabase();

  // Count upcoming events this week
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const upcomingEvents = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM hot_topics
     WHERE status = 'active' AND event_date IS NOT NULL
     AND event_date BETWEEN date('now') AND date('now', '+7 days')`
  );

  // Count stale contacts
  const thresholdDays = useSettingsStore.getState().notSeenThresholdDays;
  const staleContacts = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM contacts
     WHERE last_contact_at IS NOT NULL
     AND julianday('now') - julianday(last_contact_at) > ?`,
    [thresholdDays]
  );

  const eventsCount = upcomingEvents?.count ?? 0;
  const staleCount = staleContacts?.count ?? 0;

  if (eventsCount === 0 && staleCount === 0) return;

  await notificationService.scheduleWeeklyDigest(eventsCount, staleCount);
},
```

**Step 2: Add notification method**

In `notification.service.ts`, add `scheduleWeeklyDigest()` that schedules a notification for next Monday at 9:00 AM with body like: "Cette semaine : X events, Y contacts a recontacter".

**Step 3: Call on app launch (after trial/quota sync)**

Only called if premium.

**Step 4: i18n keys**

- FR: `"digest.title": "Votre semaine"`, `"digest.body": "{{events}} evenement(s) cette semaine, {{contacts}} contact(s) a recontacter"`
- EN, ES, IT, DE

**Step 5: Commit**

```bash
git add frontend/services/reminder.service.ts frontend/services/notification.service.ts frontend/locales/
git commit -m "feat(frontend): add weekly digest notification (premium)"
```

---

## Task 10: Frontend — Post-Event Follow-Up (Premium)

**Files:**
- Modify: `frontend/services/reminder.service.ts`
- Modify: `frontend/services/notification.service.ts`

**Step 1: Add post-event follow-up check**

Add `schedulePostEventFollowUps()` to `reminderService`:

```typescript
schedulePostEventFollowUps: async () => {
  const isPremium = useSubscriptionStore.getState().isPremium;
  if (!isPremium) return;

  const db = await getDatabase();

  // Find hot topics where event_date was 2 days ago, status is still active, not yet notified for follow-up
  const pastEvents = await db.getAllAsync<{
    id: string;
    contact_id: string;
    title: string;
    first_name: string;
    last_name: string | null;
  }>(
    `SELECT ht.id, ht.contact_id, ht.title, c.first_name, c.last_name
     FROM hot_topics ht
     JOIN contacts c ON c.id = ht.contact_id
     WHERE ht.status = 'active'
       AND ht.event_date IS NOT NULL
       AND date(ht.event_date) BETWEEN date('now', '-4 days') AND date('now', '-1 day')
       AND ht.notified_at IS NULL
       AND ht.birthday_contact_id IS NULL
     LIMIT 3`
  );

  for (const event of pastEvents) {
    const contactName = event.last_name
      ? `${event.first_name} ${event.last_name}`
      : event.first_name;

    await notificationService.schedulePostEventFollowUp(
      event.id,
      event.contact_id,
      contactName,
      event.title
    );

    // Mark as notified
    await db.runAsync(
      'UPDATE hot_topics SET notified_at = datetime(\'now\') WHERE id = ?',
      [event.id]
    );
  }
},
```

**Step 2: Add notification method**

In `notification.service.ts`, add `schedulePostEventFollowUp()` that creates a notification:
- Body: "Le [title] de [contactName] c'etait cette semaine, prends des nouvelles ?"
- Data: `{ contactId, hotTopicId, type: 'post_event' }`
- Trigger: tomorrow at 10:00 AM

**Step 3: i18n keys**

- FR: `"reminder.postEvent": "{{title}} de {{name}} c'etait cette semaine, prends des nouvelles ?"`
- EN, ES, IT, DE

**Step 4: Commit**

```bash
git add frontend/services/reminder.service.ts frontend/services/notification.service.ts frontend/locales/
git commit -m "feat(frontend): add post-event follow-up notifications (premium)"
```

---

## Task 11: Paywall & Pricing Updates

**Files:**
- Modify: `frontend/components/Paywall.tsx`
- Modify: `frontend/locales/*.json` (all 5)

**Step 1: Update Paywall features list**

Replace the features array with new premium benefits:
```typescript
const features = [
  t('paywall.features.unlimitedContacts'),
  t('paywall.features.unlimitedNotes'),
  t('paywall.features.longerRecordings'),
  t('paywall.features.unlimitedAI'),
  t('paywall.features.smartReminders'),
  t('paywall.features.weeklyDigest'),
];
```

**Step 2: Update all PaywallReason cases**

Full type:
```typescript
type PaywallReason =
  | 'notes_limit'
  | 'ai_search'
  | 'recording_duration'
  | 'ai_assistant'
  | 'avatar_generation'
  | 'contact_limit'       // NEW
  | 'proactive_reminders'; // NEW
```

**Step 3: Update i18n for new features**

Add to all 5 locale files under `paywall.features`:
- `"unlimitedContacts"`: "Contacts illimites" / "Unlimited contacts" / etc.
- `"unlimitedAI"`: "IA illimitee (avatars + assistant)" / etc.
- `"smartReminders"`: "Rappels intelligents personnalises" / etc.
- `"weeklyDigest"`: "Digest hebdomadaire" / etc.

**Step 4: Commit**

```bash
git add frontend/components/Paywall.tsx frontend/locales/
git commit -m "feat(frontend): update paywall with new pricing model features"
```

---

## Task 12: Landing Page — Pricing Update

**Files:**
- Modify: `landing-page/src/components/Pricing.tsx`

**Step 1: Update plans data**

```typescript
const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Remember the people who matter',
    features: [
      '14-day full trial',
      '15 contacts',
      'Unlimited notes',
      '5 AI avatars / month',
      '10 assistant questions / month',
      'Basic reminders',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '4.99',
    period: '/month',
    annualPrice: '39.99/year',
    description: 'Your personal relationship assistant',
    features: [
      'Unlimited contacts',
      'Unlimited AI avatars',
      'Unlimited assistant questions',
      '3-minute recordings',
      'Smart reminders per contact',
      'Weekly relationship digest',
      'Post-event follow-ups',
    ],
    cta: 'Go Pro',
    highlighted: true,
  },
];
```

**Step 2: Add annual price display**

Under the Pro price, show: `"or $39.99/year (save 33%)"`.

**Step 3: Commit**

```bash
git add landing-page/src/components/Pricing.tsx
git commit -m "feat(landing): update pricing page with new freemium model"
```

---

## Task 13: Backend — Update RevenueCat Pricing (Manual Step)

**No code change.** This requires manual configuration in:
1. **App Store Connect**: Update subscription price from $5.99 to $4.99/month, add $39.99/year option
2. **Google Play Console**: Same
3. **RevenueCat**: Verify offerings match new prices

Document this as a TODO for the developer to do manually outside of code.

---

## Execution Order & Dependencies

```
Task 1 (Backend schema) ──┐
                           ├── Task 2 (Subscription store) ──┬── Task 3 (Contact limit)
                           │                                  ├── Task 4 (Monthly quotas)
                           │                                  ├── Task 5 (Trial UI)
                           │                                  ├── Task 9 (Weekly digest)
                           │                                  └── Task 10 (Post-event)
Task 6 (SQLite migration) ──┬── Task 7 (Not-seen reminders)
                             └── Task 8 (Per-contact frequency)
Task 11 (Paywall updates) ── depends on Task 2
Task 12 (Landing page) ── independent
Task 13 (RevenueCat) ── independent, manual
```

**Parallel groups:**
- Group A: Tasks 1 → 2 → 3, 4, 5 (sequential)
- Group B: Tasks 6 → 7, 8 (can run parallel to Group A)
- Group C: Tasks 9, 10 (after Task 2)
- Group D: Tasks 11, 12 (independent)
