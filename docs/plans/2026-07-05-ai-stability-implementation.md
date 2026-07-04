# Stabilité IA — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Une note n'est jamais perdue : retries sur `extract`/`detect-contact`, sortie structurée sur `detect-contact`, `temperature: 0` partout, garde-fous déterministes sur les dates, et état "à réessayer" côté app.

**Architecture:** Backend Hono (`backend/src/routes/*.ts`) appelant Cerebras `gpt-oss-120b` via Vercel AI SDK (`generateText` + `Output.object`). Le pattern de retry existe déjà dans `summary.ts:227-249` — on le factorise dans un helper `lib/generation-retry.ts` et on l'applique à `extract` et `detect-contact`. Frontend Expo : le pipeline post-transcription de `useRecording.ts` est extrait en fonction réutilisable pour permettre un retry sans ré-enregistrement.

**Tech Stack:** Hono, Vercel AI SDK (`ai` : `generateText`, `Output.object`), zod, node:test (backend, via `test/helpers/load-ts-module.mjs`), Expo/React Native, Zustand, i18next (5 langues obligatoires : FR/EN/ES/IT/DE).

**Décision explicite : PAS de fallback de provider.** On reste 100 % Cerebras. Ne jamais changer le nom du modèle (règle CLAUDE.md frontend : "NEVER TOUCH llm model name").

**Contraintes frontend (CLAUDE.md frontend) :** pas de `useEffect`, pas de `any`, pas de commentaires explicatifs, `StyleSheet.create` + couleurs de `@/constants/theme.ts`, toutes les chaînes traduites dans les 5 langues.

**Commandes de vérification :**
- Backend : `cd backend && npm test` (node --test) et `npm run typecheck`
- Frontend : `cd frontend && npx tsc --noEmit`

---

### Task 1: Helper de retry `generateWithRetries`

**Files:**
- Create: `backend/src/lib/generation-retry.ts`
- Test: `backend/test/generation-retry.test.mjs`

**Step 1: Write the failing test**

```js
// backend/test/generation-retry.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'generation-retry';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/generation-retry.ts',
    suiteName,
  });
}

test.after(() => cleanTsModule(suiteName));

test('returns the first successful result without retrying', async () => {
  const { generateWithRetries } = await loadModule();
  let calls = 0;
  const result = await generateWithRetries(async () => {
    calls += 1;
    return 'ok';
  }, { label: 'test' });
  assert.equal(result, 'ok');
  assert.equal(calls, 1);
});

test('retries after a failure and returns the later success', async () => {
  const { generateWithRetries } = await loadModule();
  let calls = 0;
  const result = await generateWithRetries(async () => {
    calls += 1;
    if (calls < 3) throw new Error('schema validation failed');
    return 'recovered';
  }, { label: 'test' });
  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
});

test('throws the last error after maxAttempts failures', async () => {
  const { generateWithRetries } = await loadModule();
  let calls = 0;
  await assert.rejects(
    () => generateWithRetries(async () => {
      calls += 1;
      throw new Error(`failure ${calls}`);
    }, { label: 'test', maxAttempts: 3 }),
    /failure 3/
  );
  assert.equal(calls, 3);
});
```

Note : vérifier dans un test existant (ex. `backend/test/validation.test.mjs`) si `cleanTsModule`/`test.after` est utilisé ; copier exactement le pattern du repo (certains tests ne nettoient pas).

**Step 2: Run test to verify it fails**

Run: `cd backend && node --test test/generation-retry.test.mjs`
Expected: FAIL (module `src/lib/generation-retry.ts` introuvable)

**Step 3: Write minimal implementation**

