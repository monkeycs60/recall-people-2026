# UX Review — Recall People 2026

> Audit réalisé le 2026-02-03

## Executive Summary

L'app a une proposition de valeur claire et un flow principal bien pensé. Cependant, quelques écrans méritent une attention particulière pour une expérience "seamless".

**Score UX global : 7.5/10**

---

## 1. Problèmes Identifiés & Corrigés

### 1.1 Écran Disambiguation — Texte hardcodé en français ✅ CORRIGÉ

**Problème** : L'écran `disambiguation.tsx` affichait du texte en dur en français, ignorant la langue de l'utilisateur.

**Impact** : Utilisateurs non-francophones voyaient "Qui est..." au lieu de "Who is..." — cassure de l'expérience.

**Solution appliquée** :
- Ajout des clés i18n `disambiguation.*` dans les 5 fichiers de locale
- Mise à jour du composant pour utiliser `useTranslation()`

**Fichiers modifiés** :
- `frontend/app/disambiguation.tsx`
- `frontend/locales/en.json`
- `frontend/locales/fr.json`
- `frontend/locales/es.json`
- `frontend/locales/it.json`
- `frontend/locales/de.json`

---

## 2. Analyse du Flow Principal

### 2.1 Onboarding → Record → Review → Contact

```
[App Launch]
     ↓
[Onboarding] ← Explique la valeur, demande permissions
     ↓
[Home / Contacts List]
     ↓
[FAB Record] ← Point d'entrée principal
     ↓
[Recording Screen] ← Enregistrement vocal
     ↓
[Processing] ← Transcription + Extraction IA
     ↓
[Disambiguation?] ← SI plusieurs contacts matchent le prénom
     ↓
[Review Screen] ← Validation des infos extraites
     ↓
[Contact Detail] ← Fiche enrichie
```

### 2.2 Points Forts ✅

1. **FAB visible et accessible** — L'action principale est évidente
2. **Feedback de processing** — L'utilisateur sait que l'app travaille
3. **Review avant commit** — L'utilisateur garde le contrôle sur les données
4. **Local-first** — Rassure sur la vie privée

### 2.3 Points d'Amélioration 🔧

#### A. Écran Disambiguation — UX confuse

**Problème actuel** :
L'écran affiche "Qui est [prénom] ?" quand plusieurs contacts partagent le même prénom. Le titre est clair, mais :
- L'utilisateur peut ne pas comprendre *pourquoi* on lui demande ça
- Pas de contexte sur ce que l'app a compris de la note

**Recommandations** :
1. Ajouter un résumé de la note au-dessus : *"Tu as parlé de [prénom]. À qui correspond cette note ?"*
2. Afficher des indices différenciateurs plus visibles (dernier contact, hot topics actifs)
3. Option "Je ne sais pas" qui crée un nouveau contact par défaut

#### B. Review Screen — Trop dense

**Problème actuel** :
L'écran Review contient beaucoup d'informations :
- Transcription éditable
- Infos contact (tel, email, anniversaire)
- Facts extraits
- Hot topics avec dates
- Groupes
- Topics résolus
- Mémoires

**Recommandations** :
1. Utiliser des sections collapsibles avec état par défaut intelligent
2. Mettre en avant les éléments "nouveaux" vs "confirmation"
3. Quick save : si l'utilisateur fait défiler jusqu'en bas et appuie Save, c'est qu'il valide tout

#### C. Empty States — Manquants ou génériques

**Recommandations** :
1. Ajouter des empty states engageants sur chaque écran vide
2. Inclure des micro-animations ou illustrations
3. Call-to-action clair : "Enregistre ta première note !"

---

## 3. Recommandations Générales

### 3.1 Cohérence du Ton

- **Actuel** : Mix de "tu" et "vous" selon les écrans
- **Recommandation** : Standardiser sur le "tu" (plus intime, cohérent avec la proposition de valeur relationnelle)

### 3.2 Micro-interactions

- Ajouter haptic feedback sur les actions importantes (save, delete)
- Animations subtiles sur les transitions entre écrans
- Skeleton loaders au lieu de spinners génériques

### 3.3 Onboarding Amélioré

L'onboarding actuel explique les fonctionnalités. Suggestions :
1. Montrer un exemple concret (note vocale → fiche contact)
2. Permettre un "dry run" sans vraiment enregistrer
3. Expliquer la promesse vie privée dès le début

### 3.4 Accessibilité

- Vérifier les contrastes de couleur (WCAG AA)
- Ajouter des labels accessibles sur tous les boutons icône
- Tester avec VoiceOver/TalkBack

---

## 4. Métriques à Surveiller

| Métrique | Objectif | Pourquoi |
|----------|----------|----------|
| Time to first note | < 2 min | Activation rapide |
| Disambiguation completion rate | > 90% | Pas d'abandon sur cet écran |
| Review completion rate | > 95% | L'utilisateur valide ses notes |
| D7 retention | > 40% | L'app entre dans l'habitude |
| Notes per user per week | > 3 | Usage régulier |

---

## 5. Priorités d'Implémentation

### P0 — Critique
- ✅ Fix i18n disambiguation (fait)

### P1 — Important
- [ ] Améliorer UX disambiguation (contexte + indices)
- [ ] Simplifier Review screen (sections collapsibles)
- [ ] Empty states engageants

### P2 — Nice to have
- [ ] Micro-interactions et haptics
- [ ] Onboarding interactif
- [ ] Dark mode (si pas déjà)

---

## 6. Conclusion

L'app a des fondations solides. Le flow principal est logique et la proposition de valeur est claire. Les améliorations suggérées visent à réduire la friction sur les écrans secondaires (disambiguation, review) et à renforcer l'engagement émotionnel.

**Prochaine étape** : Tester avec 5-10 utilisateurs réels pour valider les hypothèses UX.
