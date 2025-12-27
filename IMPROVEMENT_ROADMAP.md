# Recall - Roadmap d'Améliorations

Analyse complète UI/UX, Business et Copywriting - Décembre 2025

---

## 1. Identité Visuelle

### Problèmes identifiés
- **Monotonie** : Beige sur beige, manque de contraste entre cards et background
- **Absence d'émotion visuelle** : Aucune illustration, app sur les relations humaines mais 0 élément humain
- **Saturation terracotta** : Orange utilisé partout (boutons, liens, tags, micro, icônes)

### Solutions

| Action | Détail |
|--------|--------|
| Contraste cards | Blanc pur pour les cards, beige en background (ou inverse) |
| Couleur secondaire | Vert sauge ou bleu sourd pour éléments secondaires, terracotta = CTA principal uniquement |
| Icônes Profile | Passer les icônes grises en terracotta ou gris foncé |

---

## 2. Illustrations à Ajouter

### Login
- **Emplacement** : Remplacer formes abstraites en haut
- **Prompt** : `Warm minimal illustration, two people having coffee together, one taking notes, soft beige and terracotta palette, white background, friendly and cozy atmosphere, flat design style, no faces detailed, abstract human figures`
- **Taille** : ~300x200px

### Guided Tour (6 écrans)

| Étape | Titre | Prompt illustration |
|-------|-------|---------------------|
| 1 | "Comment s'appelait sa fille, déjà ?" | `Minimal illustration, person with question marks floating around head, confused expression, warm beige terracotta palette, flat design` |
| 2 | "Parlez. Recall se souvient." | `Hand holding phone with sound waves coming out, warm colors, minimal flat illustration, beige orange palette` |
| 3 | "Soyez la personne qui n'oublie jamais." | `Minimal illustration of a contact card with rich details floating around it (hobbies, family, work icons), warm palette` |
| 4 | "Votre jardin secret est bien gardé." | `Shield with lock icon, surrounded by soft clouds, warm beige terracotta, trust and security feeling, minimal flat` |

### Empty States

| Écran | Prompt |
|-------|--------|
| Liste contacts vide | `Friendly illustration of open arms welcoming, warm circle of connection, beige terracotta minimal style` |
| Pas de News | `Gentle illustration of an empty notebook with a sparkle, waiting for stories, warm minimal palette` |

### Recherche IA
- **Emplacement** : Zone vide en bas de l'écran
- **Prompt** : `Minimal illustration, AI assistant as a friendly abstract shape helping organize floating contact cards, warm beige terracotta, soft and inviting`
- **Taille** : ~250x150px, opacity 50%

---

## 3. Icônes Contextuelles

### Section Memories (fiche contact)

| Type | Icône (Phosphor/Lucide) |
|------|------------------------|
| Événement sportif | `trophy` ou `ball` |
| Naissance | `baby` ou `star` |
| Voyage | `airplane` ou `map-pin` |
| Professionnel | `briefcase` |
| Relation | `heart` |

### Menu Profile

| Item | Icône | Couleur |
|------|-------|---------|
| Statistics | `chart-bar` | Terracotta |
| Export my data | `download-simple` | Terracotta |
| Clear cache | `trash` | Terracotta |
| Version | `info` | Terracotta |
| Redo guided tour | `arrow-counter-clockwise` | Terracotta |
| Give feedback | `chat-circle-text` | Terracotta |
| Legal notices | `file-text` | Terracotta |

---

## 4. Copywriting - Refonte Complète

### Philosophie
> S'éloigner du langage "productivité/bureau", se rapprocher du "relationnel/émotionnel".
> On ne gère pas des "contacts", on cultive des relations.

### Tagline
**Avant** : "N'oubliez jamais ce qui compte"
**Après** : "Parlez. Recall se souvient."

### Vocabulaire UI

| Ne dis pas | Dis plutôt |
|------------|------------|
| Générer un résumé | L'essentiel sur [Prénom] |
| Données extraites | Ce qu'il ne faut pas oublier |
| Ajouter un contact | Qui avez-vous vu ? |
| Recherche sémantique | Posez une question à votre mémoire |
| Add a note | Comment s'est passé votre moment avec [Prénom] ? |
| Search contacts | Qui cherchez-vous ? |

### Onboarding (4 écrans)

