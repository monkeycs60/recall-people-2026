# Système de Notifications Intelligentes - Recall People

## Vue d'ensemble

Ce document décrit le système de notifications intelligent pour l'app Recall People. L'objectif est de créer des rappels **engageants et émotionnels** qui aident l'utilisateur à maintenir ses relations importantes sans être intrusif.

---

## Philosophie

> **"Aucune relation ne devrait être oubliée par accident."**

Les notifications doivent :
- ✅ Être **personnalisées** et contextuelles (pas de "Contact X n'a pas été vu depuis Y jours")
- ✅ Proposer des **actions concrètes** (appeler, envoyer un message, prendre un café)
- ✅ Être **intelligentes** : tenir compte du contexte relationnel (famille vs client vs ami)
- ✅ Respecter le **Do Not Disturb** et les préférences utilisateur
- ✅ Intégrer les événements futurs (Google Calendar, anniversaires, hot topics)

---

## Types de Notifications

### 1. 🔔 Contact Reminders (Rappels de contact)

**Déclencheur :** Un contact n'a pas été vu/contacté depuis un certain temps

**Logique :**
- **Famille proche** : rappel après 14 jours
- **Amis** : rappel après 21 jours
- **Clients/Professionnels** : rappel après 30 jours
- **Autres** : rappel après 45 jours

**Personnalisation :**
- Utilisateur peut définir une fréquence custom par contact ou groupe
- Option "Ne jamais rappeler" pour certains contacts

**Exemples de messages :**
```
🌟 "Ça fait 3 semaines que tu n'as pas parlé à Marie.
   Et si tu prenais 5 minutes pour prendre des nouvelles ?"

💬 "Tu te souviens de la dernière fois avec Thomas ?
   Il t'avait parlé de son nouveau job. Un petit message ?"

☕ "Léa te manque peut-être ?
   Ça fait un moment ! Envoie-lui un message ou propose un café."
```

---

### 2. 🎂 Anniversaires & Événements

**Déclencheur :** Anniversaires extraits via IA des facts ou manuellement ajoutés

**Timing :**
- **J-7** : Notification préparatoire ("L'anniversaire de X approche, pense à un cadeau !")
- **J-1** : Rappel la veille ("Demain c'est l'anniversaire de X 🎉")
- **Jour J** : Notification le matin ("C'est l'anniversaire de X aujourd'hui !")

**Intégration avec Gift Ideas :**
- Si des `gift_idea` facts existent pour le contact, les afficher dans la notification
- Exemple : *"L'anniversaire de Marie est dans 5 jours. Tu avais noté qu'elle aime les vinyles jazz !"*

**Exemples de messages :**
```
🎂 "C'est l'anniversaire de Paul aujourd'hui !
   Tu lui envoies un message ou tu l'appelles ?"

🎁 "L'anniversaire de Sophie dans 1 semaine.
   Tu avais noté qu'elle adore les livres de fantasy."

🎉 "Joyeux anniversaire à Léa !
   Ça fait 3 ans que vous vous connaissez 💫"
```

---

### 3. 📅 Rendez-vous à Venir (Google Calendar)

**Déclencheur :** Événements Google Calendar mentionnant un contact de l'app

**Logique :**
- Détecter les événements futurs contenant le prénom/nom d'un contact
- Notification **2h avant** le rendez-vous avec résumé IA du contact

**Exemples de messages :**
```
📅 "Rdv avec Gérard dans 2h.
   Voici ce que tu devrais avoir en tête :"

   → Directeur Commercial chez Orange
   → Fils Lucas (bac 2025)
   → Passionné de trail running
   → Dernier échange : il cherchait un coach sportif

   [Voir la fiche complète]
```

**Actions proposées :**
- Ouvrir la fiche contact dans l'app
- Ajouter une note rapide post-meeting
- Snooze notification

---

### 4. 🔥 Hot Topics en Attente

**Déclencheur :** Hot topics avec statut `active` depuis plus de 14 jours

**Logique :**
- Rappeler les sujets en attente de résolution
- Encourager à reprendre contact pour résoudre le sujet

**Exemples de messages :**
```
🔥 "Marie cherchait toujours un plombier la dernière fois.
   Tu veux savoir si c'est résolu ?"

⏰ "Thomas attendait les résultats de son stage à Lacanau.
   Ça fait 2 semaines, prends des nouvelles !"
```

