# PostHog — analytics, observabilité IA & error tracking (Recall People)

> **RÈGLE DE MAINTENANCE (importante).** Ce fichier décrit **tout ce qui est observé**.
> Si tu ajoutes / modifies une **feature user-facing** OU un **appel LLM**, tu **dois** mettre à
> jour l'instrumentation (events / `$ai_generation`) **ET** ce document. L'analytique ne doit
> jamais diverger du produit.

## Projet PostHog
- **PostHog Cloud EU**, projet `Default project` (ID **207475**). Dashboard : https://eu.posthog.com/project/207475
- Clé **publique** (write-only, safe côté client) : `phc_Dh77ytMUJjDvZUyD2oZJ4SUa2ivrBuuXgAmvUNw2CBL5`
- Host d'ingestion : `https://eu.i.posthog.com` · `defaults: '2026-05-30'`
- Réglages projet ON : **Session replay**, **Exception autocapture**.
- Projet **partagé** avec Coworker Malin → on distingue via la super-property `product`.
- Clés via env (jamais de secret réel ici ; la clé est publique) :
  - landing : `PUBLIC_POSTHOG_KEY` / `PUBLIC_POSTHOG_HOST` (build-time Coolify)
  - mobile : `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_HOST` (en clair dans `frontend/eas.json`, comme RevenueCat/Google)
  - backend : `POSTHOG_KEY` / `POSTHOG_HOST` (Coolify, service recall-people-api)

## Principes (tout le projet)
- Chaque event porte les super-properties **`product: 'recall'`** + **`surface`** (`landing` | `mobile` | `api`).
- **`identify(user.id, {...})`** au login, **`reset()`** au logout → toutes les métriques sont **par utilisateur**.
- `person_profiles: 'identified_only'`. Autocapture + pageviews/screens + session replay partout.
- **Best-effort absolu** : aucune capture PostHog ne casse une action user (try/catch, no-op sans clé).

## Ce qui est observé, par surface

### Landing — surface `landing` (`landing-page/`, Astro)
Init : `landing-page/src/lib/analytics.ts` (appelé depuis `Layout.astro`).
- Autocapture (clics/forms), `$pageview` / `$pageleave`, **session replay**, **error tracking** (`capture_exceptions`).
- Events custom : `cta_get_the_app_click`, `cta_app_store_click`, `faq_item_open`.

### App mobile — surface `mobile` (`frontend/`, Expo / React Native)
Init : `frontend/lib/analytics.ts` + `PostHogProvider` dans `frontend/app/_layout.tsx` ; identify dans `frontend/stores/auth-store.ts` (+ `hooks/useAuth.ts`).
- Autocapture (**screens** + touches), **identify/reset**, **error tracking** (`ErrorUtils.setGlobalHandler` + `unhandledrejection`).
- Events custom (19), tous via le helper `analytics` (no-op si désactivé), avec super-props `product`/`surface` :
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
  → mesure **notes / contacts créés & édités par utilisateur**, funnels d'activation, rétention, usage recherche.
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
- **Observabilité IA** : un **`$ai_generation`** par appel LLM (modèle, provider, tokens in/out, **coût**, latence, input/output, erreur) :
  - via `withTracing` (`@posthog/ai`) : `ask`, `summary`, `extract`, `search`, `similarity`, `suggested-questions`, `detect-contact` + les 4 **évaluateurs** LLM-as-judge (Grok/xAI).
  - capture **manuelle** : `transcribe` (Groq Whisper), génération d'avatar (OpenAI `gpt-image-2`, 4 endpoints).
  - distinct_id = user id si dispo, sinon `recall-backend`.
- ⚠️ **Retries structurés** : `extract` et `detect-contact` réessaient jusqu'à **3×** en cas d'échec de génération structurée → **plusieurs `$ai_generation` peuvent apparaître pour une seule note** (compter les tentatives, pas les notes). `detect-contact` produit désormais une **sortie structurée** (`Output.object`, operationType `object-generation` dans les logs de perf) au lieu d'une génération de texte brut (`text-generation`).
- ⚠️ **`temperature: 0`** appliquée à toutes les routes à sortie structurée (`extract`, `detect-contact`, `summary`, `ask`, `similarity`, `search`) pour un résultat déterministe.
- ⚠️ **Retry côté client** : en cas d'échec d'extraction / transcription, la note est **conservée localement** avec une carte de retry ; le retry (déclenché par l'user) **rappelle le même endpoint avec le même transcript** → attendre des `$ai_generation` répétés sur un input identique.
- **Error tracking** : `app.onError` (`backend/src/index.ts`) + `captureException` sur chaque catch d'appel IA (provider/modèle/route en contexte).
- ⚠️ **`backend/.npmrc` (`legacy-peer-deps=true`)** est requis : `@posthog/ai` a un peer `@anthropic-ai/sdk` incompatible avec la version du projet. Ne pas le supprimer (sinon build Nixpacks KO).
- (Note : `@anthropic-ai/sdk`, Deepgram, Gemini sont dans package.json mais **pas appelés** → rien instrumenté dessus.)

## Où regarder dans PostHog
- **Product / Web analytics** : pageviews, funnels, events produit (par user via identify).
- **Session replay** : rejouer les sessions (web + mobile).
- **AI observability** : coût / tokens / latence / erreurs par modèle & feature. ⚠️ se peuple au **1er appel IA réel** (enregistre une note dans l'app pour tester).
- **Error tracking** : exceptions groupées (front + back) + stack traces.

## Checklist quand tu modifies le produit
1. Nouvelle action user notable → `posthog.capture('event', {props})` sur la bonne surface, **garde les super-props**.
2. Nouvel appel LLM → wrappe avec `createTracedAIModel`/`withTracing` (AI SDK) **ou** capture un `$ai_generation` manuel.
3. Nouveau flux d'auth → garde `identify` / `reset`.
4. **Mets à jour ce fichier.**
