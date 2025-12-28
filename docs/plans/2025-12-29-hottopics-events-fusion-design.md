# Fusion Hot Topics + Events - Design

## Contexte

Les hot topics et events se chevauchent conceptuellement : un hot topic est un sujet à suivre, un event est un événement daté. Dans la pratique, beaucoup de hot topics ont une date associée ("Mariage en juin") et beaucoup d'events sont des sujets à suivre.

## Décisions de design

### 1. Fusion en une seule entité

**HotTopic** absorbe **Event**. Nouveau schéma :

```typescript
type HotTopic = {
  id: string;
  contactId: string;
  title: string;
  context?: string;

  // Fusion avec Event
  eventDate?: string;         // ISO 8601, si renseigné = rappel/notification
  notifiedAt?: string;        // Quand la notification a été envoyée

  // Pour anniversaires auto-générés
  birthdayContactId?: string; // Si non-null = anniversaire auto-généré

  // Existant
  resolution?: string;
  status: 'active' | 'resolved';
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
};
```

La table `events` sera supprimée après migration.

### 2. Review UI - Checkbox date optionnelle

Plus de section "Events" séparée. Chaque hot topic a une checkbox "Rappel" optionnelle :

```
┌─────────────────────────────────────────────────────┐
│ 🟠 Actualités                                       │
├─────────────────────────────────────────────────────┤
│ ☑️  Mariage                                         │
│     Fiancée avec François Civil                     │
│                                                     │
│     ☑️ Rappel : [25/06/2026]  (dans 6 mois)        │
├─────────────────────────────────────────────────────┤
│ ☑️  Recherche traiteur                              │
│     Compare plusieurs traiteurs                     │
│                                                     │
│     ☐ Rappel : [__/__/____]                        │
└─────────────────────────────────────────────────────┘
```

**Comportement :**
- Checkbox principale = accepter le hot topic
- Checkbox "Rappel" = créer avec eventDate (indépendante)
- Si le LLM détecte une date → checkbox pré-cochée + date pré-remplie
- L'utilisateur peut ajouter/modifier/retirer une date

### 3. Prompt LLM - Changement de structure

**Avant :**
```json
{
  "hotTopics": [{ "title": "...", "context": "..." }],
  "events": [{ "title": "...", "eventDate": "DD/MM/YYYY" }]
}
```

**Après :**
```json
{
  "hotTopics": [{
    "title": "...",
    "context": "...",
    "suggestedDate": "DD/MM/YYYY" | null
  }]
}
```

**Règles de calcul des dates :**
- "dans X jours/semaines/mois" → date exacte calculée
- "la semaine prochaine" → lundi prochain
- "le 15 janvier" → 15/01/YYYY
- "mi-février" → 15/02/YYYY
- "fin mars" → dernier jour du mois
- **"en juin"**, **"cet été"**, **"en septembre"** → **1er jour du mois/saison**
  - "en juin" → 01/06/YYYY
  - "cet été" → 01/07/YYYY
  - "à la rentrée" → 01/09/YYYY
  - "pour Noël" → 25/12/YYYY

Cela permet de capturer les intentions temporelles vagues et d'avoir un rappel approximatif.

### 4. Anniversaires auto-générés

Quand un anniversaire est sauvegardé sur un contact :

1. Supprimer les anciens hot topics anniversaire de ce contact
2. Créer 5 hot topics pour les 5 prochaines occurrences
3. Chaque hot topic a `birthdayContactId = contactId`

```typescript
async function syncBirthdayHotTopics(contactId: string, birthdayDay: number, birthdayMonth: number) {
  // Supprimer les anciens
  await db.run(`DELETE FROM hot_topics WHERE birthday_contact_id = ?`, contactId);

  // Calculer les 5 prochaines occurrences
  const today = new Date();
  const dates: Date[] = [];
  for (let year = today.getFullYear(); dates.length < 5; year++) {
    const birthday = new Date(year, birthdayMonth - 1, birthdayDay);
    if (birthday > today) {
      dates.push(birthday);
    }
  }

  // Créer les 5 hot topics
  for (const date of dates) {
    await hotTopicService.create({
      contactId,
      title: `Anniversaire de ${contact.firstName}`,
      eventDate: date.toISOString(),
      birthdayContactId: contactId,
    });
  }
}
```

**Nettoyage :** Au lancement de l'app, supprimer les hot topics où `birthdayContactId IS NOT NULL AND eventDate < aujourd'hui`.

**Affichage :** Les hot topics anniversaire ne sont pas tous affichés - seul le plus proche par contact est visible dans l'UI.

### 5. Amélioration des résolutions

Nouvelle instruction dans le prompt :

```
RÈGLE CRITIQUE pour la résolution:
- Extrais TOUS les détails concrets mentionnés dans la transcription
- Inclus : résultats chiffrés, noms, lieux, dates, anecdotes
- Si aucun détail concret n'est mentionné → résolution = "Effectué" ou "Terminé"

Exemples:
• "Niko a couru son semi" (sans détails)
  → { resolution: "Effectué" }

• "Niko a couru son semi en 1h40, il a fêté ça au bar"
  → { resolution: "Terminé en 1h40, a fêté au bar avec ses amis" }

• "Elle a eu son examen avec 16/20, major de sa promo"
  → { resolution: "Réussi avec 16/20, major de promo" }
```

### 6. Mise à jour des evaluators Langfuse

Nouveaux critères d'évaluation :

1. **COMPLÉTUDE** : Tous les sujets/infos mentionnés sont-ils extraits ?
2. **PRÉCISION** : Les infos extraites correspondent-elles à la transcription ?
3. **CATÉGORISATION** : facts vs hotTopics vs memories correctement distingués
4. **DATES** : Dates calculées correctement à partir des expressions relatives
5. **RÉSOLUTIONS** : Détails concrets inclus quand mentionnés
6. **PAS D'HALLUCINATION** : Rien inventé (le nom du contact vient de la DB, pas une hallucination)

Passer le contexte DB à l'evaluator (nom du contact, date de référence) pour éviter les faux positifs.

## Fichiers impactés

| Fichier | Changement |
|---------|------------|
| `frontend/types/index.ts` | Modifier HotTopic, supprimer Event/ExtractedEvent |
| `frontend/lib/db.ts` | Migration : ajouter colonnes, migrer events, supprimer table |
| `frontend/app/review.tsx` | Supprimer section Events, ajouter checkbox Rappel |
| `frontend/services/hotTopic.service.ts` | Ajouter gestion eventDate et birthdayContactId |
| `frontend/services/event.service.ts` | Supprimer après migration |
| `frontend/components/contact/BirthdayEditModal.tsx` | Appeler syncBirthdayHotTopics après save |
| `frontend/app/(tabs)/actus.tsx` | Filtrer anniversaires (1 par contact) |
| `backend/src/routes/extract.ts` | Modifier prompt et schéma Zod |
| `backend/src/lib/evaluators.ts` | Nouveaux critères + contexte DB |

## Migration

1. Ajouter colonnes `event_date`, `notified_at`, `birthday_contact_id` sur `hot_topics`
2. Migrer les events existants vers hot_topics
3. Supprimer la table `events`
4. Mettre à jour les types TypeScript
5. Mettre à jour les services
