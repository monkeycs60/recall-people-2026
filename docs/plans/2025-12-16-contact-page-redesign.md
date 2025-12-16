# Redesign Page Contact — Design Document

**Date:** 16/12/2025
**Statut:** Validé, prêt pour implémentation

---

## Contexte & Problème

L'interface actuelle de la page contact présente trois sections qui créent de la redondance :
- **Informations** : facts structurés (clé-valeur)
- **Points clés** : bullets auto-générés depuis les facts → doublon
- **Notes** : summary IA + transcription mélangés

**Objectifs du redesign :**
1. Supprimer la redondance entre sections
2. Distinguer clairement infos permanentes vs sujets temporels/actionnables
3. Permettre un rappel rapide en 5 secondes avant de revoir quelqu'un
4. Gérer l'évolution des infos dans le temps (timeline, cumul)
5. Archiver les transcriptions comme référence, pas comme navigation

---

## Nouvelle Structure

```
┌─────────────────────────────────────────┐
│ [Photo]  Julie Roche         ✏️         │
│          Dernier contact : 15/12/2025   │
│          [ami] [collègue]               │
├─────────────────────────────────────────┤
│ RÉSUMÉ IA                               │
│ "Julie travaille dans la communication  │
│ chez Affilae. Passionnée de course..."  │
├─────────────────────────────────────────┤
│ PROFIL                                  │
│ ┌─────────────┐ ┌─────────────┐         │
│ │ Lead Com    │ │ Affilae     │         │
│ │ Métier    ▼ │ │ Entreprise  │         │
│ └─────────────┘ └─────────────┘         │
│ Semi-marathon · Lyon · Via Marc...      │
├─────────────────────────────────────────┤
│ SUJETS CHAUDS (2)                       │
│ 🔴 Examen de droit                      │
│    Stressée, résultats en janvier       │
│ 🔴 Recherche appart                     │
│    Cherche T3 vers Croix-Rousse         │
│                                         │
│ ▶ Voir résolus (3)                      │
├─────────────────────────────────────────┤
│ ▶ Transcriptions (5)                    │
│   📝 15/12/2025 — Café rattrapage       │
│   📝 02/12/2025 — Après sa soutenance   │
└─────────────────────────────────────────┘
```

---

## Section 1 : Header

- **Nom + prénom** : éditable inline
- **Photo** : optionnelle
- **Tags** : ami / famille / collègue / prospect / client / autre
- **Dernier contact** : date de la dernière note ajoutée

---

## Section 2 : Résumé IA

**Description :**
2-3 phrases synthétisant qui est la personne. Permet le rappel rapide en 5 secondes.

**Exemple :**
> "Julie travaille dans la communication chez Affilae. Passionnée de course à pied, elle prépare un semi-marathon. Vous vous êtes rencontrés à la soirée de Marc."

**Comportement :**
- **Non éditable** par l'utilisateur
- **Régénéré automatiquement** après chaque nouvelle note
- Génération en **arrière-plan** (non-bloquant)
- Si l'API échoue, on conserve l'ancien résumé

---

## Section 3 : Profil (Vue Carte)

**Principe :**
Affichage des infos permanentes sous forme de cartes. Les catégories n'apparaissent **que si remplies**. Métier + Entreprise sont visuellement plus proéminents.

### Catégories définies

| Catégorie | Comportement | Exemple |
|-----------|--------------|---------|
| Métier | Singulier + timeline | "Lead Dev" (avant: "Dev") |
| Entreprise | Singulier + timeline | "Affilae" |
| Formation | Singulier + timeline | "Sciences Po" |
| Lieu de vie | Singulier + timeline | "Lyon" |
| Conjoint | Singulier + timeline | "Marié à Sophie" |
| Origine | Singulier | "Italienne" |
| Anniversaire | Singulier | "12 mars" |
| Comment connu | Singulier | "Via Marc, soirée 2023" |
| Lieu de rencontre | Singulier | "Bar Le Central, Paris" |
| Enfants | Cumulatif | "2 enfants : Léo, Emma" |
| Hobbies | Cumulatif | "Lecture, Yoga, Cuisine" |
| Sports | Cumulatif | "Tennis, Course à pied" |
| Langues | Cumulatif | "Français, Anglais, Espagnol" |
| Animaux | Cumulatif | "Chat : Minou" |
| Références communes | Cumulatif | "Blague du flamant rose" |
| Signe distinctif | Cumulatif | "Grande, cheveux roux" |
| Idées cadeaux | Cumulatif | "Aime le thé matcha" |
| Cadeaux faits | Cumulatif + date | "Livre X (Noël 2024)" |

