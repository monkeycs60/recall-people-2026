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
- Events custom (11) : `sign_up`, `login`, `logout`, `voice_recording_started`, `capture_processed`,
  **`note_created`**, **`contact_created`**, `reminder_set`, `assistant_question_asked`, `paywall_viewed`, `subscription_started`.
  → mesure **notes / contacts créés par utilisateur**, funnels d'activation, rétention.
- ⚠️ Actif au **prochain build EAS** (committé, pas dans les builds déjà en review).

### Backend — surface `api` (`backend/`, Hono / Node)
Client : `backend/src/lib/posthog.ts` · flush par requête : `backend/src/middleware/posthog.ts` · helper IA : `backend/src/lib/ai-provider.ts` (`createTracedAIModel`).
- **Observabilité IA** : un **`$ai_generation`** par appel LLM (modèle, provider, tokens in/out, **coût**, latence, input/output, erreur) :
  - via `withTracing` (`@posthog/ai`) : `ask`, `summary`, `extract`, `search`, `similarity`, `suggested-questions`, `detect-contact` + les 4 **évaluateurs** LLM-as-judge (Grok/xAI).
  - capture **manuelle** : `transcribe` (Groq Whisper), génération d'avatar (OpenAI `gpt-image-2`, 4 endpoints).
  - distinct_id = user id si dispo, sinon `recall-backend`.
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
