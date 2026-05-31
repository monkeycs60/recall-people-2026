# ASO Screenshots — Figma Brief (V2)

> Brief actionnable pour refondre la planche `app-store-screenshots-used/ASO-FINAL-*.png`.
> 8 screenshots iPhone, ratio 1290×2796 (6.7"), prêts pour App Store Connect.

---

## Principes globaux

### Rythme chromatique (correction n°1)

Alterner les fonds pour casser la monotonie actuelle (8 écrans gris-pâle d'affilée).

| # | Fond | Code |
|---|---|---|
| 1 | Clair chaud (hero) | `#F7F4FF` |
| 2 | **Violet brand plein** | `#6B4FFF` |
| 3 | Clair | `#F7F4FF` |
| 4 | Clair + dégradé radial violet doux derrière le phone | `#F7F4FF` → `#E8DFFF` |
| 5 | **Violet brand plein** | `#6B4FFF` |
| 6 | Clair | `#F7F4FF` |
| 7 | Clair, mockup avec léger flou décoratif derrière | `#F7F4FF` |
| 8 | **Violet brand plein** | `#6B4FFF` |

Résultat : 3 ruptures violettes (screens 2, 5, 8) au scroll → l'œil accroche.

### Typo overlay

- **Headline** : SF Pro Display **Bold 96–110pt** sur 2 lignes max. Couleur `#1A1428` sur fond clair, `#FFFFFF` sur fond violet.
- **Sous-ligne** : SF Pro Text **Regular 38–44pt**, opacity 70%, sur 1 ligne max.
- **Marge texte** : 80px gauche/droite, 100px haut.
- Pas plus de **9 mots** dans la headline. Pas plus de **10 mots** dans la sous-ligne.

### Mockup phone

- Ombre portée : `0 40px 80px rgba(26, 20, 40, 0.18)`.
- Mockup phone occupe **~60% de la hauteur du canvas**, centré horizontalement.
- Texte au-dessus (60%) ou décalé (40%) — pas en dessous (l'œil scan top-to-bottom).

### Stickers / overlays

Petits cartouches arrondis (radius 24px) flottants à côté ou sur le phone, qui racontent l'histoire en un détail visuel. Ils remplacent le besoin de "tout lire à l'écran".

---

## Screen 1 — Hero / Liste contacts

**Source** : `ASO-FINAL-01.png` (déjà OK structurellement).

| Élément | Valeur |
|---|---|
| Fond | `#F7F4FF` |
| Headline | **Be the friend who remembers** |
| Sous-ligne | *every detail, every person* |
| Mockup | Liste contacts (état actuel) |
| **Sticker** | Post-it violet flottant en haut à droite du phone : `🎂 Emma — demain` |
| Couleur sticker | `#6B4FFF` fond, `#FFFFFF` texte, radius 24px |

> Le sticker raconte instantanément la promesse sans ajouter d'overlay textuel.

---

## Screen 2 — Voice / Chat IA

**Source** : `ASO-FINAL-02.png` (chat input "Tell about one person").

| Élément | Valeur |
|---|---|
| Fond | `#6B4FFF` (violet brand plein) |
| Headline | **Talk. AI files it all** (`#FFFFFF`) |
| Sous-ligne | *names, dates, plans — extracted in 5s* (`#FFFFFFB3`) |
| Mockup | Identique, mais sortir le phone du fond gris → contraste fort |
| **Bulle décorative** | Au-dessus du phone, bulle blanche radius 32px : `"Coffee with Sarah. She's interviewing at Google next week..."` (typo italique 36pt) |
| **Sticker résultat** | Sous la bulle, flèche descendante puis bandeau : `→ +3 facts saved to Sarah` (fond `#FFFFFF22`, texte blanc) |

> Cet écran vend la magie en 1 image : input vocal → faits extraits.

---

## Screen 3 — Profil contact riche

**Source** : `ASO-FINAL-03.png` (LinaCosta profile).

| Élément | Valeur |
|---|---|
| Fond | `#F7F4FF` |
| Headline | **Every friend, one glance** |
| Sous-ligne | *job, family, hobbies, latest topics* |
| Mockup | Profil contact actuel |
| **Callouts** | 3 petits cartouches colorés pointant vers 3 zones du profil :<br>• Jaune `#FFD66B` → "Job" zone<br>• Rose `#FF8FB0` → "Family" zone<br>• Violet `#6B4FFF` → "Latest topics" zone |
| Style callouts | Mini-pill radius 100px, padding 12×24, ombre douce |

> Crée du rythme visuel sur un écran qui sinon est uniforme.

---

## Screen 4 — Events à venir ⚠️ refonte prioritaire

**Source actuelle** : `ASO-FINAL-04.png` — mur de texte (5 cards d'events).

### Refonte

| Élément | Valeur |
|---|---|
| Fond | `#F7F4FF` avec **dégradé radial** violet doux derrière le phone (`#E8DFFF` centre → `#F7F4FF` bord) |
| Headline | **Notified the day before, at 7pm** |
| Sous-ligne | *birthdays, interviews, trips — never missed* |
| Mockup | **Recadré** : 1 seule card event en gros au centre du phone (ex: "Marathon de Marcus — Tomorrow"), les autres cards sortent du cadre bas. Titre de la section "Upcoming" visible en haut. |
| **Overlay notif iOS** | En haut du phone, dans la zone du Dynamic Island, une **fausse notif iOS native** qui descend : <br>📱 Recall People — *now*<br>**Tomorrow: Marcus's marathon 🏃**<br>*Don't forget to wish him good luck* |
| Style notif | Cartouche blanc translucide `#FFFFFFEE` blur, radius 28px, ombre subtile, icône app à gauche |

> Cet overlay est LA preuve visuelle de la feature. À adapter avec la timestamp "7:00 PM" affichée dans le coin de la notif si tu veux être très explicite.

### Alternative low-effort (si tu n'as pas le temps de bricoler l'overlay notif)

Garder le mockup actuel mais :
- Modifier le seed DB pour n'avoir que **1 seul event** dans la liste, bien rempli, avec une icône claire.
- Voir `EXPO_PUBLIC_SCREENSHOT_DB_HASH=3c53b5a3` (DB seedée actuelle) — il suffit de vider les autres events et de garder le marathon.

---

## Screen 5 — Questions à poser ⚠️ refonte prioritaire

**Source actuelle** : `ASO-FINAL-05.png` — autre mur de texte.

### Refonte

| Élément | Valeur |
|---|---|
| Fond | `#6B4FFF` (violet brand plein) |
| Headline | **We tell you what to ask** (`#FFFFFF`) |
| Sous-ligne | *day after: nudge to follow up at 10am* (`#FFFFFFB3`) |
| Mockup | **Recadré** : 1 seule question en gros affichée (ex: "How did Sarah's Google interview go?"). Les autres questions sortent du cadre bas. |
| **Sticker matinal** | Cartouche flottant en haut-droite du phone : `🌅 Tomorrow 10:00 AM` (fond `#FFD66B` jaune, texte `#1A1428`) |
| **Sticker rôle** | Cartouche flottant en bas-gauche du phone : `Be the thoughtful friend` (fond `#FFFFFF22`, texte blanc, radius 100px) |

> L'horaire 10am est tiré directement de `lib/notification-schedule.ts:43` (`getPostEventFollowUpTriggerDate`). C'est tangible et crédible.

---

## Screen 6 — Recherche sémantique

**Source** : `ASO-FINAL-06.png`.

| Élément | Valeur |
|---|---|
| Fond | `#F7F4FF` |
| Headline | **Find anyone by asking** |
| Sous-ligne | *"Who has kids?" "Who I met at the conf?"* |
| Mockup | Écran recherche actuel |
| **Bulle de pensée** | Au-dessus du phone, grande bulle blanche typographique : `"Who works in tech and has kids?"` (SF Pro Italic 56pt) |
| **Connecteur** | Trait pointillé descendant entre la bulle et le phone, finissant en flèche douce sur l'input du phone |

---

## Screen 7 — Notes en contexte

**Source** : `ASO-FINAL-07.png` (notes).

| Élément | Valeur |
|---|---|
| Fond | `#F7F4FF` |
| Headline | **Notes that stick to people** |
| Sous-ligne | *no more orphan notes* |
| Mockup | Écran notes actuel, **avec un léger flou décoratif** appliqué à la zone basse (notes 3-4-5) pour créer profondeur. La note 1 et 2 + l'avatar de la personne restent **nets**. |
| **Sticker avatar** | Petit avatar circulaire flottant à gauche du phone avec un fil/chaîne dessiné qui descend vers les notes : symbolise l'attachement note→personne |

---

## Screen 8 — Langues (closing)

**Source** : `ASO-FINAL-08.png`.

| Élément | Valeur |
|---|---|
| Fond | `#6B4FFF` (violet brand plein) |
| Headline | **Speak your language** (`#FFFFFF`) |
| Sous-ligne | *EN · FR · ES · DE · IT* (`#FFFFFFB3`, large letter-spacing) |
| Mockup | Sélecteur de langue actuel, **avec drapeaux en plus gros** |
| **Bandeau bas** | Cartouche d'incentive en bas du canvas (sous le phone) : `14-day free trial — no card` (fond `#FFD66B`, texte `#1A1428`, radius 100px, taille moyenne) |

> Le bandeau d'essai gratuit en closing maximise les downloads. Le placer ici (dernier écran) plutôt qu'en hero évite le "pricing wall" psychologique.

---

## Ordre final recommandé (planche horizontale Figma)

```
1. HERO (clair)   →   2. VOICE (violet)   →   3. PROFIL (clair)   →   4. NOTIF (clair + glow)
5. WHAT TO ASK (violet)   →   6. SEARCH (clair)   →   7. NOTES (clair)   →   8. LANGUES (violet, CTA)
```

Cet ordre suit le funnel narratif :
- **1** : la promesse (be the one who remembers)
- **2** : le geste (parler)
- **3** : le résultat (profil riche)
- **4** : le pic de valeur n°1 (notif veille)
- **5** : le pic de valeur n°2 (relance lendemain)
- **6** : la flexibilité (recherche)
- **7** : la rigueur (notes ancrées)
- **8** : la close (langues + essai gratuit)

---

## Checklist exécution

- [ ] Créer 8 frames Figma 1290×2796.
- [ ] Appliquer fonds selon table chromatique.
- [ ] Importer mockups depuis `ASO-FINAL-XX.png` (ou re-capturer depuis le seed `3c53b5a3` si refonte de la card pour screen 4/5).
- [ ] Pour screen 4 : créer l'overlay notif iOS native (composant Figma réutilisable).
- [ ] Pour screen 5 : recadrer le mockup phone pour ne montrer qu'1 seule question en gros.
- [ ] Ajouter les stickers/callouts par screen.
- [ ] Vérifier que chaque headline tient en 2 lignes max sur l'iPhone 16 Pro Max preview.
- [ ] Exporter en PNG 1290×2796 (option : .heic pour App Store Connect — accepté depuis 2025).
- [ ] Tester avec un proche : "qu'est-ce que fait cette app ?" après 5 secondes de scroll.

---

## Variantes complémentaires (optionnel)

- **iPad** : reprendre la même grille mais en ratio 2048×2732. Mettre 2 mockups phones par screen pour densifier.
- **Google Play** : 1080×1920, mêmes captions traduites. Le feature graphic 1024×500 reprend le screen 1 (hero) en horizontal.
- **A/B test** : si tu publies via ASO Tools type AppTweak/Storemaven, tester variante "CRM pro" (positionnement classique) vs "Friend memory" (positionnement émotionnel) sur 2 semaines.
