# Summary from Transcription - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace facts-based AI summary with transcription-based incremental summary generation.

**Architecture:** The summary is now generated as a second LLM call (Llama 3.1 8B via Cerebras) chained after extraction. It uses the existing summary + new transcription to produce an updated summary. The frontend passes the existing summary and receives the updated one in the extraction response.

**Tech Stack:** Vercel AI SDK, Cerebras (Llama 3.1 8B), expo-sqlite, React Native

---

## Task 1: Add Cerebras Llama 3.1 8B model helper

**Files:**
- Modify: `backend/src/lib/ai-provider.ts`

**Step 1: Add the model constant and helper function**

Add after line 25 (after PROVIDER_MODELS):

```typescript
/**
 * Llama 3.1 8B model for lightweight tasks like summary generation
 */
const LLAMA_8B_MODEL = 'llama-3.1-8b';

/**
 * Creates a Cerebras Llama 3.1 8B model for lightweight tasks
 * @param apiKey - Cerebras API key
 * @returns A configured Llama 3.1 8B model
 */
export function createLlama8BModel(apiKey: string) {
  const cerebras = createCerebras({ apiKey });
  return cerebras(LLAMA_8B_MODEL);
}
```

**Step 2: Verify the change compiles**

Run: `cd backend && npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add backend/src/lib/ai-provider.ts
git commit -m "feat(ai): add Llama 3.1 8B model helper for Cerebras"
```

---

## Task 2: Add summary generation to extract route

**Files:**
- Modify: `backend/src/routes/extract.ts`

**Step 1: Add existingSummary to ExtractionRequest type**

Modify the type at line 26:

```typescript
type ExtractionRequest = {
  transcription: string;
  existingSummary?: string | null;  // ADD THIS LINE
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
  }>;
  existingGroups?: Array<{
    id: string;
    name: string;
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
    hotTopics: Array<{
      id: string;
      title: string;
      context?: string;
    }>;
  };
  language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};
```

**Step 2: Add import for generateObject (for summary) and the new helper**

