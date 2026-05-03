# Recall People — Vue d'ensemble du projet

> Document de synthèse exhaustif du projet **Recall People** : problème adressé, solution, architecture, stack, fonctionnalités, modèle économique et pitch marketing.
>
> Dernière mise à jour : 2026-05-03

---

## 1. Pitch en une phrase

**Recall People** est une application mobile (iOS + Android) qui transforme une simple note vocale post-conversation en une fiche contact enrichie par IA, pour ne plus jamais oublier les détails qui comptent sur les gens que vous croisez — le tout en stockant 100 % des données localement sur le téléphone.

> *"You forget 80% of every conversation. Recall remembers everything. Just talk — AI organizes the rest."*

---

## 2. Le problème

### Le constat humain

Nous oublions environ **80 % d'une conversation dans les 24 heures** qui suivent. Concrètement, après un événement de networking, un dîner, un point client ou une simple discussion à la machine à café :

- On oublie le prénom de la personne, le nom de ses enfants, sa ville natale.
- On ne se souvient plus du projet sur lequel elle bosse, de l'entretien qu'elle préparait, du voyage qu'elle planifiait.
- On rate la fenêtre pour suivre un événement important (entretien, opération, anniversaire, mariage, marathon…).
- Trois mois après, recroiser quelqu'un devient inconfortable parce qu'on n'a aucun élément de relance.

### Pourquoi les solutions actuelles échouent

| Outil | Limites |
|---|---|
| **CRMs pro** (Salesforce, HubSpot, Pipedrive) | Pensés pour des pipelines commerciaux B2B, lourds, payants, pas adaptés aux relations personnelles. |
| **Notes papier / Notes mobiles** | Saisie manuelle pénible, données non structurées, aucune relance possible, aucune recherche sémantique. |
| **Carnet de contacts natif** | Pas de notes contextuelles, pas de rappels d'événements, pas d'IA. |
| **Apps "memory" génériques** | Pas centrées sur les personnes, pas voice-first, pas de privacy locale par défaut. |

Recall People se positionne comme **un CRM personnel, voice-first et privacy-first** — une catégorie distincte des CRMs B2B et des apps de notes génériques.

---

## 3. La solution — Comment ça marche

### Le flow utilisateur en 4 étapes

1. **Parler** : après une conversation, l'utilisateur ouvre l'app, tape sur le bouton micro et dicte une note libre (1 min en gratuit, 3 min en Pro). Mode texte disponible si pas de micro.
2. **Transcrire** : l'audio est envoyé au backend, transcrit par Whisper v3 Turbo (Groq) dans la langue parlée.
3. **Extraire** : un LLM (Cerebras gpt-oss-120b par défaut, OpenAI GPT-5 mini ou xAI Grok en alternative) parse la transcription via **Structured Outputs / Zod schema** pour produire :
   - Identification du contact (avec désambiguïsation si plusieurs correspondances locales).
   - Coordonnées (téléphone, e-mail, anniversaire).
   - Genre détecté.
   - **Hot Topics** (projets/événements en cours, avec date si mentionnée).
   - Topics résolus (clôture des hot topics passés).
   - Contexte de rencontre.
   - Titre court et spécifique de la note (2–5 mots).
4. **Réviser & sauvegarder** : un écran de review permet à l'utilisateur de valider/éditer avant que la fiche ne soit créée ou mise à jour **dans la SQLite locale du téléphone**. Le résumé IA et les questions suggérées du contact sont régénérés.

### Le modèle de données local (SQLite, source de vérité)

Tables principales (voir `frontend/lib/db.ts`) :