### Comportements

**Singulier + timeline :**
- La nouvelle valeur remplace l'ancienne
- L'historique est accessible via un indicateur "▼" qui déplie la timeline
- Format timeline : "2024: Dev chez A → 2025: Lead chez B"

**Cumulatif :**
- Les nouvelles valeurs s'ajoutent à la liste existante
- Jamais supprimé automatiquement
- L'utilisateur peut supprimer manuellement si obsolète

**Édition :**
- Toutes les infos sont éditables par l'utilisateur
- Tap sur une info → mode édition

---

## Section 4 : Sujets Chauds

**Description :**
Infos temporelles/actionnables : projets en cours, événements à venir, sujets de conversation à reprendre.

### Affichage d'un sujet

```
┌─────────────────────────────────────────┐
│ 🔴 Examen de droit                      │
│ Stressée, résultats attendus en janvier │
│ 15/12/2025                              │
└─────────────────────────────────────────┘
```

- **Indicateur visuel** : pastille colorée (en cours = rouge/orange, résolu = gris)
- **Titre** : le sujet extrait par l'IA
- **Contexte** : 1-2 lignes résumant ce qui a été dit
- **Date** : dernière mention

### Interactions

- **Tap** → ouvre le détail (historique si mentionné plusieurs fois)
- **Swipe ou bouton** → "Marquer comme résolu"
- **Éditable** : titre et contexte modifiables

### Cycle de vie

- **IA-assisté** : quand une nouvelle note mentionne la résolution d'un sujet, l'IA le détecte et propose de l'archiver
- **Manuel** : l'utilisateur peut marquer "résolu" à tout moment

### Archives

- Section "Voir résolus (X)" repliée par défaut
- Les sujets résolus restent accessibles mais ne polluent pas la vue principale

---

## Section 5 : Transcriptions (Archive)

**Description :**
Archive des transcriptions écrites. Référence technique, pas un outil de navigation quotidien.

### Affichage

```
▶ Transcriptions (3)
├─ 📝 15/12/2025 — Café rattrapage
├─ 📝 02/12/2025 — Après sa soutenance
└─ 📝 18/11/2025 — Soirée anniversaire Marc
```

- **Section repliée par défaut** (header + nombre)
- Chaque transcription a un **titre court généré par l'IA** pour s'y retrouver
- **Tap** sur une ligne → affiche la transcription complète
- **Suppression** possible pour nettoyer

### Stockage

- On stocke la **transcription écrite** uniquement
- L'audio peut être supprimé après traitement pour économiser l'espace

---

## Tableau récapitulatif des comportements

| Élément | Éditable | Régénéré par IA | Archivable |
|---------|----------|-----------------|------------|
| Résumé IA | Non | Oui (après chaque note, arrière-plan) | Non |
| Profil | Oui | Extraction initiale | Non |
| Sujets chauds | Oui | Extraction initiale + détection clôture | Oui |
| Transcriptions | Supprimable | Titre généré à la création | Non |

---

## Évolutions futures possibles

- **Suggestions de follow-up IA** : proposer des questions/sujets de conversation avant de revoir quelqu'un
- **Rappels automatiques** : notification si un sujet chaud date de trop longtemps sans mise à jour
- **Recherche globale** : chercher une info à travers tous les contacts

---

## Notes d'implémentation

### Modifications base de données

1. **Table `notes`** : ajouter champ `title` (titre court IA)
2. **Table `facts`** : revoir les `factType` pour correspondre aux nouvelles catégories
3. **Nouvelle table `hot_topics`** : sujets chauds avec statut (active/resolved), contexte, dates
4. **Table `contacts`** : ajouter champ `ai_summary` pour le résumé IA

### Modifications extraction IA

1. Prompt d'extraction à mettre à jour pour :
   - Distinguer facts permanents vs sujets chauds
   - Générer un titre court pour la transcription
   - Détecter les résolutions de sujets existants

2. Nouveau prompt pour génération du résumé IA (2-3 phrases)

### Modifications frontend

1. Refonte complète du composant `contact/[id].tsx`
2. Nouveaux composants : `AISummary`, `ProfileCard`, `HotTopicsList`, `TranscriptionArchive`
3. Système de timeline pour les facts singuliers