At the top, ensure these imports exist:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';
// ... existing imports ...
import { createLlama8BModel } from '../lib/ai-provider';
```

**Step 3: Add summary schema after extractionSchema (around line 119)**

```typescript
const summarySchema = z.object({
  summary: z.string().describe('Le résumé mis à jour de la personne (3-4 phrases)'),
  changed: z.boolean().describe('true si le résumé a été modifié, false sinon'),
});
```

**Step 4: Add summary generation function before the route handler**

Add before `extractRoutes.post('/', async (c) => {`:

```typescript
const SUMMARY_LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  fr: 'Tu DOIS répondre en français.',
  en: 'You MUST respond in English.',
  es: 'DEBES responder en español.',
  it: 'DEVI rispondere in italiano.',
  de: 'Du MUSST auf Deutsch antworten.',
};

async function generateContactSummary(params: {
  existingSummary: string | null;
  transcription: string;
  language: string;
  cerebrasApiKey: string;
}): Promise<{ summary: string; changed: boolean }> {
  const { existingSummary, transcription, language, cerebrasApiKey } = params;
  const langInstruction = SUMMARY_LANGUAGE_INSTRUCTIONS[language] || SUMMARY_LANGUAGE_INSTRUCTIONS.fr;

  const prompt = `Tu es un assistant qui maintient un résumé concis d'une personne.

CONTEXTE :
- Résumé actuel : ${existingSummary || 'Aucun (première note)'}
- Nouvelle transcription : ${transcription}

TÂCHE :

${existingSummary ? `Analyse si la nouvelle transcription apporte des informations significatives.
- Si oui : mets à jour le résumé en intégrant les nouvelles infos
- Si non : retourne le résumé existant tel quel et changed=false` : `Génère un résumé à partir des informations de la transcription, même si elles sont limitées. changed=true`}

RÈGLES :
- 3-4 phrases maximum
- Ne jamais inventer d'informations absentes de la transcription
- Conserver les infos importantes du résumé existant
- Ton neutre et factuel
- ${langInstruction}`;

  const model = createLlama8BModel(cerebrasApiKey);

  const { object } = await generateObject({
    model,
    schema: summarySchema,
    prompt,
  });

  return object;
}
```

**Step 5: Call summary generation in the route handler**

In the route handler, after the extraction LLM call and before building `formattedExtraction` (around line 280), add:

```typescript
    // Generate summary using Llama 3.1 8B
    let summaryResult = { summary: '', changed: false };
    if (c.env.CEREBRAS_API_KEY) {
      try {
        summaryResult = await generateContactSummary({
          existingSummary: body.existingSummary || null,
          transcription,
          language,
          cerebrasApiKey: c.env.CEREBRAS_API_KEY,
        });
      } catch (summaryError) {
        console.error('Summary generation failed:', summaryError);
        // Continue without summary on error
      }
    }
```

**Step 6: Add summary to formattedExtraction**

Modify the `formattedExtraction` object to include summary at the end:

```typescript
    const formattedExtraction = {
      // ... all existing fields ...
      note: {
        summary: extraction.hotTopics.length > 0
          ? extraction.hotTopics.map((topic) => topic.context).join(' ')
          : 'Note vocale enregistrée.',
        keyPoints: extraction.hotTopics.map((topic) => topic.title),
      },
      // ADD THIS:
      summary: summaryResult,
    };
```

**Step 7: Verify the change compiles**

Run: `cd backend && npm run typecheck`
Expected: No errors

**Step 8: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(extract): add summary generation with Llama 3.1 8B"
```

---

## Task 3: Delete the summary route

**Files:**
- Delete: `backend/src/routes/summary.ts`
- Modify: `backend/src/index.ts`

**Step 1: Find and remove summary routes registration**

In `backend/src/index.ts`, find and remove the import and registration of summaryRoutes.

Look for lines like:
```typescript
import { summaryRoutes } from './routes/summary';
// ...
app.route('/api/summary', summaryRoutes);
```

Remove both lines.

**Step 2: Delete the summary.ts file**

```bash
rm backend/src/routes/summary.ts
```

**Step 3: Remove evaluateSummary from evaluators.ts if not used elsewhere**

Check if `evaluateSummary` is used anywhere else:

```bash
grep -r "evaluateSummary" backend/src --include="*.ts" | grep -v "evaluators.ts"
```

If only used by summary.ts (now deleted), remove the function from `backend/src/lib/evaluators.ts`.

**Step 4: Verify the change compiles**

Run: `cd backend && npm run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated summary endpoint"
```

---

## Task 4: Update frontend ExtractionResult type

**Files:**
- Modify: `frontend/types/index.ts`

**Step 1: Add summary to ExtractionResult**

Find the `ExtractionResult` type (around line 190) and add the summary field:

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
  events: ExtractedEvent[];
  suggestedGroups?: SuggestedGroup[];
  note: {
    summary: string;
    keyPoints: string[];
  };
  // ADD THIS:
  summary?: {
    text: string;
    changed: boolean;
  };
};
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors)

**Step 3: Commit**

```bash
git add frontend/types/index.ts
git commit -m "feat(types): add summary to ExtractionResult"
```

---

## Task 5: Update extractInfo API function

**Files:**
- Modify: `frontend/lib/api.ts`

**Step 1: Add existingSummary parameter to extractInfo**

Update the function signature (around line 151):

```typescript
export const extractInfo = async (data: {
  transcription: string;
  existingSummary?: string | null;  // ADD THIS
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
  }>;
  existingGroups?: Array<{
    id: string;
    name: string;
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
    hotTopics: Array<{
      id: string;
      title: string;
      context?: string;
    }>;
  };
}): Promise<{
  extraction: ExtractionResult;
}> => {
  return apiCall('/api/extract', {
    method: 'POST',
    body: { ...data, language: getCurrentLanguage() },
  });
};
```

**Step 2: Delete the generateSummary function**

Remove the entire `generateSummary` function (lines 186-210):

