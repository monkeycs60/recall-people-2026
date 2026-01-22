# Direction Artistique "Pop" — Recall People

**Date :** 2026-01-22
**Statut :** Validé
**Objectif :** Refonte complète de l'identité visuelle pour un style jeune, dynamique et pop, aligné avec les avatars cartoon existants.

---

## 1. Vision

Passer d'un style "coffee shop chic" (terracotta, serif élégante) à un univers **Flat & Bold** inspiré des avatars cartoon de l'app : lignes noires, aplats de couleur, énergie pop.

**Références :** Duolingo, Notion illustrations, Headspace

---

## 2. Palette de Couleurs

### Couleur primaire
| Nom | Hex | Usage |
|-----|-----|-------|
| Corail | `#FF7F6B` | Boutons primaires, CTA, liens, accents |
| Corail hover | `#E86B58` | États hover/pressed |

### Pastels secondaires
| Nom | Hex | Usage |
|-----|-----|-------|
| Rose bonbon | `#FFB5C5` | Badges, highlights, avatars |
| Menthe | `#7DDEC3` | Succès, validations, accents |
| Bleu ciel | `#7EC8E8` | Infos, liens secondaires |
| Pêche clair | `#FFDAB3` | Backgrounds, warmth |

### Neutres
| Nom | Hex | Usage |
|-----|-----|-------|
| Blanc | `#FFFFFF` | Surfaces principales |
| Crème | `#FFF9F5` | Background alternatif |
| Noir | `#1A1A1A` | Texte, bordures UI |
| Gris texte | `#6B7280` | Texte secondaire |

### Utilisation
- Fond principal : blanc ou crème
- Sections alternées : pastels très dilués (10% opacité)
- Bordures UI : noir `#1A1A1A` en 2px
- Formes déco : pastels à 60-80% opacité

---

## 3. Typographie

### Police unique : Plus Jakarta Sans

Abandon de Playfair Display (serif) pour une cohérence 100% moderne.

### Hiérarchie Desktop
| Élément | Taille | Poids | Line-height |
|---------|--------|-------|-------------|
| H1 Hero | 48-56px | Bold (700) | 1.1 |
| H2 Section | 32-36px | SemiBold (600) | 1.2 |
| H3 Card title | 20-24px | SemiBold (600) | 1.3 |
| Body | 16px | Regular (400) | 1.5-1.6 |
| Body small | 14px | Regular (400) | 1.5 |
| Caption | 12px | Medium (500) | 1.4 |
| Button | 16px | SemiBold (600) | 1 |

### Hiérarchie Mobile
| Élément | Taille |
|---------|--------|
| H1 | 28-32px |
| H2 | 22-24px |
| Body | 16px (minimum) |

---

## 4. Composants UI (Flat & Bold)

### Boutons
| Type | Style |
|------|-------|
| Primaire | Fond corail `#FF7F6B` + bordure noire 2px + texte blanc + radius 12px |
| Secondaire | Fond blanc + bordure noire 2px + texte noir + radius 12px |
| Ghost | Pas de fond + texte corail + underline au hover |
| Disabled | Fond `#E5E5E5` + bordure gris + texte gris |

### Cards
- Fond blanc
- Bordure noire 1.5-2px
- Border-radius : 16px
- Pas d'ombre (flat design)
- Hover : teinte de fond `#FFF9F5`

### Inputs
- Bordure noire 2px
- Border-radius : 12px
- Focus : bordure corail 2px
- Placeholder : gris `#9CA3AF`

### Badges / Chips
- Fond pastel (rose, menthe, bleu selon contexte)
- Bordure noire 1.5px
- Border-radius : 20px (pill shape)
- Texte noir, 12-14px SemiBold

### Toggle / Switch
- Track : gris clair → corail quand actif
- Thumb : blanc avec bordure noire

---

## 5. Icônes

### Icônes principales (actions clés)
- Style : **Filled** avec contour noir 1.5px
- Couleurs : pastels (rose, menthe, pêche, bleu)
- Taille : 24px (app), 20px (compact)

