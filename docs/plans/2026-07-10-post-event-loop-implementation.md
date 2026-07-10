# Chantier Boucle Post-Événement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** La relance post-événement devient gratuite et sociale : notif lendemain matin au wording social, carte in-app "Résolu 🎉 / Raconter" en tête de fiche pour les topics passés non résolus, et « Raconter » injecte le topic ciblé en préambule du prompt d'extraction.

**Architecture:** Le backend gagne un préambule de prompt (`respondingToTopic`) construit par une lib pure testée. Le frontend débloque le paywall post_event (service + Profile), reformule la notif, et ajoute une carte sur la fiche contact branchée sur le mécanisme de présélection existant (`preselectedContactId`/`preselectedHotTopicId` du app-store + `getRecordingHotTopics`). La landing passe le follow-up en gratuit.

**Tech Stack:** Hono/Vercel AI SDK (backend), Expo/React Native + Zustand + TanStack Query (frontend), Astro (landing), `node --test` + `loadTsModule` des deux côtés, i18n 5 langues (FR/EN/ES/IT/DE).

**Design de référence:** `docs/plans/2026-07-04-product-roadmap-design.md` section 4. Décisions verrouillées : GRATUIT et activé par défaut ; pas de 2e notification (la relance J+3 est silencieuse, in-app) ; zéro culpabilisation (pas de badge rouge ni compteur sur la carte) ; estompage visuel après ~2 semaines ; le mécanisme `resolvedTopics[]` existant porte la résolution.

**Contraintes frontend (frontend/CLAUDE.md):** pas de nouveau `useEffect`, pas de `any`, StyleSheet + `@/constants/theme.ts`, max 5 props, i18n 5 langues, composants >350 lignes à splitter.

**État actuel (vérifié 2026-07-10, post-chantier notifications):**
- `reminderService.schedulePostEventFollowUps` (`frontend/services/reminder.service.ts:212-264`) : double gate `isPremium` (l.213-217) + `postEventFollowUpEnabled` (l.219-223) ; fenêtre `[today-4d, today)`, `notified_at IS NULL`, `birthday_contact_id IS NULL`, LIMIT 3 ; marque `notified_at`.
- Toggle Profile DANS le bloc `{isPremium && ...}` (`frontend/app/(tabs)/profile.tsx:314-331`).
- Wording actuel `reminder.postEvent` : « {{title}} c'était cette semaine — prends des nouvelles ? ».
- La fiche contact (`frontend/app/contact/[id]/index.tsx`) filtre les topics passés hors du hero tile via `isHotTopicTodayOrFuture` (`frontend/utils/hotTopics.ts:139-144`). `isHotTopicOverdue` existe (l.132-137).
- Résolution : `hotTopicService.resolve(id, resolution?)` (`services/hot-topic.service.ts:223`) + mutation `useResolveHotTopic()` (`hooks/useContactQuery.ts:89-102`, invalide les bonnes queries). `HotTopicsList.tsx` est du code mort orphelin — ne pas s'en servir.
- Présélection : store `app-store.ts` (`preselectedContactId`/`preselectedHotTopicId` + setters). `catch-up.tsx:115-121` montre le pattern exact : set les deux → `router.push('/record', { initialMode: 'audio' })`. `useRecording.processTranscription` (l.174-277) lit le store, focalise via `getRecordingHotTopics` (`utils/recordingContext.ts:3-12`) et envoie `currentContact` à `/api/extract` (`lib/api.ts:236-272`).
- Landing (Astro, EN only) : « Post-event follow-up reminders » listé en Premium (`landing-page/src/pages/index.astro:290-293`) ; FAQ le décrit comme premium (`landing-page/src/components/Faq.astro:28-29`) ; tuile « Smart notifications » (`index.astro:133-145`).
- Baselines : frontend `npm test` = 142 pass / 4 fails pré-existants (bundling esbuild) ; `tsc --noEmit` = 9 erreurs pré-existantes (use-theme-color, collapsible, admin/monitoring, SearchResults, ToastConfig) ; backend `npm test` = 61 pass, typecheck 0.

---

## Task 0: Branche

```bash
cd /home/clement/Desktop/recall-people-2026 && git checkout master && git pull && git checkout -b feat/post-event-loop
```

---

## Task 1: Backend — préambule `respondingToTopic` dans le prompt d'extraction (TDD)

**Files:**
- Create: `backend/src/lib/responding-topic.ts`
- Test: `backend/test/responding-topic.test.mjs`
- Modify: `backend/src/routes/extract.ts`

**Step 1: Test qui échoue** (`backend/test/responding-topic.test.mjs`, pattern `loadTsModule` identique à `backend/test/event-date-guard.test.mjs`) :

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'responding-topic';

