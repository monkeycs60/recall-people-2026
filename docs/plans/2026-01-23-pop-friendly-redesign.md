# Pop Friendly Redesign

**Date:** 2026-01-23
**Status:** Approved

## Problèmes identifiés

1. **Incohérence landing/app** : Landing page avec blobs organiques, app sans
2. **Manque de contraste** : Cards blanches sur fond blanc
3. **Corail trop féminin** : `#FF7F6B` ne correspond pas au ton voulu
4. **Palette déconnectée des avatars** : Les avatars ont leur propre palette non exploitée

## Direction design

**"Pop Friendly"** — Une palette basée sur les couleurs des avatars illustrés, avec le teal comme accent principal (énergique, moderne, non-genré).

---

## Nouvelle Palette

### Accent Principal

| Nom | Hex | Usage |
|-----|-----|-------|
| Teal | `#14B8A6` | Boutons, FAB, liens, éléments actifs |
| Teal Dark | `#0D9488` | Hover states |
| Teal Light | `#CCFBF1` | Badges, highlights légers |

### Fonds & Surfaces

| Nom | Hex | Usage |
|-----|-----|-------|
| Background | `#F8F7F4` | Fond principal (crème chaud) |
| Surface | `#FFFFFF` | Cards, modals |
| Surface Alt | `#F1F0ED` | Zones secondaires, séparateurs |

### Pastels Avatars

| Nom | Hex | Usage |
|-----|-----|-------|
| Jaune | `#FEF3C7` | Background avatar, tags |
| Pêche | `#FFEDD5` | Background avatar, tags |
| Menthe | `#D1FAE5` | Background avatar, success |
| Lavande | `#EDE9FE` | Background avatar, tags |

### Texte & Borders

| Nom | Hex | Usage |
|-----|-----|-------|
| Text Primary | `#1A1A1A` | Titres, texte principal |
| Text Secondary | `#57534E` | Descriptions, métadonnées |
| Text Muted | `#A8A29E` | Placeholders, hints |
| Border | `#1A1A1A` | Contours flat & bold |
| Border Light | `#E7E5E4` | Séparateurs subtils |

### Sémantique

| Nom | Hex | Usage |
|-----|-----|-------|
| Success | `#10B981` | Confirmations |
| Warning | `#F59E0B` | Alertes douces |
| Error | `#EF4444` | Erreurs |
| Info | `#14B8A6` | = Teal (cohérence) |

---

## Composants

### Cards (Liste de contacts)

- **Fond écran** : `#F8F7F4` (crème) au lieu de blanc pur
- **Card** : `#FFFFFF` avec border `#1A1A1A` 1.5px
- **Events/dates** : `#57534E` (text secondary) — plus de corail
- **Chevron/icônes interactifs** : `#14B8A6` (teal)
- **Avatar background** : pastels existants (jaune, pêche, menthe, lavande)

### Tab Bar

| Élément | Valeur |
|---------|--------|
| FAB | `#14B8A6` (teal), icône blanche |
| Icône/label actif | `#14B8A6` |
| Icône/label inactif | `#A8A29E` |
| Background | `#FFFFFF` avec border-top `#E7E5E4` |

### Boutons

| Variante | Background | Text | Border |
|----------|------------|------|--------|
| Primary | `#14B8A6` | `#FFFFFF` | — |
| Secondary | `#FFFFFF` | `#14B8A6` | `#1A1A1A` 2px |
| Ghost | transparent | `#57534E` | — |
| Danger | `#FEE2E2` | `#EF4444` | `#1A1A1A` 2px |

Style commun : `border-radius: 12px`, `padding: 12px 24px`, `font-weight: 600`

### Inputs

| État | Background | Border |
|------|------------|--------|
| Idle | `#FFFFFF` | `#E7E5E4` 1.5px |
| Focus | `#FFFFFF` | `#14B8A6` 2px |
| Error | `#FFFFFF` | `#EF4444` 2px |
| Disabled | `#F1F0ED` | `#E7E5E4` 1.5px |

Style : `border-radius: 12px`, `padding: 12px 16px`

---

## Formes décoratives

### Landing page
- **Conserver les blobs organiques** animés (rose/menthe)
- Mettre à jour les couleurs vers la nouvelle palette si nécessaire

### App mobile
- **Cercles/ellipses statiques** en arrière-plan
- Opacité faible (8-15%)
- Maximum 2 par écran
- Utilisés sur : Onboarding, Empty states, Écran Assistant, Profil

| Écran | Formes | Couleurs |
|-------|--------|----------|
| Onboarding | 2 grands cercles | Teal 10%, Lavande 15% |
| Empty states | 1 cercle | Menthe 20% |
| Assistant | 1 ellipse en haut | Teal light 15% |
| Profil | 1 cercle derrière avatar | Pastel de l'avatar |

---

## Fichiers à modifier

### Frontend (React Native)

1. **`/frontend/constants/theme.ts`** — Nouvelle palette de couleurs
2. **`/frontend/components/ClusterCard.tsx`** — Couleurs events, chevron
3. **`/frontend/components/TabBar.tsx`** ou navigation — FAB et icônes
4. **`/frontend/app/(tabs)/index.tsx`** — Background crème
5. **`/frontend/app/(tabs)/assistant.tsx`** — Background + ellipse décorative
6. **`/frontend/components/ui/`** — Buttons, Inputs si existants

### Landing page (Next.js)

7. **`/landing-page/src/app/globals.css`** — Variables CSS mises à jour
8. **`/landing-page/src/components/Hero.tsx`** — Couleurs blobs si besoin
9. **`/landing-page/src/components/Features.tsx`** — Accents couleurs

---

## Tâches d'implémentation

### Task 1: Mettre à jour theme.ts avec la nouvelle palette
- Remplacer les couleurs corail par teal
- Ajouter les nouvelles couleurs (background crème, pastels avatars)
- Mettre à jour les couleurs sémantiques

### Task 2: Mettre à jour les variables CSS landing page
- Synchroniser globals.css avec la nouvelle palette
- Mettre à jour les couleurs des blobs si nécessaire

### Task 3: Appliquer le fond crème aux écrans principaux
- index.tsx (liste contacts)
- Autres écrans tabs

### Task 4: Mettre à jour ClusterCard
- Events/dates en text secondary
- Chevron en teal
- Vérifier le contraste

### Task 5: Mettre à jour la TabBar
- FAB en teal
- Icônes actives en teal
- Icônes inactives en muted

### Task 6: Mettre à jour les boutons
- Primary en teal
- Secondary avec border noir
- Vérifier tous les boutons de l'app

### Task 7: Mettre à jour les inputs
- Focus state en teal
- Vérifier search bar et formulaires

### Task 8: Ajouter cercles décoratifs
- Créer composant DecoCircle
- Intégrer sur écran Assistant
- Intégrer sur autres écrans appropriés

### Task 9: Mettre à jour la landing page
- Appliquer nouvelles couleurs aux composants
- Vérifier cohérence globale
