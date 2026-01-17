# TODO - Migration du code vers Schéma V2

## Statut de la migration

✅ **Schéma SQLite** - Migration complète et automatique
✅ **Types TypeScript** - Types V2 définis (V1 marqués deprecated)
❌ **Code applicatif** - À adapter pour utiliser le nouveau schéma

## Fichiers à modifier (identifiés par TypeScript)

### 1. app/review.tsx
**Problèmes:**
- Utilise `extraction.facts` → remplacer par `extraction.newHotTopics`
- Utilise `extraction.hotTopics` → remplacer par `extraction.newHotTopics`
- Utilise `extraction.memories` → supprimer (plus utilisé en V2)
- Utilise `extraction.suggestedGroups` → supprimer (plus utilisé en V2)
- Type `ResolvedTopic` a changé: `id` → `existingTopicId`

**Actions:**
```typescript
// AVANT (V1)
const [selectedFacts, setSelectedFacts] = useState(extraction.facts.map(() => true));
const [selectedHotTopics, setSelectedHotTopics] = useState(extraction.hotTopics.map(() => true));
const [selectedMemories, setSelectedMemories] = useState(extraction.memories.map(() => true));

// APRÈS (V2)
const [selectedHotTopics, setSelectedHotTopics] = useState(extraction.newHotTopics.map(() => true));
// Supprimer selectedFacts et selectedMemories
```

### 2. app/disambiguation.tsx
**Problèmes:**
- Utilise `contact.tags` → ne plus utiliser (supprimé en V2)

**Actions:**
```typescript
// AVANT (V1)
const tags = contact.tags || [];

// APRÈS (V2)
// Supprimer complètement l'affichage des tags
```

### 3. app/ask.tsx
**Problèmes:**
- Route `/ask-result` non définie dans le routing

**Actions:**
- Créer la route ou renommer vers une route existante

### 4. app/admin/monitoring.tsx
**Problèmes:**
- Importe `api` de `@/lib/api` qui n'existe pas
- Utilise `token` qui n'existe pas sur `AuthState`

**Actions:**
- Vérifier l'import et corriger
- Vérifier le type `AuthState`

## Services à créer/modifier

### 1. Service d'extraction (backend/frontend)

**Nouveau format d'extraction V2:**
```typescript
export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    gender?: Gender;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
    suggestedNickname?: string;
    avatarHints?: AvatarHints | null;
  };
  noteTitle: string; // 2-4 mots
  contactInfo?: ExtractedContactInfo;
  newHotTopics: ExtractedHotTopic[]; // Nouvelles actualités
  resolvedTopics: ResolvedTopic[]; // Actualités résolues
};
```

### 2. Service de génération IA

**Nouvelles fonctions à implémenter:**
- `generateSuggestedQuestions(contact, hotTopics, recentNotes)` → max 3 questions
- `generateAiSummary(contact, allNotes, activeHotTopics)` → résumé 2-4 phrases
- `extractFromTranscription(transcription, existingHotTopics)` → extraction V2

### 3. Service de notes

**Nouvelles fonctions:**
- `updateNoteTranscription(noteId, newTranscription)` → permet édition
- `regenerateExtraction(noteId)` → re-extraire après édition

## Prompts LLM à mettre à jour

### 1. Prompt d'extraction (review)
Voir `/home/clement/Desktop/recall-people-2026/REDESIGN_V2.md` section 6 "Génération IA (Prompts)"

**Format JSON de sortie:**
```json
{
  "contactInfo": {
    "phone": string | null,
    "email": string | null,
    "birthday": { "day": number, "month": number, "year": number | null } | null
  },
  "newHotTopics": [
    {
      "title": "Titre court (3-5 mots)",
      "context": "1-2 phrases de contexte",
      "eventDate": "YYYY-MM-DD" | null
    }
  ],
  "resolvedTopics": [
    {
      "existingTopicId": "id",
      "resolution": "Description concrète"
    }
  ],
  "noteTitle": "2-4 mots"
}
```

### 2. Prompt "À demander" (Questions)
Voir REDESIGN_V2.md section 6

**Format JSON de sortie:**
```json
{
  "questions": [
    "Comment s'est passé ton entretien chez Google ?",
    "Alors le déménagement, c'est calé pour mars ?"
  ]
}
```

### 3. Prompt Résumé
Voir REDESIGN_V2.md section 6

**Format:** Texte libre, 2-4 phrases avec dates absolues.

## Écrans à créer/modifier

### 1. Écran Review (app/review.tsx)
**Changements:**
- Supprimer la section "Facts détectés"
- Supprimer la section "Memories détectés"
- Simplifier: Transcription (éditable) + Hot Topics + Infos Contact
- Ajouter bouton "Éditer transcription"
- Re-extraire si transcription modifiée