**Action :**
- Cliquer = ouvre la fiche contact avec le hot topic en vue
- Possibilité de résoudre le hot topic directement depuis la notification

---

### 5. 💡 Ice Breakers Proactifs

**Déclencheur :** Suggestion IA pour relancer la conversation avec un contact

**Timing :**
- Maximum 1 fois par semaine
- Basé sur les contacts "stale" (non vus depuis longtemps) avec du contexte riche

**Exemples de messages :**
```
💬 "Idée pour relancer Marie :
   'Comment se passe ton nouveau poste chez L'Oréal ?'"

🎯 "Suggestion pour Thomas :
   'Alors, ce stage de surf à Lacanau, ça a donné quoi ?'"
```

---

## Architecture Technique

### Tables SQLite (Nouvelles)

```sql
-- Notifications configurées (reminders récurrents)
CREATE TABLE IF NOT EXISTS notification_settings (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL, -- 'contact_reminder' | 'birthday' | 'hot_topic'
  frequency_days INTEGER, -- NULL = default selon type de relation
  enabled INTEGER DEFAULT 1,
  last_sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Log des notifications envoyées (historique)
CREATE TABLE IF NOT EXISTS notification_logs (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  opened INTEGER DEFAULT 0,
  action_taken TEXT, -- 'opened_contact' | 'added_note' | 'dismissed' | 'snoozed'
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Google Calendar sync (cache des événements futurs)
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  google_event_id TEXT UNIQUE,
  contact_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT,
  notification_sent INTEGER DEFAULT 0,
  synced_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);
```

### Services

#### `notification.service.ts`

```typescript
export const notificationService = {
  // Calculer les contacts à rappeler
  getContactsNeedingReminder: async (): Promise<Contact[]> => {
    // Logique : comparer lastContactAt avec fréquence par type de groupe
  },

  // Générer un message personnalisé pour le reminder
  generateReminderMessage: async (contact: Contact): Promise<string> => {
    // Utiliser IA pour générer un message contextuel
  },

  // Envoyer une notification locale
  sendLocalNotification: async (data: NotificationData): Promise<void> => {
    // expo-notifications
  },

  // Logger la notification envoyée
  logNotification: async (notification: NotificationLog): Promise<void> => {
    // INSERT dans notification_logs
  },
};
```

#### `calendar.service.ts`

```typescript
export const calendarService = {
  // Sync avec Google Calendar
  syncCalendarEvents: async (accessToken: string): Promise<void> => {
    // Récupérer les événements futurs (30 prochains jours)
    // Matcher avec contacts existants (prénom/nom dans le titre/description)
    // Sauvegarder dans calendar_events
  },

  // Récupérer les événements futurs pour un contact
  getUpcomingEventsForContact: async (contactId: string): Promise<CalendarEvent[]> => {
    // SELECT FROM calendar_events WHERE contact_id = ?
  },

  // Nettoyer les événements passés
  cleanupPastEvents: async (): Promise<void> => {
    // DELETE FROM calendar_events WHERE end_time < now()
  },
};
```

#### `reminder-scheduler.service.ts`

```typescript
export const reminderScheduler = {
  // Planifier toutes les notifications pour les 7 prochains jours
  scheduleUpcomingReminders: async (): Promise<void> => {
    // 1. Contact reminders
    // 2. Birthdays
    // 3. Calendar events
    // 4. Hot topics
    // Utilise expo-notifications pour scheduler
  },

  // Annuler toutes les notifications planifiées
  cancelAllScheduled: async (): Promise<void> => {
    // expo-notifications.cancelAllScheduledNotificationsAsync()
  },

  // Re-scheduler (appelé chaque nuit à 3h via background task)
  refreshSchedule: async (): Promise<void> => {
    // Cancel all + re-schedule
  },
};
```

---

## UX & Interface

### Écran Settings > Notifications