```ts
// backend/src/lib/generation-retry.ts
export type GenerationRetryOptions = {
	label: string;
	maxAttempts?: number;
};

// gpt-oss-120b intermittently returns output that fails schema
// validation (NoObjectGeneratedError); retrying makes it reliable.
export async function generateWithRetries<T>(
	generate: () => Promise<T>,
	{ label, maxAttempts = 3 }: GenerationRetryOptions
): Promise<T> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await generate();
		} catch (generationError) {
			lastError = generationError;
			if (attempt === maxAttempts) {
				break;
			}
			console.warn(
				`[${label}] Structured generation failed (attempt ${attempt}/${maxAttempts}), retrying:`,
				generationError instanceof Error
					? generationError.message
					: String(generationError)
			);
		}
	}
	throw lastError;
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && node --test test/generation-retry.test.mjs`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add backend/src/lib/generation-retry.ts backend/test/generation-retry.test.mjs
git commit -m "feat(backend): helper generateWithRetries pour la generation structuree"
```

---

### Task 2: Garde-fou déterministe sur les dates `sanitizeEventDate`

**Files:**
- Create: `backend/src/lib/event-date-guard.ts`
- Test: `backend/test/event-date-guard.test.mjs`

Règle produit (design §2.4) : une date d'événement extraite par le LLM n'est gardée que si elle est un ISO `YYYY-MM-DD` valide, pas plus de 30 jours dans le passé, pas plus de 2 ans dans le futur. Sinon le hot topic est **conservé mais non daté** (pas de fausse notification). L'IA propose, le code vérifie.

**Step 1: Write the failing test**

```js
// backend/test/event-date-guard.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'event-date-guard';
const NOW = new Date('2026-07-05T12:00:00Z');

async function loadModule() {
  return loadTsModule({
    entryPoint: 'src/lib/event-date-guard.ts',
    suiteName,
  });
}

test('keeps a valid near-future date', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2026-07-20', NOW), '2026-07-20');
});

test('keeps a date within the recent-past window (post-event follow-up)', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2026-06-20', NOW), '2026-06-20');
});

test('rejects null, undefined and non-ISO formats', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate(null, NOW), undefined);
  assert.equal(sanitizeEventDate(undefined, NOW), undefined);
  assert.equal(sanitizeEventDate('20/07/2026', NOW), undefined);
  assert.equal(sanitizeEventDate('demain', NOW), undefined);
});

test('rejects impossible calendar dates', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2026-02-31', NOW), undefined);
});

