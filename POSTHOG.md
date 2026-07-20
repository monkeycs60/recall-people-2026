# PostHog — analytics, observabilité IA & error tracking (Recall People)

> **RÈGLE DE MAINTENANCE (importante).** Ce fichier décrit **tout ce qui est observé**.
> Si tu ajoutes / modifies une **feature user-facing** OU un **appel LLM**, tu **dois** mettre à
> jour l'instrumentation (events / `$ai_generation`) **ET** ce document. L'analytique ne doit
> jamais diverger du produit.

## Projet PostHog
- **PostHog Cloud EU**, projet `recall-people` (ID **207475**). Dashboard : https://eu.posthog.com/project/207475
- Clé **publique** (write-only, safe côté client) : `phc_Dh77ytMUJjDvZUyD2oZJ4SUa2ivrBuuXgAmvUNw2CBL5`
- Host d'ingestion : `https://eu.i.posthog.com` · `defaults: '2026-05-30'`
- Le projet PostHog peut proposer Session Replay, mais **l'enregistrement est explicitement désactivé dans le landing et le mobile**. L'error tracking reste actif.
- Coworker Malin utilise désormais son propre projet PostHog (ID 228077). Les événements historiques Coworker Malin restent présents ici, car PostHog ne permet pas leur suppression sélective ; les analyses Recall People gardent donc le filtre `product = 'recall'`.
- Clés via env (jamais de secret réel ici ; la clé est publique) :
  - landing : `PUBLIC_POSTHOG_KEY` / `PUBLIC_POSTHOG_HOST` (build-time Coolify)
  - mobile : `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_HOST` (en clair dans `frontend/eas.json`, comme RevenueCat/Google)
  - backend : `POSTHOG_KEY` / `POSTHOG_HOST` (Coolify, service recall-people-api)

## Principes (tout le projet)
- Chaque event porte les super-properties **`product: 'recall'`** + **`surface`** (`landing` | `mobile` | `api`) et **`$geoip_disable: true`** pour désactiver l'enrichissement géographique dérivé de l'adresse IP.
- **`identify(user.id, { provider })`** au login, **`reset()`** au logout → toutes les métriques sont **par utilisateur**, sans envoyer le nom ni l'adresse email à PostHog.
- Cohort dynamique **Internal / Test users** : propriété personne `$internal_or_test_user = true`. Le compte propriétaire connu est marqué dans PostHog ; les builds EAS internes portent `EXPO_PUBLIC_POSTHOG_INTERNAL_BUILD=true`. Sur la landing, `?posthog_internal=1` persiste le marquage dans le navigateur (`?posthog_internal=0` le retire).
- `person_profiles: 'identified_only'`. Pageviews/screens + events explicites, **sans autocapture de clics/touches ni session replay**. Les anciens `$autocapture` visibles dans PostHog viennent de builds antérieurs et ne décrivent pas la configuration actuelle.
- **Best-effort absolu** : aucune capture PostHog ne casse une action user (try/catch, no-op sans clé).

## Ce qui est observé, par surface

### Landing — surface `landing` (`landing-page/`, Astro)
Init : `landing-page/src/lib/analytics.ts` (appelé depuis `Layout.astro`).
- `$pageview` / `$pageleave`, events CTA/FAQ explicites, **error tracking** (`capture_exceptions`). Autocapture, session replay et enrichissement géographique désactivés.
- Events custom : `cta_get_the_app_click`, `cta_app_store_click`, `faq_item_open`.