```typescript
// DELETE THIS ENTIRE FUNCTION:
export const generateSummary = async (data: {
  contact: {
    firstName: string;
    lastName?: string;
  };
  facts: Array<{
    factType: string;
    factKey: string;
    factValue: string;
  }>;
  hotTopics: Array<{
    title: string;
    context: string;
    status: string;
  }>;
}): Promise<string> => {
  const response = await apiCall<{ success: boolean; summary: string }>(
    '/api/summary',
    {
      method: 'POST',
      body: { ...data, language: getCurrentLanguage() },
    }
  );
  return response.summary;
};
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Errors in files that import generateSummary (we'll fix those next)

**Step 4: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(api): add existingSummary to extractInfo, remove generateSummary"
```

---

## Task 6: Update useRecording hook

**Files:**
- Modify: `frontend/hooks/useRecording.ts`

**Step 1: Pass existingSummary when calling extractInfo for preselected contact**

Find the `extractInfo` call for preselected contacts (around line 125) and add `existingSummary`:

```typescript
          const { extraction } = await extractInfo({
            transcription: transcriptionResult.transcript,
            existingSummary: preselectedContact.aiSummary || null,  // ADD THIS
            existingContacts: contactsForExtraction,
            currentContact: {
              id: preselectedContact.id,
              firstName: preselectedContact.firstName,
              lastName: preselectedContact.lastName,
              facts: facts.map((fact) => ({
                factType: fact.factType,
                factKey: fact.factKey,
                factValue: fact.factValue,
              })),
              hotTopics: activeHotTopics.map((topic) => ({
                id: topic.id,
                title: topic.title,
                context: topic.context,
              })),
            },
          });
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add frontend/hooks/useRecording.ts
git commit -m "feat(recording): pass existingSummary to extractInfo"
```

---

## Task 7: Update select-contact screen

**Files:**
- Modify: `frontend/app/select-contact.tsx`

**Step 1: Pass existingSummary when selecting existing contact**

Find `handleSelectContact` (around line 90) and add `existingSummary`:

```typescript
  const handleSelectContact = async (contact: Contact) => {
    setIsExtracting(true);
    try {
      const contactsForExtraction = contacts.map((contactItem) => ({
        id: contactItem.id,
        firstName: contactItem.firstName,
        lastName: contactItem.lastName,
      }));

      const [facts, hotTopics] = await Promise.all([
        factService.getByContact(contact.id),
        hotTopicService.getByContact(contact.id),
      ]);

      const activeHotTopics = hotTopics.filter((topic) => topic.status === 'active');

      const { extraction } = await extractInfo({
        transcription,
        existingSummary: contact.aiSummary || null,  // ADD THIS
        existingContacts: contactsForExtraction,
        currentContact: {
          // ... rest stays the same
        },
      });
```

**Step 2: Ensure contact has aiSummary available**

Check that the `Contact` type passed includes `aiSummary`. The contacts from `useContactsQuery` should include it. If not, you may need to update the query.

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

**Step 4: Commit**

```bash
git add frontend/app/select-contact.tsx
git commit -m "feat(select-contact): pass existingSummary to extractInfo"
```

---

## Task 8: Update review screen to use extraction summary

**Files:**
- Modify: `frontend/app/review.tsx`

**Step 1: Remove generateSummary import**

At line 18, remove `generateSummary` from the import:

```typescript
// BEFORE:
import { generateSummary, generateIceBreakers } from '@/lib/api';

// AFTER:
import { generateIceBreakers } from '@/lib/api';
```

**Step 2: Replace the async generateSummary call with extraction summary**

Find the code block at lines 423-463 in `handleSave`:

```typescript
      // REMOVE THIS BLOCK:
      await contactService.update(finalContactId, { aiSummary: '', iceBreakers: [] });

      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      // ... etc

      const contactDetails = await contactService.getById(finalContactId);
      if (contactDetails) {
        const requestData = {
          // ...
        };

        generateSummary(requestData)
          .then(async (summary) => {
            await contactService.update(finalContactId, { aiSummary: summary });
          })
          .catch(() => {});

        generateIceBreakers(requestData)
        // ...
      }
```