### Icônes secondaires (utilitaires)
- Style : **Outline bold** (stroke 2px)
- Couleur : noir `#1A1A1A`
- Usage : chevrons, close, settings

### Exemples Tab Bar
- Home → filled rose
- Contacts → filled pêche
- Add → filled corail (CTA)
- Notes → filled menthe
- Profil → filled bleu ciel

---

## 6. Éléments Décoratifs

### Formes géométriques
- Blobs/cercles pastels à 50-70% opacité
- Bords doux, formes organiques
- Placement : hero, onboarding, empty states, landing page
- Densité : max 3-4 formes par écran, en arrière-plan

### Confettis
- Petits cercles, étoiles, cœurs dispersés
- Animation légère de flottement

### Illustrations
- Conserver le style avatar existant (ligne noire + aplats)
- Étendre aux autres illustrations (onboarding, empty states)

---

## 7. Application Mobile

### Tab bar
- Fond blanc + bordure noire top 1.5px
- Icônes filled pastels (active) / outline gris (inactive)
- Label caption 12px

### Liste contacts
- Cards blanches bordure noire, empilées
- Avatar cartoon à gauche
- Fond page : crème `#FFF9F5`

### Fiche contact
- Header : fond pastel doux + avatar centré
- Sections : cards blanches bordure noire
- Tags : badges pastels pill-shaped

### Empty states
- Illustration cartoon centrée
- Formes géométriques en arrière-plan
- CTA corail

### Onboarding
- Fonds pastels changeants par slide
- Grande illustration cartoon
- Dots pagination : corail actif / gris inactif

---

## 8. Landing Page

### Structure
1. **Navbar** : fond blanc, logo, liens, CTA corail
2. **Hero** : titre bold + sous-titre + CTA + phone mockup avec vidéo + blobs pastels
3. **Features** : alternance fond blanc/pastel dilué, icônes filled, layout zigzag
4. **Pricing** (si applicable) : cards bordure noire, plan populaire en corail léger
5. **CTA final** : fond corail ou dégradé pastel + gros bouton
6. **Footer** : fond noir, liens blancs/gris, hover corail

### Spécificités
- Pas de section social proof
- Phone mockup conserve la vidéo (pas screenshot)
- Blobs décoratifs rose + menthe

---

## 9. Micro-interactions & Animations

### Principes
- Durée : 150-300ms
- Easing : `ease-out` (entrées), `ease-in-out` (transitions)

### Boutons
- Hover : translation Y -2px + ombre offset cartoon
- Press : scale 0.97

### Cards
- Hover : translation Y -4px
- Tap mobile : scale 0.98

### Éléments décoratifs
- Blobs : mouvement flottant lent (8-12s loop)
- Confettis : apparition staggered au scroll

### Loading
- Skeleton screens avec shimmer pastel
- Ou animation avatar (wave, bounce)

### Toasts
- Slide in top + bordure noire
- Fond pastel selon type (menthe=succès, rose=info)

---

## 10. Fichiers à Modifier

### Frontend (React Native)
- `frontend/constants/theme.ts` — Nouvelle palette + tokens
- `frontend/app.json` — Couleurs splash screen
- Composants UI à mettre à jour avec nouveau style

### Landing Page (Next.js)
- `landing-page/src/app/globals.css` — Variables CSS, couleurs, typo
- `landing-page/src/app/layout.tsx` — Font Plus Jakarta Sans
- `landing-page/src/components/Hero.tsx` — Nouveau style hero + blobs
- `landing-page/src/components/Features.tsx` — Style cards flat & bold
- `landing-page/src/components/Pricing.tsx` — Style pricing cards
- `landing-page/src/components/Footer.tsx` — Fond noir, style liens
- Tous les composants — Appliquer nouvelle direction

---

## 11. Assets à Créer/Modifier

- [ ] Icônes filled pastels pour tab bar et actions
- [ ] Formes décoratives (blobs SVG)
- [ ] Mise à jour des illustrations existantes si nécessaire