| # | Titre | Sous-titre |
|---|-------|------------|
| 1 | "Comment s'appelait sa fille, déjà ?" | On oublie 80% des détails après une discussion. Ne laissez plus la gêne s'installer. |
| 2 | "Parlez. Recall se souvient." | Juste après un café ou un appel, enregistrez un vocal. L'IA extrait automatiquement les pépites de la conversation. |
| 3 | "Soyez la personne qui n'oublie jamais." | Prénoms des proches, passions, projets en cours... Retrouvez tout en un coup d'œil avant votre prochaine rencontre. |
| 4 | "Votre jardin secret est bien gardé." | Vos souvenirs sont personnels. Recall crypte vos données pour que vous soyez le seul à y avoir accès. |

### Empty States

**Liste contacts vide :**
> "Votre cercle commence ici. Ajoutez une première personne qui compte pour vous et ne perdez plus jamais le fil de ses récits."

**Pas de News :**
> "[Prénom] n'a pas encore de nouvelles aventures. Enregistrez une note après votre prochain appel pour voir la magie opérer."

### Résumé IA - Header contextuel
Ajouter une phrase d'intro :
> "Voici ce que tu devrais avoir en tête avant de revoir [Prénom] :"

### Recherche IA - Placeholders inspirants
- "Qui travaille dans la tech à Bordeaux ?"
- "Qui a des enfants en bas âge ?"
- "À qui devrais-je envoyer un message aujourd'hui ?"

---

## 5. Nouvelles Features

### P0 - Ice Breakers (Coach social)
Section dans la fiche contact générée par l'IA.

**Header** : "Une idée pour relancer la conversation ?"
**Exemple** : "Demande-lui si ses plombages tiennent le coup ou comment se prépare son stage à Lacanau !"

Génération : au même moment que le résumé IA (régénéré à chaque nouvelle note)

### P1 - Rappels de contact intelligents
Notifications non-intrusives :
- "Ça fait 3 semaines que tu n'as pas parlé à Marie"
- "L'anniversaire de Léa, c'est dans 5 jours"

### P1 - Quick Actions (fiche contact)
Boutons pour appeler / SMS / WhatsApp directement depuis la fiche

### P2 - Import contacts natifs
Premier écran post-onboarding : "Importer depuis tes contacts iPhone/Android"

### P2 - Widget iOS/Android
Quick add depuis l'écran d'accueil pour noter vite après une conversation

### P3 - Photos
Ajouter des photos aux contacts et aux memories

---

## 6. UX Fixes

### Navigation fiche contact
- Réorganiser en tabs : Overview | News | Profile | Memories | Notes
- Mettre le Résumé IA en hero dans l'Overview
- Cache pour le back → liste contacts

### Flow micro central
```
Micro → Enregistrement → "C'était à propos de qui ?"
→ Sélection contact (création rapide si nouveau)
→ IA analyse → Confirmation extractions → Done
```

### Spacing
- Login/Signup : augmenter l'espace entre le bouton CTA et le lien "Se connecter"/"Créer un compte"

---

## 7. Business

### Modèle Freemium recommandé

**Gratuit :**
- Contacts illimités
- Notes manuelles
- Tags & filtres

**Premium (4.99€/mois ou 39.99€/an) :**
- Transcription vocale
- IA extraction
- Recherche sémantique
- Rappels de contact
- Ice Breakers

### Acquisition
1. TikTok/Reels : démos "Comment je me souviens de tout sur mes potes"
2. Product Hunt launch
3. Build in public Twitter/X
4. Reddit : r/productivity, r/socialskills
5. ASO : "personal crm", "remember people", "contact notes"

### Trust & Privacy
Page dédiée rassurante sur la confidentialité des données

---

## 8. Priorités Consolidées

### P0 - Critique (avant launch)
- [ ] Refonte copywriting onboarding (4 écrans)
- [ ] Illustrations guided tour
- [ ] Nouvelle tagline "Parlez. Recall se souvient."
- [ ] Empty states avec copy émotionnel
- [x] Ice Breakers feature ✅
- [ ] RevenueCat paywall

### P1 - Important
- [ ] Illustration login
- [ ] Icônes Memories contextuelles
- [ ] Résumé IA : header contextuel + ton sobre
- [ ] Quick actions fiche contact (call/sms/whatsapp)
- [ ] Rappels de contact
- [ ] Analytics
- [ ] Landing page Astro

### P2 - Nice to have
- [ ] Contraste couleurs (cards blanches)
- [ ] Couleur secondaire (vert sauge)
- [ ] Tabs navigation fiche contact
- [ ] Import contacts natifs
- [ ] Widget quick add
- [ ] Visuels stores

### P3 - Later
- [ ] Photos contacts/memories
- [ ] Google Calendar intégration
- [ ] Voice search