Replace with:

```typescript
      // Save summary from extraction if changed
      if (extraction.summary?.changed && extraction.summary.text) {
        await contactService.update(finalContactId, { aiSummary: extraction.summary.text });
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.facts.byContact(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotTopics.byContact(finalContactId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.memories.byContact(finalContactId) });

      // Generate ice breakers in background (keep this for now)
      const contactDetails = await contactService.getById(finalContactId);
      if (contactDetails) {
        const requestData = {
          contact: {
            firstName: contactDetails.firstName,
            lastName: contactDetails.lastName,
          },
          facts: contactDetails.facts.map((fact) => ({
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
          })),
          hotTopics: contactDetails.hotTopics
            .filter((topic) => topic.status === 'active')
            .map((topic) => ({
              title: topic.title,
              context: topic.context || '',
              status: topic.status,
            })),
        };

        generateIceBreakers(requestData)
          .then(async (iceBreakers) => {
            await contactService.update(finalContactId, { iceBreakers });
          })
          .catch(() => {});
      }
```

**Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add frontend/app/review.tsx
git commit -m "feat(review): use extraction summary instead of separate API call"
```

---

## Task 9: Update contactService.getAll to include aiSummary

**Files:**
- Modify: `frontend/services/contact.service.ts`

**Step 1: Check if getAll already returns aiSummary**

Looking at the current code, `getAll` does NOT return `ai_summary`. We need to add it so that `select-contact.tsx` has access to the contact's aiSummary.

Update the SELECT query and mapping in `getAll` (around line 6):

```typescript
  getAll: async (): Promise<Contact[]> => {
    const db = await getDatabase();
    const result = await db.getAllAsync<{
      id: string;
      first_name: string;
      last_name: string | null;
      nickname: string | null;
      photo_uri: string | null;
      phone: string | null;
      email: string | null;
      birthday_day: number | null;
      birthday_month: number | null;
      birthday_year: number | null;
      highlights: string | null;
      ai_summary: string | null;  // ADD THIS
      last_contact_at: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM contacts ORDER BY last_contact_at DESC');

    return result.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      nickname: row.nickname || undefined,
      photoUri: row.photo_uri || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      birthdayDay: row.birthday_day || undefined,
      birthdayMonth: row.birthday_month || undefined,
      birthdayYear: row.birthday_year || undefined,
      highlights: JSON.parse(row.highlights || '[]'),
      aiSummary: row.ai_summary || undefined,  // ADD THIS
      lastContactAt: row.last_contact_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
```

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add frontend/services/contact.service.ts
git commit -m "feat(contact): include aiSummary in getAll query"
```

---

## Task 10: End-to-end test

**Step 1: Start the backend**

```bash
cd backend && npm run dev
```

**Step 2: Start the frontend**

```bash
cd frontend && npx expo start
```

**Step 3: Manual test flow**

1. Record a new audio note for an existing contact
2. Verify extraction returns with a summary
3. Save the note
4. Check that the contact's AI summary is updated
5. Record another note for the same contact
6. Verify the summary is updated (or unchanged if no new info)

**Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "test: verify summary from transcription feature"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `backend/src/lib/ai-provider.ts` | Add Llama 3.1 8B helper |
| `backend/src/routes/extract.ts` | Add summary generation |
| `backend/src/routes/summary.ts` | DELETE |
| `backend/src/index.ts` | Remove summary route registration |
| `backend/src/lib/evaluators.ts` | Remove evaluateSummary (if unused) |
| `frontend/types/index.ts` | Add summary to ExtractionResult |
| `frontend/lib/api.ts` | Add existingSummary param, delete generateSummary |
| `frontend/hooks/useRecording.ts` | Pass existingSummary |
| `frontend/app/select-contact.tsx` | Pass existingSummary |
| `frontend/app/review.tsx` | Use extraction summary |
| `frontend/services/contact.service.ts` | Include aiSummary in getAll |