```
┌─────────────────────────────────────┐
│ ← Notifications                      │
├─────────────────────────────────────┤
│                                      │
│ 🔔 Rappels de Contact                │
│ ────────────────────────────────────│
│ [✓] Famille proche    • 14 jours    │
│ [✓] Amis              • 21 jours    │
│ [✓] Professionnels    • 30 jours    │
│ [✓] Autres            • 45 jours    │
│                                      │
│ 🎂 Anniversaires & Événements        │
│ ────────────────────────────────────│
│ [✓] Anniversaires     • J-7, J-1, J │
│                                      │
│ 📅 Google Calendar                   │
│ ────────────────────────────────────│
│ [✓] Rendez-vous à venir • 2h avant  │
│ [  ] Synchroniser mon calendrier     │
│                                      │
│ 🔥 Hot Topics                        │
│ ────────────────────────────────────│
│ [✓] Sujets en attente  • 14 jours   │
│                                      │
│ 💡 Suggestions IA                    │
│ ────────────────────────────────────│
│ [✓] Ice Breakers       • 1x/semaine │
│                                      │
│ ⏰ Ne Pas Déranger                   │
│ ────────────────────────────────────│
│ De 22h à 8h                          │
│                                      │
└─────────────────────────────────────┘
```

### Fiche Contact > Paramètres Personnalisés

Dans chaque fiche contact, ajouter une option :

```
┌─────────────────────────────────────┐
│ 🔔 Rappels personnalisés             │
├─────────────────────────────────────┤
│ Fréquence de rappel :                │
│ ○ Par défaut (21 jours - Ami)       │
│ ○ Personnalisé                       │
│   └─ [  7 jours  ] ▼                │
│ ○ Jamais me rappeler                │
└─────────────────────────────────────┘
```

---

## Flows Utilisateur

### Flow 1 : Notification de Contact Reminder

```
1. SYSTEM détecte que Marie n'a pas été contactée depuis 21 jours
2. SYSTEM génère un message personnalisé via IA
3. SYSTEM envoie la notification locale (10h du matin)

   ┌──────────────────────────────────┐
   │ 🌟 Recall People                 │
   │ ─────────────────────────────────│
   │ Ça fait 3 semaines que tu n'as   │
   │ pas parlé à Marie. Et si tu      │
   │ prenais 5 minutes pour prendre   │
   │ des nouvelles ?                  │
   │                                  │
   │ [Voir la fiche] [Plus tard]      │
   └──────────────────────────────────┘

4a. USER clique sur "Voir la fiche"
    → Ouvre la fiche contact de Marie
    → Log action: 'opened_contact'

4b. USER clique sur "Plus tard"
    → Snooze pour 3 jours
    → Log action: 'snoozed'
```

### Flow 2 : Notification Anniversaire

```
1. SYSTEM détecte que l'anniversaire de Paul est dans 7 jours
2. SYSTEM envoie notification J-7 (10h du matin)

   ┌──────────────────────────────────┐
   │ 🎂 Recall People                 │
   │ ─────────────────────────────────│
   │ L'anniversaire de Paul est dans  │
   │ 7 jours.                         │
   │                                  │
   │ Tu avais noté qu'il aime les     │
   │ vinyles de jazz !                │
   │                                  │
   │ [Voir les idées cadeaux]         │
   └──────────────────────────────────┘

3. USER clique sur "Voir les idées cadeaux"
   → Ouvre la fiche contact de Paul
   → Scroll auto vers la section gift_idea facts
```

### Flow 3 : Notification Rendez-vous Google Calendar

```
1. USER sync Google Calendar
2. SYSTEM détecte un événement "Café avec Gérard" à 15h
3. SYSTEM matche "Gérard" avec un contact existant
4. SYSTEM envoie notification 2h avant (13h)

   ┌──────────────────────────────────┐
   │ 📅 Recall People                 │
   │ ─────────────────────────────────│
   │ Rdv avec Gérard dans 2h          │
   │                                  │
   │ Voici ce que tu devrais avoir    │
   │ en tête :                        │
   │                                  │
   │ • Directeur Commercial Orange    │
   │ • Fils Lucas (bac 2025)          │
   │ • Passionné de trail running     │
   │                                  │
   │ [Voir la fiche complète]         │
   └──────────────────────────────────┘

5. USER clique → ouvre fiche Gérard avec résumé IA en vue
6. Après le rendez-vous, proposition d'ajouter une note :

   ┌──────────────────────────────────┐
   │ 🎤 Recall People                 │
   │ ─────────────────────────────────│
   │ Ton rdv avec Gérard s'est bien   │
   │ passé ? Enregistre une note !    │
   │                                  │
   │ [Ajouter une note] [Ignorer]     │
   └──────────────────────────────────┘
```