- `contacts` — fiches personnes (nom, surnom, genre, téléphone, e-mail, anniversaire, type de relation, photo/avatar, résumé IA, questions suggérées, contexte de rencontre, fréquence de relance).
- `notes` — note vocale ou texte (titre, transcription, audio_uri, durée). C'est la source de vérité d'où l'IA reconstruit tout le reste.
- `hot_topics` — projets/événements à suivre (statut actif/résolu, date, contexte, résolution). Fusion de "events" + "hot topics" depuis V2.
- `groups` + `contact_groups` — étiquetage many-to-many des contacts.
- `migration_markers` — gestion idempotente des migrations SQL.

Le backend possède aussi un schéma Prisma (PostgreSQL Neon) qui ne stocke que **l'authentification, les sessions, les quotas mensuels et un audit log** — **jamais le contenu utilisateur**.

---

## 4. Architecture & Tech Stack

### 4.1 Monorepo

```
recall-people-2026/
├── frontend/         # App mobile Expo / React Native (iOS + Android + Web statique)
├── backend/          # API stateless Hono déployée sur Cloudflare Workers
├── landing-page/     # Site marketing Next.js 15 (App Router) déployé sur Vercel
├── screenshot-designer/  # HTML pour générer les screenshots stores
├── screenshots/      # Screenshots App Store / Play Store
├── docs/
│   ├── marketing/    # ASO iOS/Google FR+EN, launch playbook
│   └── plans/        # Specs design + implementation par feature (~25 docs)
├── CLAUDE.md / AGENTS.md / FONCTIONNALITES.md
└── app-tour.webm     # Démo vidéo intégrée dans la landing page
```

### 4.2 Frontend mobile — `frontend/`