### 2. Fiche Contact
**Changements:**
- Section "À demander" avec `suggestedQuestions` (max 3)
- Bouton "🔄 Autres idées" pour régénérer
- Section "Actualités" avec hot topics actifs + résolus
- Bouton "✏️" pour éditer chaque hot topic
- Bouton "✓" pour marquer comme résolu (demande résolution)
- Supprimer la section "Facts" et "Memories"

### 3. Écran "Demander" (nouveau)
**À créer:**
- Barre de recherche en haut de l'écran d'accueil
- Mode vocal + texte
- Affichage de la réponse avec sources
- Lien vers la fiche du contact mentionné

## Base de données - Requêtes à adapter

### Requêtes à modifier

**AVANT (V1):**
```typescript
// Récupérer tous les facts d'un contact
const facts = await db.getAllAsync(
  'SELECT * FROM facts WHERE contact_id = ?',
  [contactId]
);

// Récupérer tous les memories
const memories = await db.getAllAsync(
  'SELECT * FROM memories WHERE contact_id = ?',
  [contactId]
);
```

**APRÈS (V2):**
```typescript
// Récupérer toutes les notes d'un contact
const notes = await db.getAllAsync(
  'SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC',
  [contactId]
);

// Récupérer les hot topics actifs
const activeHotTopics = await db.getAllAsync(
  'SELECT * FROM hot_topics WHERE contact_id = ? AND status = "active" ORDER BY created_at DESC',
  [contactId]
);

// Récupérer les hot topics résolus récemment
const resolvedHotTopics = await db.getAllAsync(
  `SELECT * FROM hot_topics
   WHERE contact_id = ? AND status = "resolved"
   ORDER BY resolved_at DESC LIMIT 5`,
  [contactId]
);
```

### Nouvelles requêtes à implémenter

```typescript
// Mettre à jour la transcription d'une note
await db.runAsync(
  'UPDATE notes SET transcription = ?, updated_at = datetime("now") WHERE id = ?',
  [newTranscription, noteId]
);

// Récupérer les questions suggérées
const contact = await db.getFirstAsync(
  'SELECT suggested_questions FROM contacts WHERE id = ?',
  [contactId]
);
const questions = contact?.suggested_questions
  ? JSON.parse(contact.suggested_questions)
  : [];

// Marquer un hot topic comme résolu
await db.runAsync(
  `UPDATE hot_topics
   SET status = "resolved", resolution = ?, resolved_at = datetime("now"), updated_at = datetime("now")
   WHERE id = ?`,
  [resolution, topicId]
);
```

## Checklist de migration

### Phase 1 - Backend
- [ ] Mettre à jour le prompt d'extraction (V2 format)
- [ ] Implémenter endpoint pour générer `suggestedQuestions`
- [ ] Implémenter endpoint pour générer `aiSummary`
- [ ] Implémenter endpoint pour répondre aux questions (fonctionnalité "Demander")
- [ ] Tester les nouveaux prompts avec OpenAI Structured Outputs

### Phase 2 - Frontend (Services)
- [ ] Créer service `notes` avec `updateTranscription()`
- [ ] Créer service `hotTopics` avec `markAsResolved()`
- [ ] Adapter service `extraction` pour le nouveau format
- [ ] Supprimer références à `facts`, `memories`, `pendingFacts`

### Phase 3 - Frontend (UI)
- [ ] Modifier `app/review.tsx` pour le nouveau flow
- [ ] Modifier fiche contact pour afficher `suggestedQuestions`
- [ ] Ajouter édition de transcription
- [ ] Ajouter résolution de hot topics
- [ ] Créer écran "Demander" (barre de recherche + résultats)
- [ ] Supprimer affichage de `tags` et `highlights`

### Phase 4 - Tests
- [ ] Tester migration avec base existante
- [ ] Tester création de nouveau contact
- [ ] Tester enregistrement de note
- [ ] Tester édition de transcription
- [ ] Tester résolution de hot topic
- [ ] Tester génération de questions

### Phase 5 - Cleanup
- [ ] Supprimer code V1 inutilisé
- [ ] Supprimer types deprecated
- [ ] Mettre à jour documentation

## Ordre recommandé

1. **Backend d'abord** - Adapter les endpoints API
2. **Services frontend** - Adapter les appels API
3. **UI écran par écran** - Commencer par Review, puis fiche contact
4. **Fonctionnalité "Demander"** - En dernier (feature additionnelle)

## Ressources

- **Design complet**: `/home/clement/Desktop/recall-people-2026/REDESIGN_V2.md`
- **Schéma DB**: `/home/clement/Desktop/recall-people-2026/frontend/lib/db.ts`
- **Types**: `/home/clement/Desktop/recall-people-2026/frontend/types/index.ts`
- **Migration doc**: `/home/clement/Desktop/recall-people-2026/MIGRATION_V2.md`
- **Summary**: `/home/clement/Desktop/recall-people-2026/SCHEMA_V2_SUMMARY.md`

---

**Note:** La migration du schéma est **automatique et déjà implémentée**. Ce fichier concerne uniquement la migration du **code applicatif** pour utiliser le nouveau schéma.
