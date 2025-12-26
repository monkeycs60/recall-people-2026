# Recall People - État de Progression de l'App

**Dernière mise à jour :** 26 décembre 2025

---

## 📊 Vue d'Ensemble

Recall People est une application mobile de Personal CRM dopée à l'IA qui permet de :
- Capturer des notes vocales sur ses contacts
- Extraire automatiquement des informations via IA (Claude)
- Organiser et retrouver facilement toutes les infos sur ses relations

**Statut général :** 🟢 **MVP fonctionnel** + Redesign UI en cours + Système de notifications conçu

---

## ✅ Fonctionnalités Implémentées

### Core Features (MVP)
- ✅ **Authentification** : Email/Password avec Better Auth
- ✅ **Enregistrement vocal** : Capture audio avec expo-av
- ✅ **Transcription** : Deepgram API (Nova-3)
- ✅ **Extraction IA** : Claude API pour extraire facts, hot topics, memories
- ✅ **Gestion contacts** : CRUD complet (SQLite local)
- ✅ **Notes & Timeline** : Historique des interactions par contact
- ✅ **Hot Topics** : Sujets actifs avec résolution
- ✅ **Memories** : Souvenirs partagés et événements
- ✅ **Groupes** : Organisation par groupes (famille, amis, pro, etc.)
- ✅ **Recherche sémantique** : Recherche IA dans tous les contenus
- ✅ **Résumé IA** : Génération automatique de résumé par contact
- ✅ **i18n** : Support français et anglais

### UX/UI
- ✅ **Design System** : Palette terracotta/beige chaleureuse
- ✅ **Nouveau Login** : Hero section avec branding
- ✅ **Liste Contacts** : Cards enrichies avec facts + hot topics
- ✅ **Fiche Contact** : Hero section + sections animées
- ✅ **Écran Record** : Interface zen minimaliste
- ✅ **FAB Navigation** : Floating Action Button central pour enregistrement
- ✅ **Animations** : Reanimated (FadeIn, FadeInDown, etc.)
- ✅ **Fonts custom** : Playfair Display pour les titres

### Technique
- ✅ **SQLite** : Base de données locale (expo-sqlite)
- ✅ **Backend Hono** : API sur Cloudflare Workers
- ✅ **Offline-first** : Lecture offline, sync API pour nouvelles notes
- ✅ **Error handling** : Gestion erreurs réseau + offline banner
- ✅ **State management** : Zustand stores
- ✅ **Type safety** : TypeScript strict

---

## 🚧 En Cours de Développement

### Redesign UI (80% complété)
- ✅ Design system + palette
- ✅ Login, Contacts, Contact Detail, Record
- ⏳ Register, Search, Profile
- ⏳ Composants enfants (ProfileCard, HotTopicsList, AISummary, etc.)

### Système de Notifications Intelligentes (Conçu, à implémenter)
Voir `NOTIFICATION_SYSTEM_SPEC.md` pour détails complets.

**Types de notifications :**
- 🔔 **Contact Reminders** : "Ça fait 3 semaines que tu n'as pas parlé à Marie..."
- 🎂 **Anniversaires** : Notifications J-7, J-1, Jour J + gift ideas
- 📅 **Google Calendar** : Sync rdv + notifications 2h avant avec résumé IA
- 🔥 **Hot Topics** : Rappels pour sujets non résolus depuis 14j
- 💡 **Ice Breakers** : Suggestions IA de conversation

**Architecture :**
- Nouvelles tables SQLite
- Services dédiés (notification, calendar, reminder-scheduler)
- Background tasks (expo-background-fetch)
- Google OAuth pour Calendar

---

## 📋 TODO par Priorité

### P0 - Avant Launch

**Copywriting & Onboarding**
- [ ] Nouvelle tagline : "Parlez. Recall se souvient."
- [ ] Refonte textes onboarding (4 écrans storytelling)
- [ ] Illustrations guided tour
- [ ] Empty states avec copy émotionnel
- [ ] Vocabulaire UI relationnel

**Features Core**
- [ ] Ice Breakers dans fiche contact
- [ ] RevenueCat paywall (freemium)

**UX Fixes**
- [ ] Spacing login/signup
- [ ] Résumé IA : header contextuel + ton sobre

### P1 - Post-Launch Prioritaire

**Visuel**
- [ ] Illustration écran login
- [ ] Icônes contextuelles Memories
- [ ] Icônes menu Profile en terracotta

**Features**
- [ ] Quick actions fiche contact (appeler/SMS/WhatsApp)
- [ ] **Système de notifications complet**
  - [ ] Contact Reminders (MVP)
  - [ ] Anniversaires
  - [ ] Google Calendar sync
  - [ ] Hot Topics reminders
  - [ ] Ice Breakers proactifs
  - [ ] Settings > Notifications
- [ ] Recherche IA : placeholders + explication

**Infra**
- [ ] Analytics
- [ ] Landing page Astro
- [ ] Cache navigation
- [ ] Traduction infos extraites

### P2 - Améliorations

**Visuel**
- [ ] Contraste cards blanches/beige
- [ ] Couleur secondaire (vert sauge)
- [ ] Visuels stores (App/Play Store)

**UX**
- [ ] Tabs fiche contact
- [ ] Import contacts natifs
- [ ] Autres langues (hors en/fr)

### P3 - Future

- [ ] Widget iOS/Android quick add
- [ ] Photos contacts/memories
- [ ] Voice search
- [ ] Demo mode
- [ ] Analytics notifications
- [ ] Background tasks auto
- [ ] Post-meeting note prompt

---

## 🏗️ Architecture Actuelle

