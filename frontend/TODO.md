# Recall - TODO

## P0 - Sécurité & Déploiement Backend

### Secrets Cloudflare (à configurer une seule fois)

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put DEEPGRAM_API_KEY
npx wrangler secret put XAI_API_KEY
npx wrangler secret put GOOGLE_CLIENT_ID_WEB
npx wrangler secret put GOOGLE_CLIENT_ID_IOS
npx wrangler secret put GOOGLE_CLIENT_ID_ANDROID
npx wrangler secret put ADMIN_EMAIL
```

### Variables d'environnement frontend (à configurer)

---

## P0 - Avant Launch

### Copywriting & Onboarding

-  [ ] Nouvelle tagline : "Parlez. Recall se souvient." ==> corriger wording horrible et pas engageant
-  [ ] Empty states : copy émotionnel pour liste contacts vide + pas de news ==> ajouter des illustrations
-  [ ] Vocabulaire UI : remplacer termes techniques par langage relationnel

### Features Core

-  [ ] RevenueCat paywall (freemium: gratuit sans IA, premium avec IA/transcription/rappels)

---

## P1 - Post-Launch Prioritaire

### Visuel

-  [ ] Icônes contextuelles Memories (trophy, baby, airplane, briefcase, heart selon type)

### Features

-  [ ] Quick actions fiche contact : boutons appeler / SMS / WhatsApp
-  [ ] **Système de notifications intelligentes** (voir NOTIFICATION_SYSTEM_SPEC.md)
   -  [ ] Contact Reminders : rappels personnalisés selon type de relation
   -  [ ] Anniversaires : notifications J-7, J-1, Jour J
   -  [ ] Google Calendar sync : rdv à venir avec contexte IA
   -  [ ] Hot Topics en attente : rappels sujets non résolus
   -  [ ] Ice Breakers proactifs : suggestions IA de conversation
   -  [ ] Écran Settings > Notifications (fréquences, DND)
   -  [ ] Paramètres custom par contact
-  [ ] Recherche IA : placeholders inspirants + meilleure explication du concept

### Infra

-  [ ] Analytics
-  [ ] **Monitoring & Audit Logging** (voir MONITORING.md)
   -  [x] API Admin avec endpoints de monitoring
   -  [ ] Dashboard admin (React/Next.js) pour visualiser les métriques
   -  [ ] Grafana + PostgreSQL pour graphiques temps réel
   -  [ ] Alertes automatiques (Cloudflare Workers Cron + Slack/Discord)
   -  [ ] Sentry pour error tracking
   -  [ ] Définir les métriques clés à suivre quotidiennement
-  [ ] Landing page Astro
-  [ ] Cache navigation fiche contact (back → liste sans reload)
-  [ ] Traduction infos extraites dans la langue choisie

---

## P2 - Améliorations

### Visuel

-  [ ] Contraste : cards blanches sur background beige
-  [ ] Couleur secondaire (vert sauge ou bleu) pour éléments non-CTA
-  [ ] Visuels pour stores (App Store / Play Store)
-  [ ] Illustration empty state recherche IA

### UX

-  [ ] Tabs fiche contact : Overview | News | Profile | Memories | Notes
-  [ ] Import contacts natifs (iPhone/Android) post-onboarding
-  [ ] Fichiers de traduction autres langues (hors en/fr)

---

## P3 - Future

-  [ ] Widget iOS/Android quick add
-  [ ] Photos contacts et memories
-  [x] ~~Google Calendar : événements futurs dans hot topics~~ (intégré dans système de notifications)
-  [ ] Voice search dans recherche IA
-  [ ] Demo mode / fake data pour nouveaux users
-  [ ] Analytics notifications (open rate, action rate, conversion rate)
-  [ ] Background tasks (expo-background-fetch) pour refresh auto des reminders
-  [ ] Proposition post-meeting d'ajouter une note