test('rejects far past and far future', async () => {
  const { sanitizeEventDate } = await loadModule();
  assert.equal(sanitizeEventDate('2025-01-15', NOW), undefined);
  assert.equal(sanitizeEventDate('2029-07-05', NOW), undefined);
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && node --test test/event-date-guard.test.mjs`
Expected: FAIL (module introuvable)

**Step 3: Write minimal implementation**

```ts
// backend/src/lib/event-date-guard.ts
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAST_DAYS = 30;
const MAX_FUTURE_YEARS = 2;

export function sanitizeEventDate(
	eventDate: string | null | undefined,
	now: Date
): string | undefined {
	if (!eventDate || !ISO_DATE_PATTERN.test(eventDate)) {
		return undefined;
	}

	const parsed = new Date(`${eventDate}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime())) {
		return undefined;
	}
	if (parsed.toISOString().slice(0, 10) !== eventDate) {
		return undefined;
	}

	const pastLimit = new Date(now);
	pastLimit.setUTCDate(pastLimit.getUTCDate() - MAX_PAST_DAYS);
	const futureLimit = new Date(now);
	futureLimit.setUTCFullYear(futureLimit.getUTCFullYear() + MAX_FUTURE_YEARS);

	if (parsed.getTime() < pastLimit.getTime() || parsed.getTime() > futureLimit.getTime()) {
		return undefined;
	}

	return eventDate;
}
```

(Le round-trip `toISOString` élimine les dates impossibles type `2026-02-31` que `new Date` fait déborder en mars.)

**Step 4: Run test to verify it passes**

Run: `cd backend && node --test test/event-date-guard.test.mjs`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add backend/src/lib/event-date-guard.ts backend/test/event-date-guard.test.mjs
git commit -m "feat(backend): garde-fou deterministe sanitizeEventDate sur les dates extraites"
```

---

### Task 3: `extract.ts` — retries + temperature 0 + garde-fou dates

**Files:**
- Modify: `backend/src/routes/extract.ts:1204-1225` (appel LLM) et `:1263-1278` (mapping hotTopics)

**Step 1: Ajouter les imports**

En tête de `extract.ts`, à côté des imports existants de `../lib/ai-provider` :

```ts
import { generateWithRetries } from '../lib/generation-retry';
import { sanitizeEventDate } from '../lib/event-date-guard';
```

et ajouter `getStructuredOutputSettings` à l'import existant depuis `../lib/ai-provider`.

**Step 2: Remplacer l'appel LLM (lignes ~1204-1225)**

Le timeout de 15 s devient **par tentative** (AbortController recréé à chaque essai, `clearTimeout` dans un `finally`) :

```ts
const { output: extractionResult } = await measurePerformance(
	() =>
		generateWithRetries(
			async () => {
				const extractionController = new AbortController();
				const extractionTimeout = setTimeout(
					() => extractionController.abort(),
					15000
				);
				try {
					return await generateText({
						model,
						output: Output.object({ schema: extractionSchema }),
						prompt,
						abortSignal: extractionController.signal,
						...getStructuredOutputSettings(),
					});
				} finally {
					clearTimeout(extractionTimeout);
				}
			},
			{ label: 'Extract' }
		),
	{
		route: '/extract',
		provider: getAIProviderName(providerConfig),
		model: getAIModel(providerConfig),
		operationType: 'object-generation',
		inputSize: new TextEncoder().encode(prompt).length,
		metadata: { language, hasCurrentContact: !!currentContact },
		enabled: !!c.env.ENABLE_PERFORMANCE_LOGGING as boolean,
	}
);
```

Supprimer l'ancien `AbortController`/`setTimeout`/`clearTimeout` extérieurs (lignes 1204-1205 et 1225).

**Step 3: Appliquer le garde-fou de dates dans le mapping hotTopics (lignes ~1263-1278)**

```ts
hotTopics: extraction.hotTopics.map((topic) => {
	const safeEventDate = sanitizeEventDate(topic.eventDate, new Date());
	let suggestedDate: string | undefined;
	if (safeEventDate) {
		const [year, month, day] = safeEventDate.split('-');
		suggestedDate = `${day}/${month}/${year}`;
	}
	return {
		title: topic.title,
		context: topic.context,
		eventDate: safeEventDate,
		suggestedDate,
	};
}),
```

**Step 4: Typecheck + tests**

Run: `cd backend && npm run typecheck && npm test`
Expected: PASS, aucune régression

**Step 5: Commit**

```bash
git add backend/src/routes/extract.ts
git commit -m "feat(backend): retries x3, temperature 0 et garde-fou dates sur /extract"
```

---

### Task 4: `detect-contact.ts` — sortie structurée + retries + temperature 0

**Files:**
- Modify: `backend/src/routes/detect-contact.ts:735-792` (appel LLM + parsing), imports en tête, suppression de `parseDetectionResponse` (`:546-567`)

Le point le plus fragile du pipeline : aujourd'hui `generateText` brut → regex `/\{[\s\S]*\}/` → `JSON.parse` → `safeParse`. On migre vers `Output.object({ schema: detectionSchema })` (même mécanique que `extract.ts`, même modèle — ça fonctionne). `validateDetection` (correction des IDs hallucinés, `:573`) est **conservé tel quel**.

**Step 1: Imports**

```ts
import { generateText, Output } from 'ai';                    // ajouter Output à l'import existant
import { generateWithRetries } from '../lib/generation-retry';
import { getStructuredOutputSettings } from '../lib/ai-provider';
```

**Step 2: Remplacer le bloc appel + parsing (lignes ~735-792)**

Les deux blocs try/catch (`llmError` et `parseError`) fusionnent en un seul — la validation zod est faite par `Output.object`, un échec de schéma est retenté comme un échec réseau :

```ts
let detection: DetectionResult;
try {
	const result = await measurePerformance(
		() =>
			generateWithRetries(
				() =>
					generateText({
						model,
						output: Output.object({ schema: detectionSchema }),
						prompt,
						...getStructuredOutputSettings(),
						experimental_telemetry: {
							isEnabled: c.env.ENABLE_LANGFUSE === 'true',
							metadata: {
								route: '/detect-contact',
								language,
								contactsCount: contacts.length,
							},
						},
					}),
				{ label: 'DetectContact' }
			),
		{
			route: '/detect-contact',
			provider: 'cerebras',
			model: modelName,
			operationType: 'object-generation',
			inputSize: new TextEncoder().encode(prompt).length,
			metadata: { language, contactsCount: contacts.length },
			enabled: c.env.ENABLE_PERFORMANCE_LOGGING === 'true' || c.env.ENABLE_PERFORMANCE_LOGGING === true,
		}
	);
	detection = result.output!;
} catch (llmError) {
	const errorMessage = llmError instanceof Error ? llmError.message : String(llmError);
	console.error('[detect-contact] LLM call failed:', {
		error: errorMessage,
		model: modelName,
		transcriptionLength: transcription.length,
		contactsCount: contacts.length,
	});
	captureServerException(llmError, userId, {
		feature: 'detect-contact',
		route: '/api/detect-contact',
		provider: 'cerebras',
		model: modelName,
		stage: 'llm-call',
	});
	trace?.update({ output: { error: `LLM error: ${errorMessage}` } });
	return c.json({ error: `LLM call failed: ${errorMessage}` }, 500);
}
```

Attention : `rawResponse` disparaît — vérifier qu'aucun code plus bas (Langfuse `generation?.end`, logs) ne le référence encore ; remplacer par `detection` le cas échéant.

**Step 3: Supprimer `parseDetectionResponse` (`:546-567`)**

Supprimer la fonction entière (plus aucun appelant). `DetectionResult` (`:544`) et `detectionSchema` restent.

**Step 4: Typecheck + tests**

Run: `cd backend && npm run typecheck && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/routes/detect-contact.ts
git commit -m "feat(backend): /detect-contact en sortie structuree + retries x3 + temperature 0"
```

---

### Task 5: `temperature: 0` sur les routes structurées restantes

**Files:**
- Modify: `backend/src/routes/summary.ts:231`, `backend/src/routes/ask.ts:407`, `backend/src/routes/similarity.ts:126`, `backend/src/routes/search.ts:150`

`getStructuredOutputSettings()` (`backend/src/lib/ai-provider.ts:198`) existe mais n'est appelé nulle part. `extract` et `detect-contact` sont déjà couverts (Tasks 3-4). `suggested-questions.ts` et `transcribe.ts` ne sont **pas** concernés (pas de sortie structurée).

**Step 1: Pour chacun des 4 fichiers**

Ajouter `getStructuredOutputSettings` à l'import existant depuis `../lib/ai-provider`, puis dans l'appel `generateText({ ... })` qui porte `Output.object`, ajouter en dernière propriété :

```ts
...getStructuredOutputSettings(),
```

**Step 2: Typecheck + tests**

Run: `cd backend && npm run typecheck && npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/src/routes/summary.ts backend/src/routes/ask.ts backend/src/routes/similarity.ts backend/src/routes/search.ts
git commit -m "feat(backend): temperature 0 sur toutes les routes a sortie structuree"
```

---

### Task 6: Frontend — la note survit à l'échec (état "à réessayer")

**Files:**
- Modify: `frontend/hooks/useRecording.ts` (refactor pipeline + état d'échec)
- Modify: `frontend/app/record.tsx` (UI retry)
- Modify: `frontend/locales/fr.json`, `en.json`, `es.json`, `it.json`, `de.json`

Comportement cible : si la transcription a réussi mais que l'extraction/détection échoue (malgré les retries backend), l'utilisateur ne ré-enregistre **jamais**. L'écran record affiche une carte "Analyse échouée — ta note est sauvegardée" avec **Réessayer** (relance uniquement l'étape serveur ratée, à partir de la transcription conservée) et **Abandonner**. Si c'est la transcription elle-même qui échoue, le retry repart de l'audio conservé (`uri`).

**Step 1: Refactor `useRecording.ts` — extraire le pipeline post-transcription**

Le code actuel duplique la logique entre `stopRecording` (`:203-356`) et `processText` (`:381+`). Extraire une fonction interne :

```ts
type FailedProcessing = {
	audioUri: string | null;
	transcription: string;
};

const [failedProcessing, setFailedProcessing] = useState<FailedProcessing | null>(null);
```

```ts
const processTranscription = async (
	audioUri: string | null,
	transcript: string
): Promise<void> => {
	const freshContacts = useContactsStore.getState().contacts;
	// ... corps actuel de stopRecording à partir de la ligne 232
	// (branche preselectedContactId → extractInfo → router.replace('/review')
	//  sinon detectContact → router.push('/select-contact')),
	// en remplaçant `uri` par `audioUri ?? ''` dans les params de navigation
	// et `transcriptionResult.transcript` par `transcript`.
};
```

`stopRecording` devient : stop recorder → `transcribeAudio(uri)` → `processTranscription(uri, transcript)`. `processText` appelle `processTranscription(null, text)`.

**Step 2: Gestion d'échec différenciée dans le catch**

Dans le `catch` de `stopRecording` (et `processText`), remplacer le reset sec actuel (`:344-354`) :

```ts
const transcriptSoFar = useAppStore.getState().currentTranscription;
if (transcriptSoFar) {
	setFailedProcessing({ audioUri: uri ?? null, transcription: transcriptSoFar });
} else if (uri) {
	setFailedProcessing({ audioUri: uri, transcription: '' });
}
setRecordingState('idle');
setProcessingStep(null);
showErrorToast(
	i18n.t('recording.errors.processingFailed'),
	backendMessage || i18n.t('recording.errors.noteSafeRetry')
);
```

Important : ne plus effacer `preselectedContactId`/`preselectedHotTopicId` en cas d'échec (le retry en a besoin) ; les effacer seulement dans `discardFailedProcessing` et en fin de succès.

**Step 3: Exposer `retryProcessing` et `discardFailedProcessing`**

```ts
const retryProcessing = async () => {
	if (!failedProcessing) return;
	setFailedProcessing(null);
	setRecordingState('processing');
	try {
		if (!failedProcessing.transcription) {
			setProcessingStep('transcribing');
			const transcriptionResult = await transcribeAudio(failedProcessing.audioUri!);
			setCurrentTranscription(transcriptionResult.transcript);
			await processTranscription(failedProcessing.audioUri, transcriptionResult.transcript);
		} else {
			await processTranscription(failedProcessing.audioUri, failedProcessing.transcription);
		}
	} catch (error) {
		// même logique de catch que Step 2
	}
};

const discardFailedProcessing = () => {
	setFailedProcessing(null);
	setPreselectedContactId(null);
	setPreselectedHotTopicId(null);
};
```

Retourner `failedProcessing`, `retryProcessing`, `discardFailedProcessing` depuis le hook.

**Step 4: UI dans `record.tsx`**

Quand `failedProcessing !== null` (et `recordingState === 'idle'`), afficher à la place du `RecordButton`/`TranscriptionLoader` une carte (StyleSheet, couleurs de `@/constants/theme.ts`) :

- Titre : `recording.retry.title`
- Sous-titre : `recording.retry.subtitle`
- Bouton primaire : `recording.retry.retryButton` → `retryProcessing()`
- Bouton secondaire : `recording.retry.discardButton` → `discardFailedProcessing()`

Vérifier que le `useFocusEffect` de reset existant dans `record.tsx` ne purge pas `failedProcessing` au re-focus (l'état doit survivre tant que l'utilisateur n'a pas choisi).

**Step 5: i18n — 5 langues obligatoires**

Ajouter dans chaque fichier de `frontend/locales/` (sous `recording`) :

```jsonc
// fr.json
"errors": { "noteSafeRetry": "Ta note est sauvegardée, tu peux réessayer sans ré-enregistrer." },
"retry": {
  "title": "L'analyse a échoué",
  "subtitle": "Ta note est sauvegardée. Réessaie sans ré-enregistrer.",
  "retryButton": "Réessayer",
  "discardButton": "Abandonner"
}
// en.json
"errors": { "noteSafeRetry": "Your note is safe — you can retry without recording again." },
"retry": {
  "title": "Analysis failed",
  "subtitle": "Your note is safe. Retry without recording again.",
  "retryButton": "Retry",
  "discardButton": "Discard"
}
// es.json
"errors": { "noteSafeRetry": "Tu nota está guardada, puedes reintentar sin volver a grabar." },
"retry": {
  "title": "El análisis falló",
  "subtitle": "Tu nota está guardada. Reintenta sin volver a grabar.",
  "retryButton": "Reintentar",
  "discardButton": "Descartar"
}
// it.json
"errors": { "noteSafeRetry": "La tua nota è al sicuro, puoi riprovare senza registrare di nuovo." },
"retry": {
  "title": "Analisi non riuscita",
  "subtitle": "La tua nota è al sicuro. Riprova senza registrare di nuovo.",
  "retryButton": "Riprova",
  "discardButton": "Annulla"
}
// de.json
"errors": { "noteSafeRetry": "Deine Notiz ist gesichert – du kannst es erneut versuchen, ohne neu aufzunehmen." },
"retry": {
  "title": "Analyse fehlgeschlagen",
  "subtitle": "Deine Notiz ist gesichert. Versuche es erneut, ohne neu aufzunehmen.",
  "retryButton": "Erneut versuchen",
  "discardButton": "Verwerfen"
}
```

(Fusionner avec les clés `errors` existantes, ne pas écraser.)

**Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS

**Step 7: Commit**

```bash
git add frontend/hooks/useRecording.ts frontend/app/record.tsx frontend/locales/*.json
git commit -m "feat(frontend): la note survit a un echec d'extraction (etat a reessayer + retry sans re-enregistrement)"
```

---

### Task 7: Vérification de bout en bout + PostHog doc

**Step 1: Suite complète**

Run: `cd backend && npm run typecheck && npm test && cd ../frontend && npx tsc --noEmit`
Expected: tout PASS

**Step 2: QA manuelle sur émulateur (compte QA, cf. CLAUDE.md racine)**

1. Lancer le backend local (`cd backend && npm run dev`) et l'app (`EXPO_PUBLIC_API_URL=http://10.0.2.2:8787 npx expo start --android --dev-client`).
2. Enregistrer une note vocale mentionnant une date relative ("elle passe son permis demain") → vérifier hot topic daté correct.
3. Enregistrer une note SANS contact présélectionné → vérifier la détection.
4. Couper le backend, enregistrer une note → vérifier : toast d'erreur + carte "Réessayer" affichée, la transcription n'est pas perdue ; relancer le backend, taper Réessayer → la note aboutit à l'écran review.

**Step 3: Mettre à jour `POSTHOG.md`** (règle CLAUDE.md projet : tout changement d'appel LLM doit y être reflété)

Documenter : retries sur extract/detect-contact (les `$ai_generation` peuvent apparaître en multiple par note), detect-contact passé en object-generation, temperature 0 partout.

**Step 4: Commit final**

```bash
git add POSTHOG.md
git commit -m "docs(posthog): retries extract/detect-contact + temperature 0"
```