### Mobile (Expo)
```
/frontend
├── app/              # Expo Router pages
│   ├── (auth)/       # Login, Register
│   ├── (tabs)/       # Contacts, Search, Profile
│   ├── contact/[id]  # Fiche contact
│   ├── record.tsx    # Enregistrement
│   └── review.tsx    # Review extractions
├── components/       # UI components
├── services/         # Business logic
├── stores/           # Zustand state
├── lib/              # Utils (db, api, auth)
└── types/            # TypeScript types
```

**Stack :**
- Expo Router (navigation)
- SQLite (base locale)
- NativeWind (Tailwind CSS)
- Reanimated (animations)
- expo-av (audio)
- Better Auth client

### Backend (Hono)
```
/backend (Cloudflare Workers)
├── routes/
│   ├── auth.ts       # Better Auth
│   ├── transcribe.ts # Deepgram proxy
│   └── extract.ts    # Claude proxy
├── lib/
│   ├── auth.ts
│   ├── db.ts         # Prisma + Neon
│   └── ...
└── prisma/
    └── schema.prisma
```

**Stack :**
- Hono (framework edge)
- Cloudflare Workers (hosting)
- Neon (Postgres serverless)
- Prisma 7 (ORM)
- Better Auth (auth)
- Deepgram (transcription)
- Claude (extraction IA)

---

## 📂 Documents Importants

| Document | Description |
|----------|-------------|
| `MISSION.md` | Mission et vision de l'app |
| `RECALL_PEOPLE_SPEC.md` | Spécifications techniques complètes |
| `IMPROVEMENT_ROADMAP.md` | Roadmap UX/UI/Business |
| `NOTIFICATION_SYSTEM_SPEC.md` | ⭐ Nouveau : Système de notifications intelligent |
| `frontend/TODO.md` | TODO list détaillée |
| `frontend/docs/UI-REDESIGN-STATUS.md` | État du redesign UI |

---

## 🎨 Design System

### Palette de Couleurs
- **Background** : `#FAF7F2` (crème chaud)
- **Surface** : `#FFFFFF` (cards)
- **Primary** : `#C67C4E` (terracotta)
- **Text Primary** : `#1A1612` (brun foncé)
- **Text Secondary** : `#6B5E54`

### Typographie
- **Titres** : Playfair Display (700 Bold)
- **Corps** : System sans-serif (Regular)

### Philosophie
> "S'éloigner du langage productivité/bureau, se rapprocher du relationnel/émotionnel."

---

## 🚀 Prochaines Étapes Recommandées

### Court Terme (1-2 semaines)
1. **Terminer redesign UI**
   - Mettre à jour composants enfants (ProfileCard, HotTopicsList, AISummary)
   - Refondre Register, Search, Profile

2. **Commencer notifications (MVP)**
   - Créer tables SQLite
   - Implémenter Contact Reminders basiques
   - Écran Settings > Notifications

### Moyen Terme (1 mois)
3. **Copywriting & Onboarding**
   - Nouvelle tagline
   - Refonte textes onboarding
   - Illustrations guided tour

4. **Notifications avancées**
   - Anniversaires
   - Google Calendar sync
   - Hot Topics reminders

### Long Terme (2-3 mois)
5. **Business & Launch**
   - RevenueCat paywall
   - Analytics
   - Landing page
   - App Store + Play Store

6. **Polish & Optimisation**
   - Photos
   - Widget
   - Voice search
   - Background tasks

---

## 📈 Métriques Clés à Suivre (Post-Launch)

### Engagement
- DAU/MAU (Daily/Monthly Active Users)
- Taux de rétention J1, J7, J30
- Nombre de notes vocales/jour/utilisateur
- Nombre de contacts/utilisateur

### Notifications
- Open rate par type
- Action rate (ouverture contact, ajout note)
- Conversion rate (interaction réelle)
- Snooze vs Dismiss rate

### Business
- Taux de conversion freemium → premium
- Churn rate
- LTV (Lifetime Value)
- CAC (Customer Acquisition Cost)

---

## 🎯 Vision Long Terme

**Objectif :** Transformer Recall People en **coach social proactif** qui :

1. ✅ Capture et organise automatiquement les infos sur tes relations
2. 🚧 Te rappelle de maintenir le contact avec les bonnes personnes
3. 🚧 Te prépare aux rendez-vous avec contexte complet
4. 🚧 Te suggère des sujets de conversation
5. 🔮 (Future) Anticipe les besoins (anniversaires, cadeaux, événements)

**Slogan :** *"Parlez. Recall se souvient."*

---

## 💡 Notes & Réflexions

### Points Forts
- ✅ Architecture solide (local-first + cloud sync)
- ✅ IA de qualité (Claude pour extraction)
- ✅ UX émotionnelle et chaleureuse
- ✅ Copywriting relationnel (pas corporate)
- ✅ Système de notifications bien pensé

### Points d'Attention
- ⚠️ Modèle freemium à valider (price point, features split)
- ⚠️ Acquisition : nécessite stratégie claire (TikTok, Product Hunt, ASO)
- ⚠️ Privacy : rassurer sur confidentialité des données
- ⚠️ Performance : optimiser SQLite queries (indexation)
- ⚠️ Battery : gérer background tasks intelligemment

### Opportunités
- 💡 Intégration profonde avec calendrier/contacts natifs
- 💡 Widget iOS/Android pour quick add
- 💡 Extension web (Chrome) pour capture contexte LinkedIn/emails
- 💡 Export vers CRM pro (Salesforce, HubSpot) pour business users
- 💡 Mode "Coach" avec suggestions proactives quotidiennes

---

**Dernière mise à jour :** 26 décembre 2025
**Statut :** 🟢 MVP fonctionnel + Redesign UI 80% + Notifications conçues
**Prochaine milestone :** Lancement Beta (Q1 2026)
