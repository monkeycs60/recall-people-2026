# Refonte Search Tab + Filtre Contacts

## Résumé

- **Search tab** → devient "Assistant" (Q&A comme ask.tsx)
- **Contacts tab** → filtre textuel par nom + hint vers Assistant
- **Essais gratuits** : 10 pour notes, 10 pour Ask (trackés backend)

---

## 1. Backend - Tracking des essais gratuits

### Base de données
Ajouter dans la table `users` :
- `freeNoteTrials: number` (défaut: 10)
- `freeAskTrials: number` (défaut: 10)

### Endpoints

**GET /api/user/trials**
```json
{ "freeNoteTrials": 7, "freeAskTrials": 10, "isPremium": false }
```

**Logique dans les endpoints existants :**

1. **POST /api/extract (création de note)** :
   - Si Premium → OK
   - Si non-Premium et `freeNoteTrials > 0` → OK, décrémenter
   - Si non-Premium et `freeNoteTrials === 0` → 403 + `{ error: "no_trials_left", type: "notes" }`

2. **POST /api/ask (question IA)** :
   - Si Premium → OK
   - Si non-Premium et `freeAskTrials > 0` → OK, décrémenter
   - Si non-Premium et `freeAskTrials === 0` → 403 + `{ error: "no_trials_left", type: "ask" }`

---

## 2. Frontend - Tab "Assistant" (ex-Search)

### Fichiers modifiés
- `frontend/app/(tabs)/search.tsx` → refonte complète
- `frontend/app/(tabs)/_layout.tsx` → renommer tab "Assistant"

### Changements search.tsx

**Supprimer :**
- `useSemanticSearch` hook
- Composants `SearchResults`, `SearchSkeleton`
- Logique de recherche sémantique

**Ajouter (inspiré de ask.tsx) :**
- TextInput multiline pour la question
- Bouton vocal (enregistrement + transcription)
- Bouton Envoyer
- Suggestions dynamiques
- Navigation vers `/ask-result` avec la réponse
- Affichage "X essais restants" pour non-Premium

### UI
```
┌─────────────────────────────────┐
│ Assistant                       │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Pose ta question...         │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│                                 │
│ [🎤 Parler]     [Envoyer →]     │
│                                 │
│ 💡 Suggestions :                │
│ ┌─────────────────────────────┐ │
│ │ Quoi de neuf avec Marie ?   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ C'est quand l'anniv de Tom ?│ │
│ └─────────────────────────────┘ │
│                                 │
│ ⓘ 7 essais gratuits restants   │
└─────────────────────────────────┘
```

---

## 3. Frontend - Contacts Tab (filtre + hint)

### Fichier modifié
- `frontend/app/(tabs)/index.tsx`

### Changements

**Remplacer** la barre "Demande-moi quelque chose" (lignes 290-298) par :

```tsx
// État pour le filtre
const [filterText, setFilterText] = useState('');

// Filtrage des contacts
const filteredContacts = useMemo(() => {
  if (!filterText.trim()) return allContacts;
  const search = filterText.toLowerCase();
  return allContacts.filter(contact =>
    contact.firstName.toLowerCase().includes(search) ||
    (contact.lastName?.toLowerCase().includes(search))
  );
}, [allContacts, filterText]);

// UI
<View>
  <TextInput
    style={styles.filterInput}
    placeholder="Rechercher un contact..."
    value={filterText}
    onChangeText={setFilterText}
  />
  <Pressable onPress={() => router.push('/(tabs)/search')}>
    <Text style={styles.askHint}>✨ Pose une question à l'IA</Text>
  </Pressable>
</View>
```

### UI
```
┌─────────────────────────────────┐
│ Recall People            ⚙️     │
├─────────────────────────────────┤
│ [🔍 Rechercher un contact...  ] │
│ ✨ Pose une question à l'IA     │
│                                 │
│ Contacts récents                │
│ (avatars horizontaux)           │
│                                 │
│ Tous les contacts               │
│ (liste filtrée)                 │
└─────────────────────────────────┘
```

---

## 4. Traductions à ajouter

### fr.json
```json
{
  "assistant": {
    "title": "Assistant",
    "inputPlaceholder": "Pose ta question...",
    "trialsRemaining": "{{count}} essais gratuits restants",
    "noTrialsLeft": "Tu as utilisé tes essais gratuits"
  },
  "contacts": {
    "filterPlaceholder": "Rechercher un contact...",
    "askHint": "✨ Pose une question à l'IA"
  }
}
```

### en.json
```json
{
  "assistant": {
    "title": "Assistant",
    "inputPlaceholder": "Ask your question...",
    "trialsRemaining": "{{count}} free trials remaining",
    "noTrialsLeft": "You've used your free trials"
  },
  "contacts": {
    "filterPlaceholder": "Search a contact...",
    "askHint": "✨ Ask a question to the AI"
  }
}
```

---

## 5. Fichiers impactés

### Backend
- `backend/src/routes/extract.ts` - ajouter check trials notes
- `backend/src/routes/ask.ts` - ajouter check trials ask
- `backend/src/routes/user.ts` (ou nouveau) - endpoint GET /trials
- Schema DB (Drizzle) - ajouter colonnes trials

### Frontend
- `frontend/app/(tabs)/search.tsx` - refonte complète
- `frontend/app/(tabs)/_layout.tsx` - renommer tab
- `frontend/app/(tabs)/index.tsx` - filtre + hint
- `frontend/locales/fr.json` - traductions
- `frontend/locales/en.json` - traductions
- `frontend/stores/subscription-store.ts` - ajouter trials state
- `frontend/lib/api.ts` - endpoint trials

---

## 6. Points d'attention

1. **ask.tsx existant** : Garder pour l'accès depuis une fiche contact (`contactId` param)
2. **Premium check** : Utiliser le store subscription + nouveau state trials
3. **UX essais** : Afficher clairement le compteur, message encourageant quand proche de 0
4. **Supprimer** : `useSemanticSearch` hook, `SearchResults`, `SearchSkeleton` (devenus inutiles)