async function loadModule() {
  return loadTsModule({ entryPoint: 'src/lib/responding-topic.ts', suiteName });
}

const TOPIC = { id: 'topic-1', title: 'Entretien chez Google', eventDate: '2026-07-03' };

test('builds a French preamble with topic id, title and date', async () => {
  const { buildRespondingToTopicPreamble } = await loadModule();
  const preamble = buildRespondingToTopicPreamble(TOPIC, 'fr');
  assert.match(preamble, /topic-1/);
  assert.match(preamble, /Entretien chez Google/);
  assert.match(preamble, /2026-07-03/);
  assert.match(preamble, /resolvedTopics/);
});

test('supports the five languages and falls back to French', async () => {
  const { buildRespondingToTopicPreamble } = await loadModule();
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'en'), /The user is replying about/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'es'), /El usuario responde/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'it'), /L'utente risponde/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'de'), /Der Benutzer antwortet/);
  assert.match(buildRespondingToTopicPreamble(TOPIC, 'pt'), /L'utilisateur répond/);
});

test('omits the date clause when eventDate is missing', async () => {
  const { buildRespondingToTopicPreamble } = await loadModule();
  const preamble = buildRespondingToTopicPreamble({ id: 't2', title: 'Déménagement' }, 'fr');
  assert.doesNotMatch(preamble, /undefined/);
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

**Step 2:** `cd backend && node --test test/responding-topic.test.mjs` → FAIL (module absent).

**Step 3: Implémentation** `backend/src/lib/responding-topic.ts` :

```ts
export type RespondingToTopic = {
  id: string;
  title: string;
  eventDate?: string | null;
};

const TEMPLATES: Record<string, (topic: RespondingToTopic, dateClause: string) => string> = {
  fr: (topic, dateClause) => `CONTEXTE DE RÉPONSE - PRIORITAIRE:
L'utilisateur répond à propos de l'actualité existante [ID: ${topic.id}] « ${topic.title} »${dateClause}.
- Les pronoms et références implicites ("ça", "c'était", "il/elle") se rapportent à cette actualité.
- Si la note raconte l'issue ou le déroulement de cette actualité, ajoute une entrée dans resolvedTopics avec existingTopicId = "${topic.id}" et une résolution détaillée.
- Ne crée PAS de nouveau hot topic doublonnant cette actualité.`,
  en: (topic, dateClause) => `REPLY CONTEXT - PRIORITY:
The user is replying about the existing update [ID: ${topic.id}] "${topic.title}"${dateClause}.
- Pronouns and implicit references ("it", "that", "he/she") refer to this update.
- If the note tells how this update went, add an entry to resolvedTopics with existingTopicId = "${topic.id}" and a detailed resolution.
- Do NOT create a new hot topic duplicating this update.`,
  es: (topic, dateClause) => `CONTEXTO DE RESPUESTA - PRIORITARIO:
El usuario responde sobre la novedad existente [ID: ${topic.id}] « ${topic.title} »${dateClause}.
- Los pronombres y referencias implícitas se refieren a esta novedad.
- Si la nota cuenta cómo fue esta novedad, añade una entrada en resolvedTopics con existingTopicId = "${topic.id}" y una resolución detallada.
- NO crees un nuevo hot topic que duplique esta novedad.`,
  it: (topic, dateClause) => `CONTESTO DI RISPOSTA - PRIORITARIO:
L'utente risponde riguardo alla novità esistente [ID: ${topic.id}] « ${topic.title} »${dateClause}.
- I pronomi e i riferimenti impliciti si riferiscono a questa novità.
- Se la nota racconta com'è andata questa novità, aggiungi una voce in resolvedTopics con existingTopicId = "${topic.id}" e una risoluzione dettagliata.
- NON creare un nuovo hot topic che duplichi questa novità.`,
  de: (topic, dateClause) => `ANTWORTKONTEXT - PRIORITÄT:
Der Benutzer antwortet zur bestehenden Neuigkeit [ID: ${topic.id}] „${topic.title}"${dateClause}.
- Pronomen und implizite Bezüge beziehen sich auf diese Neuigkeit.
- Wenn die Notiz erzählt, wie diese Neuigkeit ausgegangen ist, füge einen Eintrag in resolvedTopics mit existingTopicId = "${topic.id}" und einer detaillierten Lösung hinzu.
- Erstelle KEIN neues Hot Topic, das diese Neuigkeit dupliziert.`,
};

const DATE_CLAUSES: Record<string, (eventDate: string) => string> = {
  fr: (eventDate) => ` (événement du ${eventDate})`,
  en: (eventDate) => ` (event on ${eventDate})`,
  es: (eventDate) => ` (evento del ${eventDate})`,
  it: (eventDate) => ` (evento del ${eventDate})`,
  de: (eventDate) => ` (Ereignis am ${eventDate})`,
};

export const buildRespondingToTopicPreamble = (
  topic: RespondingToTopic,
  language: string
): string => {
  const template = TEMPLATES[language] || TEMPLATES.fr;
  const dateClause = topic.eventDate
    ? (DATE_CLAUSES[language] || DATE_CLAUSES.fr)(topic.eventDate)
    : '';
  return template(topic, dateClause);
};
```

**Step 4:** tests verts (`node --test test/responding-topic.test.mjs`).

**Step 5: Câblage extract.ts** :
- Type `ExtractionRequest` : ajouter `respondingToTopic?: { id: string; title: string; eventDate?: string | null };`
- Import `buildRespondingToTopicPreamble`.
- `buildExtractionPrompt(transcription, currentContact, language)` → ajouter un 4e paramètre `respondingToTopic?: ExtractionRequest['respondingToTopic']` et insérer juste après `${template.dateReference(currentDate)}` et le calendrier :

```ts
const respondingToTopicPreamble = respondingToTopic
  ? `\n\n${buildRespondingToTopicPreamble(respondingToTopic, language)}`
  : '';
```

(interpolé dans le template string après le bloc calendrier). Passer `body.respondingToTopic` depuis le handler.

**Step 6:** `npm test` backend → 64/64 (61 + 3 nouveaux) ; `npm run typecheck` → clean.

**Step 7: Commit**

```bash
git add backend/src/lib/responding-topic.ts backend/test/responding-topic.test.mjs backend/src/routes/extract.ts
git commit -m "feat(backend): preambule respondingToTopic dans le prompt d'extraction (mode Raconter)"
```

---

## Task 2: Frontend — envoyer `respondingToTopic` quand un topic est ciblé (TDD sur l'util)

**Files:**
- Modify: `frontend/utils/recordingContext.ts`
- Test: Create `frontend/test/recording-context.test.mjs`
- Modify: `frontend/hooks/useRecording.ts` (~l.200-219), `frontend/lib/api.ts` (~l.247-261)

**Step 1: Test qui échoue** (`frontend/test/recording-context.test.mjs`, pattern loadTsModule des tests frontend existants) : nouvelle fonction `getRespondingToTopic(activeHotTopics, preselectedHotTopicId)` → retourne `{ id, title, eventDate }` du topic présélectionné s'il existe, `undefined` sinon (id absent ou null).

```js
const TOPICS = [
  { id: 'a', title: 'Entretien', eventDate: '2026-07-08', status: 'active' },
  { id: 'b', title: 'Déménagement', eventDate: null, status: 'active' },
];
// getRespondingToTopic(TOPICS, 'a') → { id: 'a', title: 'Entretien', eventDate: '2026-07-08' }
// getRespondingToTopic(TOPICS, 'zzz') → undefined ; getRespondingToTopic(TOPICS, null) → undefined
```

**Step 2-3:** RED → implémenter dans `utils/recordingContext.ts` (typer avec le type HotTopic existant du fichier ; ne pas casser `getRecordingHotTopics`).

**Step 4: Câblage** :
- `lib/api.ts` `extractInfo` : ajouter `respondingToTopic?: { id: string; title: string; eventDate?: string | null }` au type du body (il part tel quel dans le POST existant).
- `useRecording.ts` `processTranscription` : à côté de l'appel `getRecordingHotTopics` (l.203), calculer `const respondingToTopic = getRespondingToTopic(activeHotTopics, preselectedHotTopicId);` et l'ajouter au payload `extractInfo({ ..., respondingToTopic })`.

**Step 5:** `npm test` frontend → 145 pass / 4 fails pré-existants ; tsc → 9 pré-existants.

**Step 6: Commit** `feat(frontend): le mode Raconter envoie le topic cible a l'extraction`

---

## Task 3: Post-événement GRATUIT + nouveau wording de notif

**Files:**
- Modify: `frontend/services/reminder.service.ts:212-223`, `frontend/app/(tabs)/profile.tsx:314-331`, `frontend/locales/{fr,en,es,it,de}.json`

**Step 1:** `schedulePostEventFollowUps` : SUPPRIMER le gate `isPremium` (l.213-217) — garder le gate `postEventFollowUpEnabled`. Supprimer l'import `useSubscriptionStore` s'il ne sert plus qu'à ça dans ce fichier (vérifier `scheduleWeeklyDigest` qui reste premium — l'import reste).

**Step 2:** `profile.tsx` : sortir la `SettingsRow` post-event du bloc `{isPremium && ...}` (le digest hebdo y reste). La placer juste après les lignes Rappels du soir/matin (`<ReminderTimeRows />`) et la ligne notSeenThreshold.

**Step 3: Wording (remplacer la valeur de la clé existante `reminder.postEvent`)** :

| langue | nouvelle valeur |
|---|---|
| fr | `Demande-lui comment ça s'est passé : {{title}} 💬` |
| en | `Ask them how it went: {{title}} 💬` |
| es | `Pregúntale cómo fue: {{title}} 💬` |
| it | `Chiedigli com'è andata: {{title}} 💬` |
| de | `Frag nach, wie es gelaufen ist: {{title}} 💬` |

(Le titre de la notif reste le nom du contact — pas besoin de prénom dans le corps.)

**Step 4:** tests + tsc (baselines). **Step 5: Commit** `feat(frontend): relance post-evenement gratuite + wording social de la notif`

---

## Task 4: Carte in-app "Résolu 🎉 / Raconter" en tête de fiche contact (TDD sur l'util)

**Files:**
- Modify: `frontend/utils/hotTopics.ts`
- Test: Modify `frontend/test/hot-topics.test.mjs` (suite existante)
- Create: `frontend/components/contact/PostEventFollowUpCard.tsx`
- Modify: `frontend/app/contact/[id]/index.tsx`
- Modify: `frontend/locales/{fr,en,es,it,de}.json`

**Step 1: Util TDD** — dans `utils/hotTopics.ts`, nouvelle fonction pure :

```ts
export type PastUnresolvedTopic = {
  id: string;
  title: string;
  eventDate: string;
  daysPast: number;
  isStale: boolean; // > 14 jours → estompage
};

export const getPastUnresolvedHotTopics = (
  hotTopics: HotTopic[],   // réutiliser le type du fichier
  now: Date = new Date()
): PastUnresolvedTopic[] => { ... };
```

Comportement (tests dans `frontend/test/hot-topics.test.mjs`, à ajouter à la suite existante) :
- garde uniquement `status === 'active'`, `eventDate` non nul, `isHotTopicOverdue(eventDate, now)` (réutiliser l'existant l.132) et `birthdayContactId` absent (pas de relance sur un anniversaire) ;
- tri du plus récemment passé au plus ancien ;
- `daysPast` = jours entiers depuis l'événement ; `isStale` = `daysPast > 14`.

**Step 2:** RED → GREEN → suite `hot-topics` verte.

**Step 3: Composant** `PostEventFollowUpCard.tsx` (≤5 props — recommandé : `{ topic: PastUnresolvedTopic, onResolve: () => void, onTellStory: () => void }`) :
- Carte discrète (fond `Colors` neutre/violet clair, PAS de rouge, PAS de badge ni compteur — décision design « zéro culpabilisation »).
- Texte : `t('postEvent.cardTitle', { title })` + sous-texte relatif `t('postEvent.cardDaysAgo', { count: daysPast })`.
- Deux boutons : `t('postEvent.resolveButton')` (🎉) et `t('postEvent.tellButton')` (« Raconter », style primaire).
- Si `topic.isStale` : `opacity: 0.6` sur la carte (nouveau pattern assumé, validé par le design « s'estompe visuellement après ~2 semaines »).
- StyleSheet + theme, pas de useEffect.

**Step 4: Intégration fiche contact** (`app/contact/[id]/index.tsx`) :
- Memo `pastUnresolvedTopics = getPastUnresolvedHotTopics(contact.hotTopics)` ; afficher la carte pour le PREMIER élément uniquement (le plus récent), au-dessus du hero tile « à venir ».
- `onResolve` : mutation `useResolveHotTopic()` existante (`hooks/useContactQuery.ts:89`) avec `resolve(topic.id)` sans texte (résolution générique) — elle invalide déjà les queries.
- `onTellStory` : pattern exact de `catch-up.tsx:114-121` → `setPreselectedContactId(contactId)`, `setPreselectedHotTopicId(topic.id)`, `router.push({ pathname: '/record', params: { initialMode: 'audio' } })`.

**Step 5: i18n** (5 langues, clés sous `postEvent`) :

| clé | fr | en | es | it | de |
|---|---|---|---|---|---|
| `cardTitle` | `Comment ça s'est passé : {{title}} ?` | `How did it go: {{title}}?` | `¿Cómo fue: {{title}}?` | `Com'è andata: {{title}}?` | `Wie ist es gelaufen: {{title}}?` |
| `cardDaysAgo_one` | `il y a {{count}} jour` | `{{count}} day ago` | `hace {{count}} día` | `{{count}} giorno fa` | `vor {{count}} Tag` |
| `cardDaysAgo_other` | `il y a {{count}} jours` | `{{count}} days ago` | `hace {{count}} días` | `{{count}} giorni fa` | `vor {{count}} Tagen` |
| `resolveButton` | `Résolu 🎉` | `Resolved 🎉` | `Resuelto 🎉` | `Risolto 🎉` | `Erledigt 🎉` |
| `tellButton` | `Raconter` | `Tell the story` | `Contar` | `Racconta` | `Erzählen` |

**Step 6:** tests + tsc (baselines). **Step 7: Commit** `feat(frontend): carte post-evenement Resolu/Raconter en tete de fiche contact`

---

## Task 5: Landing — follow-up affiché gratuit + tuile notifications à jour

**Files:**
- Modify: `landing-page/src/pages/index.astro` (l.133-145, l.231-265, l.266-303), `landing-page/src/components/Faq.astro` (l.25-29), `FONCTIONNALITES.md`

**Step 1:** Pricing : déplacer « Post-event follow-up reminders » de la liste Premium (l.290-293) vers la liste Free (l.231-265), même markup `<Check />`.
**Step 2:** FAQ (l.28-29) : la réponse « What extra notifications do I get with Premium? » ne doit plus citer le post-event follow-up — la réécrire autour du weekly digest ; mentionner que les rappels d'événements (veille + jour J + snooze + anniversaire J-7) et le post-event follow-up sont inclus gratuitement.
**Step 3:** Tuile « Smart notifications » (l.133-145) : mettre à jour la copy pour reprendre le chantier notifications livré — double reminder (evening before + morning of), snooze to tomorrow morning, configurable times, birthday week-ahead. Style/format identique aux autres tuiles.
**Step 4:** `FONCTIONNALITES.md` : section notifications à jour (double rappel, snooze, heures réglables, anniversaire J-7, post-événement gratuit).
**Step 5:** `cd landing-page && npm run build` → build OK.
**Step 6: Commit** `feat(landing): follow-up post-evenement affiche gratuit + copy notifications a jour`

⚠️ NE PAS déployer manuellement : le push sur master déclenche Vercel.

---

## Task 6: Analytics + POSTHOG.md

**Files:** `frontend/lib/analytics.ts`, `frontend/components/contact/PostEventFollowUpCard.tsx` (ou la fiche contact, selon où vivent les handlers), `POSTHOG.md`

- Lire POSTHOG.md AVANT (règle projet).
- Nouvel event `POST_EVENT_STORY_STARTED = 'post_event_story_started'` capturé au tap « Raconter » (aucune donnée personnelle, pas le titre du topic). Le tap « Résolu 🎉 » est DÉJÀ tracké par `HOT_TOPIC_RESOLVED` dans `hotTopicService.resolve` — ne pas doublonner ; ajouter la propriété `source: 'post_event_card'`? NON — la signature du service ne la porte pas ; rester simple, pas de nouveau paramètre.
- POSTHOG.md : documenter l'event, le passage du post_event en gratuit (volume de notifs `post_event` va augmenter), le nouveau wording, et `respondingToTopic` (le prompt extract peut contenir un préambule — pas de nouvelle donnée capturée).
- Commit `feat(frontend): analytics Raconter + POSTHOG.md a jour (post-evenement gratuit)`

---

## Task 7: Vérification finale

1. `cd backend && npm test && npm run typecheck` → 64/64, clean.
2. `cd frontend && npm test` → 145 pass / 4 fails pré-existants ; `rtk proxy npx tsc --noEmit` → 9 pré-existants.
3. `cd landing-page && npm run build` → OK.
4. Relire `git diff master...HEAD` : naming, pas de any/useEffect, i18n 5 langues, pas de gate premium résiduel sur post_event.

---

## Notes pour l'exécuteur

- Le toggle `postEventFollowUpEnabled` reste (opt-out possible), seul le gate premium saute. Le digest hebdo RESTE premium.
- La carte ne s'affiche que pour le topic passé le PLUS RÉCENT (les autres restent accessibles via catch-up) — pas de liste, pas de compteur.
- « Raconter » doit marcher aussi en mode TEXTE (le flux `processText` passe par le même `processTranscription` — aucun code en plus, mais le QA le testera).
- La réconciliation des prix landing (4,99 €) vs docs internes est HORS SCOPE — décision produit en attente.
- QA émulateur après merge review : utiliser le skill projet `.claude/skills/qa-emulator/SKILL.md`.