| Domaine | Choix |
|---|---|
| Framework | **Expo SDK 54** + **React Native 0.81** + **React 19** + **expo-router 6** (file-based routing, typed routes, React Compiler activé) |
| Langage | **TypeScript strict** (pas de `any`, pas de `as any`, pas de `ts-ignore`) |
| Styling | **`StyleSheet.create` + thème centralisé** dans `@/constants/theme.ts` (Colors, Spacing, BorderRadius, Typography). NativeWind/Tailwind interdits par convention projet. |
| State global | **Zustand** (stores `app-store`, `auth-store`, `contacts-store`, `groups-store`, `question-history-store`, `settings-store`, `subscription-store`) |
| Data fetching | **TanStack Query** (hooks `useContacts`, `useContactsQuery`, `useGroupsQuery`, `useSemanticSearch`, etc.) |
| Stockage local | **expo-sqlite** (mode WAL, foreign keys ON), `expo-secure-store`, `AsyncStorage` |
| Audio | **expo-audio** + `expo-av` pour record/play |
| Auth | Better Auth (intégration Expo) + Google Sign-In + Apple Authentication |
| Notifications | **expo-notifications** (push pour rappels d'événements + anniversaires) |
| i18n | **i18next + react-i18next** + `expo-localization` — 5 langues (FR/EN/ES/IT/DE) |
| Paywall / IAP | **react-native-purchases** (RevenueCat) |
| Navigation | `@react-navigation/bottom-tabs`, expo-router stacks |
| UI add-ons | `@gorhom/bottom-sheet`, `react-native-reanimated 4`, `lucide-react-native`, `sonner-native`, `react-native-toast-message`, `react-native-svg`, `d3-force` (graphe relationnel) |
| Tests E2E | **Maestro** (`maestro/flows/*.yaml`, mode E2E activé via `EXPO_PUBLIC_E2E_TEST=true`, base SQLite reset à chaque lancement) |
| Build | **EAS Build** (`eas.json`, `build-android-local.sh`) + **EAS Update** (OTA, `runtimeVersion`) |
| Bundle IDs | iOS `com.monkeycs60.recallpeople2026`, Android `com.monkeycs60.recallpeople2026` |

#### Structure du frontend

- `app/` — routes expo-router : `(auth)/`, `(tabs)/`, `contact/[id].tsx`, `record.tsx`, `review.tsx`, `ask.tsx`, `ask-result.tsx`, `disambiguation.tsx`, `select-contact.tsx`, `admin/{monitoring,seed}.tsx`
- `components/` — composants découpés par feature : `contact/`, `profile/`, `review/`, `search/`, `upcoming/`, `ui/`, `skeleton/`, `Onboarding.tsx`, `Paywall.tsx`, `RecordButton.tsx`, `TranscriptionLoader.tsx`, `AIConsentModal.tsx`…
- `services/` — couche d'accès données SQLite + API : `contact`, `note`, `hot-topic`, `fact`, `group`, `import`, `memory`, `notification`, `reminder`, `revenuecat`, `search`, `similarity`
- `hooks/` — `useAuth`, `useGoogleAuth`, `useAppleAuth`, `useRecording`, `useContacts`, `useNotes`, `useNetworkGraph`, `useNetworkStatus`, `useSemanticSearch`…
- `lib/` — `db.ts` (SQLite + migrations idempotentes), `api.ts`, `auth.ts`, `i18n.ts`, `query-keys.ts`, `notification-routing.ts`, `notification-schedule.ts`, `reminder-frequency.ts`, `error-handler.ts`, `e2e-seed.ts`
- `locales/` — 5 fichiers JSON (fr/en/es/it/de)
- `stores/` — Zustand stores
- `types/`, `utils/`, `constants/`, `assets/`, `android/`, `ios/`, `maestro/`, `scripts/`

### 4.3 Backend — `backend/`

API stateless minimaliste. **Ne stocke jamais le contenu utilisateur**.

| Domaine | Choix |
|---|---|
| Framework | **Hono 4** |
| Runtime | **Cloudflare Workers** (`wrangler`) |
| DB d'authentification | PostgreSQL **Neon** (serverless) via **Prisma** + `@prisma/adapter-neon` |
| KV | Cloudflare KV (rate limiting) |
| Object Storage | Cloudflare **R2** (`AVATARS_BUCKET`) pour stocker les avatars IA |
| Auth | JWT (`jose`) + bcryptjs + Better Auth tables (User, Session, Account, Verification, RefreshToken) |
| Rate limiting | Middleware custom (`/api/*` global + `/api/extract`, `/api/search`, `/api/ask` plus stricts) |
| Sécurité | `securityHeaders`, `httpsEnforcement`, audit logs, validation Zod, sanitization des prompts (`wrapUserInput`, `getSecurityInstructions`) |
| Observabilité | **LangFuse** (traces LLM, coûts, latence, qualité) + OpenTelemetry SDK + `performance-logger` |
| Évaluation | `evaluators.ts` — évaluation des extractions sur un % d'échantillonnage |
| E-mail (reset password) | **AWS SES** |

#### Endpoints exposés (`backend/src/routes/`)

- **Auth** : `auth/register`, `auth/login`, `auth/me`, `auth/refresh`, `auth/password-reset`
- **AI pipeline** : `POST /api/transcribe`, `POST /api/extract`, `POST /api/detect-contact`, `POST /api/similarity`, `POST /api/summary`, `POST /api/suggested-questions`
- **Recherche & assistant** : `POST /api/search`, `POST /api/ask` (recherche sémantique en langage naturel)
- **Avatar IA** : `POST /api/avatar` (génération via OpenAI GPT Image 2 1024×1024 quality `low`, upload R2)
- **Subscription / quotas** : `POST /api/subscription` (sync RevenueCat + whitelist Pro `PRO_WHITELIST`)
- **Settings & seed** : `/api/settings`, `/api/seed`, `/admin/*`

#### Fournisseurs IA branchés

| Tâche | Provider par défaut | Modèle | Pourquoi |
|---|---|---|---|
| Transcription audio | **Groq** | **Whisper v3 Turbo** | 8× plus rapide que Whisper v3, gratuit jusqu'à 10M req/jour, bon en FR |
| Extraction structurée (note → entités) | **Cerebras** | `gpt-oss-120b` | Latence très faible, coût bas |
| Extraction (option premium) | **OpenAI** | **GPT-5 mini + Structured Outputs** | Conformité 100 % au schéma Zod, déterministe à `temperature: 0` |
| Détection / désambiguïsation contact | Cerebras | `llama-3.1-8b` | Modèle léger, réponse en quelques ms |
| Résumé IA & questions suggérées | Cerebras `gpt-oss-120b` (ou OpenAI) | — | Génération à chaque nouvelle note |
| Recherche sémantique / Assistant | Cerebras `gpt-oss-120b` | — | Réponse en langage naturel sur plusieurs notes/contacts |
| Génération d'avatar | **OpenAI GPT Image 2** | 1024×1024, quality `low` | Cohérence design system, coût maîtrisé |
| Fallback texte | xAI **Grok-4-1-fast** | — | Disponible derrière `AI_PROVIDER=grok` |

> Le choix de provider est piloté par les variables `STT_PROVIDER` et `AI_PROVIDER`. Les modèles ne doivent **jamais** être changés sans validation (cf. règle frontend `CLAUDE.md`).

### 4.4 Landing page — `landing-page/`

| Domaine | Choix |
|---|---|
| Framework | **Next.js 15** (App Router) — `landing-page/src/app/page.tsx` |
| Animations | `framer-motion` |
| Icônes | `lucide-react` |
| Vidéo | `app-tour.webm` jouée dans un `<PhoneMockup>` |
| Sections | Hero · VisualProof · Features · Privacy · Pricing · FAQ · Footer (+ pages `/privacy`, `/terms`, `/reset-password`) |
| SEO | `robots.ts`, `sitemap.ts`, FAQ riche en mots-clés (GEO) |
| Déploiement | **Vercel** (le backend reste sur Cloudflare Workers — règle CLAUDE.md : *"Ne deploy pas le backend sur cloudflare à moins que je te le demande, tu as le droit de deploy sur vercel."*) |

### 4.5 Outils & infrastructure

- **CI/CD mobile** : EAS Build + EAS Update (canal `production`, projet `005eaea1-…`).
- **Distribution** : App Store + Google Play (badges déjà intégrés à la landing).
- **Auth providers** : Google (Web/iOS/Android Client IDs), Apple Sign-In.
- **Paiements** : RevenueCat (via `react-native-purchases`).
- **Observabilité LLM** : LangFuse (free tier : 50k observations/mois).
- **Tests** : Node `--test` (backend & frontend unit), Maestro (E2E mobile).
- **OpenSpec** : workflow de spec/proposal géré via `@/openspec/AGENTS.md`.

---

## 5. Liste exhaustive des fonctionnalités

### 5.1 Notes vocales intelligentes
- Enregistrement audio (1 min gratuit, 3 min Pro), mode texte alternatif, mode E2E pour les tests.
- Transcription multi-langue (Whisper v3 Turbo).
- Loader stylisé pendant la transcription, toasts d'erreur sur quota dépassé / réseau.
- Anti-friction : reset automatique du recording si on quitte la page.
- Extraction automatique : contact, coordonnées, anniversaire, genre, hot topics, topics résolus, contexte de rencontre, titre court (2–5 mots).

### 5.2 Profils contacts enrichis
- Création / mise à jour automatique à partir des notes.
- Désambiguïsation IA quand plusieurs contacts existants matchent.
- Champs structurés : prénom, nom, surnom, genre, téléphone, e-mail, anniversaire (jour/mois/année optionnelle), type de relation.
- **Section "L'essentiel"** : résumé IA régénéré après chaque note, régénérable à la demande.
- **Hot Topics** : projets/événements actifs avec date optionnelle, statut actif/résolu, résolution avec description, rappel programmé.
- **Questions suggérées** : ice-breakers générés par IA, basés sur les actualités du contact, régénérables.
- Timeline des notes avec audio rejouable + édition de la transcription.
- Avatar : import galerie, génération IA depuis prompt (OpenAI GPT Image 2), édition.
- Modales d'édition : nom, e-mail, téléphone, anniversaire, genre, contexte de rencontre, avatar.

### 5.3 Recherche sémantique IA / Assistant
- Recherche en langage naturel sur l'ensemble notes + contacts.
- Suggestions de questions types ("Qui aime le sport ?", "Qui travaille dans la tech ?", "C'est quand l'anniversaire de Lucas ?").
- Historique des questions + résultats (`question-history-store`).
- Réponse synthétisée + liste des contacts pertinents.

### 5.4 Fil d'actualités / À venir (`/upcoming`)
- Timeline chronologique des hot topics datés + anniversaires.
- Filtres "À venir" / "Passés", filtrage par jour.
- Notifications push programmées (la veille des événements).
- Suppression d'événements par swipe (`SwipeableEventCard`).
- Accès direct à la fiche contact.

### 5.5 Groupes
- Création de groupes personnalisés, gestion globale.
- Affectation multi-groupes par contact.
- Filtrage rapide via chips sur la liste contacts.

### 5.6 Privacy / Local-first
- Données 100 % en SQLite locale (mode WAL, FK ON), backend stateless.
- **Export JSON / CSV** depuis le profil.
- **Suppression complète** des données locales possible.
- Fonctionnement offline complet pour la consultation ; seules transcription / extraction / assistant nécessitent Internet.
- Modal de consentement IA (`AIConsentModal.tsx`) à la première utilisation.

### 5.7 Multi-langue
- 5 langues UI + transcription : **FR / EN / ES / IT / DE**.
- Détection auto de la langue du téléphone, switch manuel via `LanguagePicker`.
- Toutes les chaînes Zod / API sont traduites (règle stricte du projet).

### 5.8 Avatar IA
- Génération à partir de description physique (genre, ethnicité, âge approximatif).
- Style illustré cohérent avec le design system.
- Quota : 5 gratuits, illimité Pro.

### 5.9 Onboarding & Paywall
- Onboarding multi-étapes (`Onboarding.tsx`) qui mène ensuite à la page de recording.
- Paywall RevenueCat (`Paywall.tsx`).
- Bouton "Test Pro" dev/QA + whitelist e-mail Pro côté backend (`PRO_WHITELIST`).
- Persistance du flag Pro côté dev (basé sur `__DEV__`).

### 5.10 Notifications & rappels
- Notifications événements (date `event_date` des hot topics).
- Notifications anniversaires.
- **Smart reminders Pro** : nudge quand on n'a pas relancé un contact depuis X jours, fréquence custom par contact, post-event follow-up, **digest hebdomadaire**.

### 5.11 Sécurité & comptes
- Inscription / login e-mail + Google Sign-In + Apple Sign-In.
- JWT + refresh tokens stockés en SecureStore.
- Reset mot de passe par e-mail (AWS SES).
- Audit logs côté backend.

### 5.12 Admin & monitoring
- Routes `/admin/seed` et `/admin/monitoring` réservées (e-mail admin).
- Seed local pour démos, dashboard léger.
- LangFuse pour observabilité LLM.

---

## 6. Modèle économique (Freemium)

> Source de vérité : `landing-page/src/components/Pricing.tsx` (la doc legacy `FONCTIONNALITES.md` peut être en retard).

| | **Free** | **Pro** |
|---|---|---|
| Prix | 0 $ | **3,99 $/mois** ou **39,99 $/an** (~17 % d'économie) |
| Contacts | 15 | **Illimité** |
| Notes vocales | Illimité | Illimité |
| Durée d'enregistrement | 1 minute | **3 minutes** |
| Avatars IA | Illimité (visiblement remonté en Pro free récemment) | Illimité |
| Assistant IA (questions) | 10 / mois | **Illimité** |
| Rappels événements & anniversaires | Oui | Oui |
| Smart reminders + weekly digest | — | **Oui** |
| Export des données | Oui | Oui |
| Essai gratuit | — | **14 jours** d'accès complet |

> Note : le repo contient des artefacts indiquant des prix antérieurs (6,99 €/mois et 59,99 €/an dans `frontend/TODO.md`). Le **prix actuel public** est celui de la landing : 3,99 $/mois, 39,99 $/an. À harmoniser dans toute la copy app.

Quotas additionnels suivis côté backend (`User.avatarMonthlyUsed`, `User.askMonthlyUsed`, `UserNotesUsage`).

---

## 7. Public cible (ICP)

- **Networkers & professionnels** qui rencontrent beaucoup de monde (events, conférences, sales légers, recruteurs, fondateurs, investisseurs).
- **Personnes attentionnées** qui veulent se rappeler des prénoms d'enfants, projets, voyages, étapes de vie de leurs proches.
- **Indie hackers / freelances** qui gèrent un réseau dispersé sans CRM lourd.
- **Étudiants & jeunes diplômés** en début de carrière qui construisent leur réseau.

Personae secondaires : journalistes, mentors, RH, coachs sportifs, profs particuliers — tout métier où "se souvenir des gens" est un avantage compétitif.

---

## 8. Pitch marketing

### Hook principal
> **"You forget 80% of every conversation."**
> Become the person who never forgets a detail. The privacy-first personal CRM that turns your voice notes into real connections.

### Promesse en 3 points
1. **Talk. That's it.** — Une note vocale après chaque rencontre. L'IA extrait noms, faits, dates, événements.
2. **Never miss what matters.** — Anniversaires, entretiens, marathons, déménagements : Recall te ping la veille.
3. **Your data stays yours.** — Stockage SQLite local, pas de cloud contacts, pas de profilage publicitaire, pas de data mining.

### Positionnement vs concurrents
- ≠ Salesforce/HubSpot : **CRM personnel** (relations, pas pipelines), **voice-first** (pas de saisie manuelle), **privacy-local** (pas de cloud).
- ≠ Notion / Apple Notes : **structuration automatique** par IA (entités, hot topics, dates), **rappels intelligents**, **recherche sémantique**.
- ≠ Apps "second brain" : **focalisé sur les personnes** et la mémoire sociale, pas sur la connaissance générale.

### Tagline alternatives (déjà testées dans la copy)
- *"Your social memory, upgraded."*
- *"Stop forgetting. Start connecting."*
- *"Small details make big differences."*
- *"Meet Recall — the app that listens so you don't have to remember."*

### Canaux de lancement (cf. `docs/marketing/launch-playbook.md`)
- **TikTok / Reels** (15-30s, sous-titres, hook problème en 3s) — angle "the problem", "the builder", "the solution".
- **Reddit** (r/SideProject, r/productivity, r/networking).
- **Twitter/X** thread + **LinkedIn** FR+EN.
- **Product Hunt** (semaine 2 du lancement, mardi 00:01 PST).
- **Hacker News** (Show HN, semaine 3).
- **GEO / SEO** : blog optimisé pour requêtes type "best app to remember people you meet", "personal CRM voice notes" — prépondérance de la FAQ riche en mots-clés.
- **ASO** : fiches App Store + Google Play traduites FR/EN dans `docs/marketing/aso-*`.

---

## 9. Roadmap & travaux en cours (visibles dans le repo)

Tirés de `frontend/TODO.md`, `docs/plans/` et des migrations SQLite :

- ✅ Refactor V2 : suppression des tables `facts`, `memories`, fusion `events` → `hot_topics`.
- ✅ Migration backend par défaut vers Cerebras `gpt-oss-120b`, garde-fou OpenAI Structured Outputs en option.
- ✅ Avatar IA via OpenAI GPT Image 2 + R2.
- ✅ Whitelist Pro côté backend pour bêta-testeurs.
- 🟡 Harmoniser les prix Free/Pro dans toute la copy in-app (legacy 6,99 €/59,99 € → public 3,99 $/39,99 $).
- 🟡 Refonte UI suggestions de questions sur la page Assistant (bulles + icône recherche).
- 🟡 Suppression d'événements par swipe sur l'onglet "À venir" (déjà partiellement implémentée).
- 🟡 Persistance du flag Pro en dev (basée sur `__DEV__`).
- 🟡 Direction artistique : voir `docs/plans/2026-01-22-pop-art-direction-design.md`, `2026-01-23-pop-friendly-redesign.md`, `2026-01-24-violet-moderne-redesign.md`.
- 🔵 Sync cloud optionnelle (mentionnée en FAQ : *"Cloud sync coming soon"*).

---

## 10. Conventions internes (extrait CLAUDE.md / AGENTS.md)

- **Nom de l'app** : toujours "Recall People" (jamais juste "Recall" en user-facing). Identifiants `recall-people` / `recallPeople` OK en code.
- **Privacy-first** : toute nouvelle donnée user-facing va dans la **SQLite locale**, jamais en base backend.
- **Backend stateless** : il *traite* (transcribe / extract / AI) mais ne *persiste* pas le contenu utilisateur.
- **Frontend strict** : pas de NativeWind/Tailwind, pas de SafeAreaView, pas de useEffect, pas de `any`, pas d'OOP, max 5 props, services dans `@/services/`.
- **i18n strict** : toute string ajoutée doit être traduite dans les 5 langues.
- **Modèles LLM gelés** : ne jamais changer un nom de modèle sans validation explicite.
- **Déploiement** : backend reste sur Cloudflare ; landing va sur Vercel.

---

## 11. Liens & ressources

- App Store / Google Play (à compléter au lancement).
- Landing : déployée via Vercel (page d'accueil monolithique — `landing-page/src/app/page.tsx`).
- Backend Cloudflare Workers : `recall-people-api` (URL `production`).
- Observabilité : https://cloud.langfuse.com.
- Repo : `monkeycs60/recall-people-2026` (branche dev courante : `claude/add-project-documentation-9ZSbp`).

---

## 12. Éléments à confirmer / suggestions d'ajout

Questions ouvertes que je propose d'arbitrer pour rendre ce doc encore plus solide :

1. **Vision long terme** — sync cloud chiffré E2E ? mode "shared memory" entre conjoints / co-fondateurs ? intégration calendrier / LinkedIn ?
2. **Métriques produit** — DAU/WAU cibles, taux de conversion Free → Pro visé, churn cible.
3. **Conformité légale** — RGPD : politique de rétention côté providers IA (Groq/Cerebras/OpenAI), DPA signés, mentions à ajouter dans `/privacy` ?
4. **Positionnement de marque** — *Personal CRM*, *Social Memory*, *Relationship OS* : laquelle on priorise sur les stores et la presse ?
5. **Pricing officiel** — confirme-moi les prix actuels (3,99 $/39,99 $ landing vs 6,99 €/59,99 € TODO) que je puisse propager partout.
6. **Métriques de succès au lancement** — Product Hunt top 5 ? 1k installs J7 ? 10k installs M1 ?
7. **Ajout d'un schéma d'architecture** — je peux générer un diagramme (Frontend SQLite ↔ Backend Hono ↔ Providers IA) si utile.
8. **Section "Comparatif concurrents"** détaillée (Dex, Clay, Monaru, UpHabit) — utile pour pitch deck investisseurs.
9. **Section "Sécurité & menaces couvertes"** — sanitization de prompts, rate limiting, JWT, audit logs : à étoffer si on vise un public B2B.
10. **Inclusion d'un CHANGELOG** ou d'un historique des releases EAS.

Dis-moi ce que tu veux ajouter / modifier / supprimer et je reprends ce document en conséquence.