---

## Implémentation Google Calendar

### Setup

1. Installer `expo-auth-session` et `expo-web-browser` (déjà fait pour Better Auth)
2. Activer Google Calendar API dans Google Cloud Console
3. Obtenir OAuth credentials (Client ID + Secret)

### Code

#### `hooks/useGoogleCalendar.ts`

```typescript
import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { calendarService } from '@/services/calendar.service';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleCalendar = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        calendarService.syncCalendarEvents(authentication.accessToken);
      }
    }
  }, [response]);

  return {
    syncCalendar: () => promptAsync(),
    isLoading: !request,
  };
};
```

#### `services/calendar.service.ts`

```typescript
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import { Contact } from '@/types';

export type CalendarEvent = {
  id: string;
  googleEventId: string;
  contactId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  notificationSent: boolean;
  syncedAt: string;
};

export const calendarService = {
  syncCalendarEvents: async (accessToken: string): Promise<void> => {
    // Récupérer événements futurs (30 prochains jours)
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&` +
      `timeMax=${endDate.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    const events = data.items || [];

    // Récupérer tous les contacts pour matching
    const db = await getDatabase();
    const contacts = await db.getAllAsync<{
      id: string;
      first_name: string;
      last_name: string | null;
    }>('SELECT id, first_name, last_name FROM contacts');

    // Matcher et sauvegarder les événements
    for (const event of events) {
      const matchedContact = matchContactInEvent(event, contacts);

      await db.runAsync(
        `INSERT OR REPLACE INTO calendar_events
         (id, google_event_id, contact_id, title, description, start_time, end_time, location, notification_sent, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Crypto.randomUUID(),
          event.id,
          matchedContact?.id || null,
          event.summary || 'Untitled Event',
          event.description || null,
          event.start.dateTime || event.start.date,
          event.end.dateTime || event.end.date,
          event.location || null,
          0,
          new Date().toISOString(),
        ]
      );
    }
  },

  getUpcomingEventsForContact: async (contactId: string): Promise<CalendarEvent[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      google_event_id: string;
      contact_id: string;
      title: string;
      description: string | null;
      start_time: string;
      end_time: string;
      location: string | null;
      notification_sent: number;
      synced_at: string;
    }>(
      `SELECT * FROM calendar_events
       WHERE contact_id = ? AND start_time > datetime('now')
       ORDER BY start_time ASC`,
      [contactId]
    );

    return result.map((row) => ({
      id: row.id,
      googleEventId: row.google_event_id,
      contactId: row.contact_id,
      title: row.title,
      description: row.description || undefined,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location || undefined,
      notificationSent: Boolean(row.notification_sent),
      syncedAt: row.synced_at,
    }));
  },

  cleanupPastEvents: async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM calendar_events WHERE end_time < datetime('now')`
    );
  },
};

// Helper pour matcher un contact dans un événement
const matchContactInEvent = (
  event: any,
  contacts: Array<{ id: string; first_name: string; last_name: string | null }>
): { id: string } | null => {
  const searchText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();

  for (const contact of contacts) {
    const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase();
    const firstName = contact.first_name.toLowerCase();

    if (searchText.includes(fullName) || searchText.includes(firstName)) {
      return { id: contact.id };
    }
  }

  return null;
};
```

---

## Background Tasks (Expo)

Pour que les notifications fonctionnent en background, utiliser `expo-task-manager` et `expo-background-fetch`.

### Setup

