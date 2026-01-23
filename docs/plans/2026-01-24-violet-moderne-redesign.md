# Violet Moderne Redesign

**Date:** 2026-01-24
**Status:** Approved
**Remplace:** 2026-01-23-pop-friendly-redesign.md (teal rejeté - "bleu de dentiste")

## Direction

**"Violet Moderne"** — UI sobre avec accent violet vibrant. Les avatars illustrés restent les stars, le violet apporte modernité et énergie sans être clinique.

---

## Nouvelle Palette

### Accent Principal (Violet)

| Nom | Hex | Usage |
|-----|-----|-------|
| **primary** | `#8B5CF6` | Boutons, FAB, liens, éléments actifs |
| **primaryDark** | `#7C3AED` | Hover states |
| **primaryLight** | `#EDE9FE` | Badges, highlights, backgrounds décoratifs |

### Fonds & Surfaces (inchangés)

| Nom | Hex | Usage |
|-----|-----|-------|
| background | `#F8F7F4` | Fond principal (crème chaud) |
| surface | `#FFFFFF` | Cards, modals |
| surfaceAlt | `#F1F0ED` | Zones secondaires |

### Pastels Avatars (inchangés)

| Nom | Hex |
|-----|-----|
| jaune | `#FEF3C7` |
| peche | `#FFEDD5` |
| menthe | `#D1FAE5` |
| lavande | `#EDE9FE` |

### Texte & Borders (inchangés)

| Nom | Hex |
|-----|-----|
| textPrimary | `#1A1A1A` |
| textSecondary | `#57534E` |
| textMuted | `#A8A29E` |
| border | `#1A1A1A` |
| borderLight | `#E7E5E4` |

### Sémantique

| Nom | Hex | Usage |
|-----|-----|-------|
| success | `#10B981` | Confirmations (vert) |
| warning | `#F59E0B` | Alertes (ambre) |
| error | `#EF4444` | Erreurs (rouge) |
| info | `#8B5CF6` | = Violet (cohérence) |

---

## Changements requis

Remplacer toutes les occurrences de teal par violet :

| Fichier | Changement |
|---------|------------|
| `frontend/constants/theme.ts` | primary: #14B8A6 → #8B5CF6, primaryDark → #7C3AED, primaryLight → #EDE9FE |
| `landing-page/src/app/globals.css` | --color-primary: → #8B5CF6, --color-primary-hover → #7C3AED |
| Tous les composants | Utilisent déjà Colors.primary, donc automatique |

---

## Rendu attendu

- FAB violet vibrant
- Boutons primaires violet
- Focus inputs violet
- Chevrons/liens violet
- Fond crème (conservé)
- Cards blanches (conservé)
- Avatars colorés = stars de l'interface
