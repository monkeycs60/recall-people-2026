# Recall - TODO

## P0 - Avant Launch

### Copywriting & Onboarding
- [ ] Nouvelle tagline : "Parlez. Recall se souvient."
- [ ] Refonte textes onboarding (4 écrans avec storytelling émotionnel)
- [ ] Illustrations guided tour (4 images, voir prompts dans IMPROVEMENT_ROADMAP.md)
- [ ] Empty states : copy émotionnel pour liste contacts vide + pas de news
- [ ] Vocabulaire UI : remplacer termes techniques par langage relationnel

### Features Core
- [ ] Ice Breakers : section "Une idée pour relancer la conversation ?" dans fiche contact (généré avec résumé IA)
- [ ] RevenueCat paywall (freemium: gratuit sans IA, premium avec IA/transcription/rappels)

### UX Fixes
- [ ] Résumé IA : header contextuel ("Voici ce que tu devrais avoir en tête avant de revoir [Prénom]")
- [ ] Résumé IA : ton plus sobre, meilleure hiérarchisation, retirer le nombre de caractères


- Possibilité de supprimer un contact
- Ajout du téléphone, mail, sur la fiche d'un contact (champs spéciaux, pas dans infos, mais carrément dans le header : lien pour whats app ou répertoire)

---

## P1 - Post-Launch Prioritaire

### Visuel
- [ ] Icônes contextuelles Memories (trophy, baby, airplane, briefcase, heart selon type)
- [ ] Icônes menu Profile en terracotta (pas gris)

### Features
- [ ] Quick actions fiche contact : boutons appeler / SMS / WhatsApp
- [ ] **Système de notifications intelligentes** (voir NOTIFICATION_SYSTEM_SPEC.md)
  - [ ] Contact Reminders : rappels personnalisés selon type de relation
  - [ ] Anniversaires : notifications J-7, J-1, Jour J
  - [ ] Google Calendar sync : rdv à venir avec contexte IA
  - [ ] Hot Topics en attente : rappels sujets non résolus
  - [ ] Ice Breakers proactifs : suggestions IA de conversation
  - [ ] Écran Settings > Notifications (fréquences, DND)
  - [ ] Paramètres custom par contact
- [ ] Recherche IA : placeholders inspirants + meilleure explication du concept

### Infra
- [ ] Analytics
- [ ] Landing page Astro
- [ ] Cache navigation fiche contact (back → liste sans reload)
- [ ] Traduction infos extraites dans la langue choisie

---

## P2 - Améliorations

### Visuel
- [ ] Contraste : cards blanches sur background beige
- [ ] Couleur secondaire (vert sauge ou bleu) pour éléments non-CTA
- [ ] Visuels pour stores (App Store / Play Store)
- [ ] Illustration empty state recherche IA

### UX
- [ ] Tabs fiche contact : Overview | News | Profile | Memories | Notes
- [ ] Import contacts natifs (iPhone/Android) post-onboarding
- [ ] Fichiers de traduction autres langues (hors en/fr)

---

## P3 - Future

- [ ] Widget iOS/Android quick add
- [ ] Photos contacts et memories
- [x] ~~Google Calendar : événements futurs dans hot topics~~ (intégré dans système de notifications)
- [ ] Voice search dans recherche IA
- [ ] Demo mode / fake data pour nouveaux users
- [ ] Analytics notifications (open rate, action rate, conversion rate)
- [ ] Background tasks (expo-background-fetch) pour refresh auto des reminders
- [ ] Proposition post-meeting d'ajouter une note