```typescript
// app/_layout.tsx

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { reminderScheduler } from '@/services/reminder-scheduler.service';

const REMINDER_REFRESH_TASK = 'REMINDER_REFRESH_TASK';

TaskManager.defineTask(REMINDER_REFRESH_TASK, async () => {
  try {
    await reminderScheduler.refreshSchedule();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Enregistrer la tâche (exécutée toutes les 24h)
async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(REMINDER_REFRESH_TASK, {
    minimumInterval: 60 * 60 * 24, // 24 heures
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

---

## Analytics & Métriques

Pour mesurer l'efficacité des notifications :

### Métriques à tracker

| Métrique | Description |
|----------|-------------|
| **Open Rate** | % de notifications ouvertes |
| **Action Rate** | % de notifications ayant déclenché une action (ouvrir contact, ajouter note) |
| **Snooze Rate** | % de notifications snoozées |
| **Dismiss Rate** | % de notifications ignorées |
| **Conversion Rate** | % de notifications ayant mené à une vraie interaction (note ajoutée, appel) |

### Requête SQL pour analytics

```sql
-- Open rate par type de notification (30 derniers jours)
SELECT
  notification_type,
  COUNT(*) as total_sent,
  SUM(CASE WHEN opened = 1 THEN 1 ELSE 0 END) as total_opened,
  ROUND(SUM(CASE WHEN opened = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as open_rate
FROM notification_logs
WHERE sent_at > datetime('now', '-30 days')
GROUP BY notification_type;
```

---

## Priorités d'Implémentation

### Phase 1 : MVP (1-2 semaines)
- [ ] Tables SQLite (notification_settings, notification_logs)
- [ ] Service `notification.service.ts`
- [ ] Contact Reminders basiques (fréquence fixe : 21 jours)
- [ ] Notifications locales (expo-notifications)
- [ ] Écran Settings > Notifications (toggle ON/OFF global)

### Phase 2 : Personnalisation (1 semaine)
- [ ] Fréquences custom par groupe
- [ ] Paramètres personnalisés par contact
- [ ] Do Not Disturb (plage horaire)
- [ ] Messages IA personnalisés (via backend)

### Phase 3 : Événements (1-2 semaines)
- [ ] Table calendar_events
- [ ] Service `calendar.service.ts`
- [ ] Google Calendar sync
- [ ] Notifications rendez-vous (J-2h)
- [ ] Affichage événements futurs dans fiche contact

### Phase 4 : Anniversaires & Hot Topics (1 semaine)
- [ ] Détection anniversaires (facts birthday)
- [ ] Notifications J-7, J-1, J
- [ ] Affichage gift ideas dans notifications
- [ ] Rappels hot topics actifs (14 jours)

### Phase 5 : Ice Breakers IA (1 semaine)
- [ ] Générer suggestions de conversation via IA
- [ ] Notifications hebdomadaires proactives
- [ ] Analytics et optimisation

---

## Copywriting des Notifications

### Principes
- **Chaleureux et humain** : tutoiement, langage naturel
- **Actionnable** : toujours proposer une action concrète
- **Contextuel** : mentionner un détail spécifique (dernier échange, hobby, projet)
- **Non culpabilisant** : encourager sans faire la morale

### Templates

#### Contact Reminders

**Variante 1 - Contextuel :**
> "Ça fait {X} semaines que tu n'as pas parlé à {Prénom}. {Context}. Et si tu prenais 5 minutes pour prendre des nouvelles ?"

**Variante 2 - Nostalgie :**
> "Tu te souviens de la dernière fois avec {Prénom} ? {Context}. Un petit message ?"

**Variante 3 - Direct :**
> "{Prénom} te manque peut-être ? Ça fait un moment ! Envoie-lui un message ou propose un café."

#### Anniversaires

**J-7 :**
> "L'anniversaire de {Prénom} est dans 7 jours. {Gift idea context}."

**J-1 :**
> "Demain c'est l'anniversaire de {Prénom} 🎉 Tu as prévu quelque chose ?"

**Jour J :**
> "C'est l'anniversaire de {Prénom} aujourd'hui ! Tu lui envoies un message ou tu l'appelles ?"

#### Rendez-vous

**2h avant :**
> "Rdv avec {Prénom} dans 2h. Voici ce que tu devrais avoir en tête :\n{Résumé IA}"

**Post-meeting :**
> "Ton rdv avec {Prénom} s'est bien passé ? Enregistre une note !"

---

## Résumé

Ce système de notifications intelligent transforme Recall People en **coach social proactif**. Au lieu d'être une simple base de données passive, l'app devient un assistant qui :

1. ✅ Rappelle de maintenir ses relations importantes
2. ✅ Prépare aux rendez-vous avec contexte
3. ✅ Célèbre les moments importants (anniversaires)
4. ✅ Propose des sujets de conversation

L'objectif final : **Aucune relation ne devrait être oubliée par accident.**
