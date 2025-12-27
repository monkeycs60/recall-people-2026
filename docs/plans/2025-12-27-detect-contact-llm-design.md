# Design : Détection de Contact par LLM

## Contexte

Le système actuel utilise des regex pour détecter les noms dans les transcriptions vocales. Cette approche est fragile et rate beaucoup de cas. On remplace par un appel LLM léger (Cerebras llama3.1-8b).

## Flow

```
Recording → Transcription → detect-contact (LLM) → select-contact (pré-sélectionné) → Extract → Review
```

**Changements :**
- Nouveau endpoint `/detect-contact` avec Cerebras llama3.1-8b
- `select-contact` reçoit une pré-sélection intelligente (1 tap pour confirmer)
- Suppression des regex dans select-contact.tsx

**Latence ajoutée :** ~300-500ms

## Endpoint `/detect-contact`

### Request

```typescript
POST /api/detect-contact

{
  transcription: string,
  contacts: Array<{
    id: string,
    firstName: string,
    lastName?: string,
    nickname?: string,
    aiSummary?: string,
    hotTopics: Array<{
      title: string,
      context?: string
    }>
  }>
}
```

### Response

```typescript
{
  success: true,
  detection: {
    contactId: string | null,           // ID si contact existant, null sinon
    firstName: string,                  // Toujours présent
    lastName: string | null,            // Seulement si mentionné explicitement
    suggestedNickname: string | null,   // Généré si pas de lastName
    confidence: "high" | "medium" | "low",
    isNew: boolean,
    candidateIds: string[]              // IDs des contacts ambigus
  }
}
```

### Modèle

- **Provider :** Cerebras
- **Modèle :** llama3.1-8b
- **Context :** 32k tokens (suffisant pour ~200 contacts)

## Logique de détection

### Cas 1 : Contact existant identifié avec certitude
- `contactId` = ID du contact
- `candidateIds` = []
- `confidence` = "high"
- `isNew` = false

### Cas 2 : Ambiguïté entre plusieurs contacts (même prénom)
- `contactId` = null
- `candidateIds` = [id1, id2, ...]
- `confidence` = "medium"
- `isNew` = false
- Le LLM utilise aiSummary + hotTopics pour tenter de trancher

### Cas 3 : Nouveau contact
- `contactId` = null
- `candidateIds` = []
- `confidence` = "high"
- `isNew` = true
- `suggestedNickname` généré intelligemment par le LLM

## Génération du nickname

Le LLM génère un nickname intelligent basé sur l'info principale :
- "Paul Google" (prénom + entreprise)
- "Marie running" (prénom + hobby)
- "Sophie RH" (prénom + métier simplifié)

Cette logique pourra être harmonisée avec Extract plus tard.

## Modifications UI : select-contact.tsx

### Suppression
- `useMemo` avec regex (lignes 32-46)

### Nouveaux props
```typescript
type SelectContactParams = {
  audioUri: string;
  transcription: string;
  detection: {
    contactId: string | null;
    firstName: string;
    lastName: string | null;
    suggestedNickname: string | null;
    confidence: "high" | "medium" | "low";
    isNew: boolean;
    candidateIds: string[];
  };
};
```

### Affichage

**Section "Suggestion" en haut :**
- Si `contactId` → affiche le contact pré-sélectionné (highlight)
- Si `candidateIds.length > 0` → affiche les candidats
- Si `isNew` → affiche "Créer [firstName] [nickname]"

**Section "Tous les contacts" en bas :**
- Searchbar
- Liste complète (fallback si le LLM s'est trompé)

## Prompt LLM

```
Tu es un assistant qui identifie le contact principal d'une note vocale.

TRANSCRIPTION:
"${transcription}"

CONTACTS EXISTANTS:
${contacts.map(...)}

RÈGLES:
1. Identifie le PROTAGONISTE PRINCIPAL (pas les mentions secondaires)
2. Si un contact existant correspond:
   - Utilise le contexte (résumé, sujets) pour confirmer
   - Si 2+ contacts ont le même prénom: utilise le contexte pour choisir
   - Si le contexte ne permet pas de trancher: retourne les IDs candidats
3. Si c'est un nouveau contact:
   - Extrais prénom + nom si mentionné
   - Sinon génère un nickname intelligent basé sur l'info principale
4. Le prénom doit être un VRAI prénom (pas "contact", "ami", "collègue")
```

## Décisions prises

| Question | Décision |
|----------|----------|
| Output pour contact existant | Retourner l'ID pour pré-sélection |
| Cas d'ambiguïté | Écran disambiguation avec suggestions + liste complète |
| Données envoyées au LLM | Tout (aiSummary + hotTopics), context 32k suffisant |
| Génération nickname | LLM génère intelligemment |
| Noms multiples | Protagoniste principal uniquement |
| Position dans le flow | Toujours passer par select-contact (1 tap) |
| Changement de contact après Extract | Impossible (on confirme AVANT Extract) |
| Création du contact | Différée dans Review (comportement actuel) |
| lastName vs nickname | Champs séparés |