### App mobile — surface `mobile` (`frontend/`, Expo / React Native)
Init : `frontend/lib/analytics.ts` + `PostHogProvider` dans `frontend/app/_layout.tsx` ; identify dans `frontend/stores/auth-store.ts` (+ `hooks/useAuth.ts`).
- Capture automatique des **screens uniquement** (pas des touches), **identify/reset**, **error tracking** (`ErrorUtils.setGlobalHandler` + `unhandledrejection`). Session replay désactivé (`enableSessionReplay: false`).
- Events custom (22), tous via le helper `analytics` (no-op si désactivé), avec super-props `product`/`surface` :
  - **Auth** : `sign_up`, `login`, `logout` (`hooks/useAuth.ts`, `stores/auth-store.ts`).
  - **Capture funnel** : `voice_recording_started`, `capture_processed` (`hooks/useRecording.ts`),
    **`note_created`**, **`contact_created`**, `reminder_set` (`app/review.tsx`).
  - **Cycle de vie contact** : **`contact_edited`** (`fields_changed`), **`contact_deleted`** — `services/contact.service.ts`.
  - **Cycle de vie note** : **`note_edited`** (`edited_transcription`/`edited_title`), **`note_deleted`** — `services/note.service.ts`.
  - **Groupes** : **`group_created`** — `services/group.service.ts` (point de création unique, `getOrCreate` y passe aussi).
  - **Hot topics** : **`hot_topic_resolved`** (`has_resolution`) — `services/hot-topic.service.ts`.
  - **Découverte** : **`search_performed`** (`scope`, `has_results`, `results_count` — **jamais le texte de la requête**) — `hooks/useSemanticSearch.ts`.
  - **Assistant IA** : `assistant_question_asked` (`app/ask.tsx`).
  - **Icebreakers** : **`icebreaker_viewed`** (`question_count`, `is_waiting` — jamais le contenu des questions), capté sur focus de l'écran — `app/contact/[id]/icebreakers.tsx`.
  - **Monétisation** : `paywall_viewed`, `subscription_started` (`components/Paywall.tsx`).
  - **Notifications & rappels** : **`notification_snoozed`** (`type: 'event_evening'`) — snooze « demain matin » depuis la notification de la veille (`app/_layout.tsx`) ; **`reminder_time_changed`** (`slot: 'evening' | 'morning'` — **jamais l'heure exacte**) — réglage global des heures de rappel dans Profile (`components/profile/ReminderTimeRows.tsx`) ; **`post_event_story_started`** (**aucune propriété** — ni id, ni titre de topic) — tap « Raconter » sur la carte post-événement en tête de fiche contact (`app/contact/[id]/index.tsx`). Le tap « Résolu 🎉 » de la même carte réutilise **`hot_topic_resolved`** (via `hotTopicService.resolve`, `has_resolution: false` pour une résolution générique) — pas d'event dédié.
  → mesure **notes / contacts créés & édités par utilisateur**, funnels d'activation, rétention, usage recherche, engagement sur la boucle post-événement.
- ℹ️ **Rappels 100 % locaux** (expo-notifications, **aucun push serveur**) : un hot topic daté programme désormais **2 notifications locales** (veille au soir + jour J au matin), **3 pour un anniversaire** (+ rappel J-7). Replanifiées à l'ouverture de l'app, donc pas d'event serveur associé.
- ℹ️ **Relance post-événement désormais GRATUITE** (le gate premium a sauté ; seul le toggle opt-out `postEventFollowUpEnabled` subsiste) : la notif lendemain-matin `reminder.postEvent` cible tous les utilisateurs, pas seulement les Premium → **le volume de notifs `post_event` va augmenter**. Nouveau wording social (« Demande-lui comment ça s'est passé : {{title}} 💬 » et équivalents 5 langues) — le corps contient le titre du topic **côté device uniquement**, jamais envoyé à PostHog. Le digest hebdo, lui, **reste premium**.
- ⚠️ Vie privée : les events portent **uniquement des compteurs / booléens** (longueurs, nombres de champs), **jamais de contenu** (nom, transcription, requête, résolution).
- ⚠️ Ces events sont **optimistes** (envoyés côté client) : ils peuvent se perdre (offline / app tuée avant flush / ad-blocker). Pour des **comptes fiables**, voir la section *Events autoritatifs backend* ci-dessous.
- ⚠️ Actif au **prochain build EAS** (committé, pas dans les builds déjà en review).

### Backend — surface `api` (`backend/`, Hono / Node)
Client : `backend/src/lib/posthog.ts` · flush par requête : `backend/src/middleware/posthog.ts` · helper IA : `backend/src/lib/ai-provider.ts` (`createTracedAIModel`).

#### Events autoritatifs produit (⭐ source de vérité pour les comptes)
Le mobile est **local-first + sync chiffré** : ses events sont *optimistes* et peuvent se perdre. Le **serveur fait foi** pour les créations/éditions/suppressions réelles. Émis depuis l'endpoint de **sync** (`backend/src/routes/sync.ts`, sur `POST /api/sync/push` et `POST /api/sync/initialize`) via `captureServerEvent(event, userId, props)` (`backend/src/lib/posthog.ts`).
- `distinct_id` = **user id** (donc directement comparable aux events mobile via `identify`), super-props `product:'recall'` + `surface:'api'`, prop `authoritative:true`.
- **Insert-vs-update** : chaque mutation passe par un `upsert`. On distingue un **vrai INSERT** d'une simple ré-écriture en sondant la ligne **avant** l'upsert (`assertAbsentOrOwned` renvoie `{ exists }` ; pour `contact_group` on sonde la clé unique `userId+contactId+groupId`). `wasInsert = !exists`.
- **Idempotence** : un resync d'un item existant retombe sur `wasInsert=false` → émet `*_updated`, **jamais** `*_created`. Les events ne sont fired qu'**après commit** de la transaction (collectés pendant l'apply, émis ensuite) → aucun event sur un insert rollback.
- **Mapping** (`toAuthoritativeEvent`) :
  - `contact` : `contact_created` (insert) / `contact_updated` / `contact_deleted` (op `delete`).
  - `note` : `note_created` / `note_updated` / `note_deleted`.
  - `group` : `group_created` / `group_updated` / `group_deleted`.
  - `contact_group` : `contact_added_to_group` (nouveau lien) / `contact_group_updated`.
  - `hot_topic` : `hot_topic_created` / `hot_topic_updated`.
  - L'opération `delete` (signal explicite du mobile) prime → `*_deleted` pour contact/note/group.
- ⚠️ **Contenu chiffré** côté backend : on ne logge **aucune** donnée perso, **uniquement** des ids techniques / flags. Best-effort absolu (no-op sans clé, jamais d'exception qui casse la sync).

#### Observabilité IA
- **Observabilité IA** : un **`$ai_generation`** par appel LLM (modèle, provider, tokens in/out, **coût**, latence, erreur), avec **privacy mode activé par défaut** : les prompts et outputs sont masqués :
  - via `withTracing` (`@posthog/ai`) : `ask`, `summary`, `extract`, `search`, `similarity`, `suggested-questions`, `detect-contact` + les 4 **évaluateurs** LLM-as-judge (Grok/xAI).
  - capture **manuelle** : `transcribe` (Groq Whisper), génération d'avatar (OpenAI `gpt-image-2`, 4 endpoints) ; uniquement métadonnées opérationnelles (longueur, durée, taille, modèle), jamais le contenu.
  - distinct_id = user id si dispo, sinon `recall-backend`.
- ⚠️ **Retries structurés** : `extract` et `detect-contact` réessaient jusqu'à **3×** en cas d'échec de génération structurée → **plusieurs `$ai_generation` peuvent apparaître pour une seule note** (compter les tentatives, pas les notes). `detect-contact` produit désormais une **sortie structurée** (`Output.object`, operationType `object-generation` dans les logs de perf) au lieu d'une génération de texte brut (`text-generation`).
- ⚠️ **`temperature: 0`** appliquée à toutes les routes à sortie structurée (`extract`, `detect-contact`, `summary`, `ask`, `similarity`, `search`) pour un résultat déterministe.
- ℹ️ **Préambule `respondingToTopic` (mode « Raconter »)** : quand l'utilisateur répond à un topic ciblé, `/api/extract` préfixe le prompt d'un préambule (id + titre + date de l'événement du topic) pour rattacher la note à l'actualité existante. Ce contenu est traité par le fournisseur IA après consentement, mais **reste masqué dans PostHog** par le privacy mode.
- ⚠️ **Retry côté client** : en cas d'échec d'extraction / transcription, la note est **conservée localement** avec une carte de retry ; le retry (déclenché par l'user) **rappelle le même endpoint avec le même transcript** → attendre des `$ai_generation` répétés sur un input identique.
- **Error tracking** : `app.onError` (`backend/src/index.ts`) + `captureException` sur chaque catch d'appel IA (provider/modèle/route en contexte).
- ⚠️ **`backend/.npmrc` (`legacy-peer-deps=true`)** est requis : `@posthog/ai` a un peer `@anthropic-ai/sdk` incompatible avec la version du projet. Ne pas le supprimer (sinon build Nixpacks KO).
- (Note : `@anthropic-ai/sdk`, Deepgram, Gemini sont dans package.json mais **pas appelés** → rien instrumenté dessus.)

## Où regarder dans PostHog
- **Product / Web analytics** : pageviews, funnels, events produit (par user via identify).
- **Session replay** : volontairement désactivé sur le web et le mobile pour protéger les données relationnelles.
- **AI observability** : coût / tokens / latence / erreurs par modèle & feature. ⚠️ se peuple au **1er appel IA réel** (enregistre une note dans l'app pour tester).
- **Error tracking** : exceptions groupées (front + back) + stack traces.

## Checklist quand tu modifies le produit
1. Nouvelle action user notable → `posthog.capture('event', {props})` sur la bonne surface, **garde les super-props**.
2. Nouvel appel LLM → wrappe avec `createTracedAIModel`/`withTracing` (AI SDK) **ou** capture un `$ai_generation` manuel.
3. Nouveau flux d'auth → garde `identify` / `reset`.
4. **Mets à jour ce fichier.**
