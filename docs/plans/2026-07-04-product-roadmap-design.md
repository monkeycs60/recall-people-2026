# Recall People — Design produit : boucle rappel → action

**Date :** 2026-07-04
**Statut :** validé (session de brainstorm)

## 1. Pain point et axe de focus

Le produit ne vend pas de la mémoire, il vend **le geste social au bon moment**. Le moment
magique validé en usage réel : recevoir le rappel la veille d'un événement important pour un
contact, et pouvoir écrire "bonne chance pour demain" — les points relationnels gagnés.
L'échec cuisant symétrique : "je l'ai su, j'ai oublié, je me sens bête". Recall People vend
l'inverse de la honte sociale : être la personne qui se souvient.

### Hiérarchie de valeur

1. **La boucle rappel → action** (hot topics datés, notifications, relance post-événement) —
   le cœur. Tout ce qui la fiabilise est prioritaire.
2. **La capture à chaud** — le carburant. Déjà bonne (1 tap FAB, vocal, détection auto).
   On l'améliore par le multi-contacts, pas par plus de boutons.
3. **L'anti-sèche** (résumé, loves, contexte de rencontre) — valeur d'appoint, surtout pour
   les contacts distants. Les loves ne deviennent précieux que branchés sur les cadeaux.

**Corollaire :** memories, facts, contexte de rencontre restent mais ne reçoivent plus
d'investissement. Aucune nouvelle feature ne se justifie si elle ne renforce pas 1 ou 2.

### Diagnostic de la boucle (classement utilisateur)

1. **Le rappel s'évapore** — notif veille 19h vue puis oubliée le lendemain, pas de répétition.
2. **La boucle post-événement est incomplète** — pas de relance "comment ça s'est passé ?",
   et marquer l'issue dans l'app est une corvée.
3. **Capture** — pas assez de moments capturés (secondaire).

### Ordre des chantiers

1. **Stabilité IA** (prérequis à tout)
2. **Notifications** (double rappel + snooze + réglage d'heures)
3. **Boucle post-événement gratuite** (prompt social + "Raconter")
4. **Cadeaux** (idées + historique + rappel J-7)
5. **Multi-contacts** (le plus lourd, dépend de 1)

Livrable transverse : **mise à jour de la landing page** (follow-up affiché gratuit,
nouvelles features) + réconciliation des prix/quotas divergents entre la landing
(4,99 €, 15 contacts), `TODO.md` (6,99 €, 10 notes/mois) et `FONCTIONNALITES.md`.

---

## 2. Chantier stabilité IA

Objectif : une note n'est **jamais perdue** ; l'extraction réussit de façon quasi
déterministe. Contexte : `gpt-oss-120b` (Cerebras) échoue la validation de schéma
20-75 % du temps (constat dans le code) ; `summary`/`ask` ont 3 retries mais
`extract`/`detect-contact` n'en ont aucun.

**Backend :**

1. **Retries (3) sur `extract` et `detect-contact`** — même boucle que `summary`/`ask`.
2. **`detect-contact` migre vers `Output.object(schema)`** — supprimer le
   `generateText` brut + regex + `JSON.parse` (point le plus fragile du pipeline).
3. **`temperature: 0` sur toutes les routes structurées** — `getStructuredOutputSettings`
   existe déjà mais n'est appelé nulle part.
4. **Garde-fous déterministes sur les dates** — validation en code après extraction :
   `eventDate` parsable, ni passé lointain ni > +2 ans. Date invalide → topic conservé
   mais non daté (pas de fausse notif). Principe général : **l'IA propose, le code vérifie**.

**Décision explicite : pas de fallback de provider.** On reste 100 % Cerebras.

**Frontend :**

5. **La note survit à l'échec** — audio + transcription conservés localement avec état
   "à réessayer" visible + toast d'erreur clair (déjà réclamé dans `TODO.md`).
   L'utilisateur ne ré-enregistre jamais.

---

## 3. Chantier notifications

Principe : **deux chances au lieu d'une, un seul réglage, zéro push serveur** (décision
explicite : pas de push serveur pour l'instant ; tout reste local via `expo-notifications`,
reprogrammé à l'ouverture — limitation acceptée).

1. **Double rappel pour tout hot topic daté** :
   - **Veille au soir** (défaut 19h, existant) — "L'entretien de Marie, c'est demain."
   - **Jour J au matin** (défaut 8h30, nouveau) — wording orienté action :
     "C'est aujourd'hui : entretien de Marie. Envoie-lui un mot 💬".
2. **Snooze actionnable** — bouton **"Me le rappeler demain matin"** sur la notif du soir
   (catégories/actions `expo-notifications`). Si snooze sur un rappel de veille : fusion
   avec le rappel jour J (une seule notif le matin, wording action).
3. **Un réglage global unique** dans Profile : "Rappels du soir" + "Rappels du matin"
   (pickers d'heure). L'heure du matin s'applique aussi à `not_seen` et `post_event`
   (aujourd'hui 10h en dur). Changement → replanification immédiate.
4. **Anniversaires : rappel J-7 en plus** — "Anniversaire de Marie dans une semaine 🎁"
   (+ idées cadeaux, cf. chantier 4). Veille + jour J restent pour le message.

Implémentation : `lib/notification-schedule.ts` + `stores/settings-store.ts`, purement local.

---

## 4. Chantier boucle post-événement (gratuite)

Principe : **la relance est un prétexte social, jamais une corvée de saisie.**

1. **Gratuite et activée par défaut** — sort du paywall premium. C'est le moteur de
   rétention ; le premium vend du volume (durée vocale, quotas) et les cadeaux.
2. **Notif lendemain matin** (heure "matin" globale) :
   *"Demande à Marie comment s'est passé son entretien 💬"*. L'action attendue est
   d'écrire à Marie — l'app ne réclame rien.
3. **Relance J+3 silencieuse in-app** (pas de 2e notif) : le hot topic passé non résolu
   reste en tête de fiche avec deux boutons :
   - **"Résolu 🎉"** — un tap, résolution générique.
   - **"Raconter"** — lance l'enregistrement avec contact présélectionné **+ topic ciblé
     injecté en préambule du prompt d'extraction** ("L'utilisateur répond à propos de :
     'Entretien chez Google' (Marie, 3 juillet)"). Les pronoms se résolvent sans
     re-contextualiser ; le mécanisme `resolvedTopics[]` existant porte la résolution.
4. **Zéro culpabilisation** — pas de badge rouge ni compteur. Un topic passé jamais
   résolu s'estompe visuellement après ~2 semaines.

---

## 5. Chantier cadeaux

Pain : "je ne sais pas quoi offrir, et je ne me souviens plus de ce que j'ai déjà offert."
Feature différenciante vs personal CRM classiques — **candidate premium**.

1. **Section "Cadeaux" sur la fiche contact**, deux listes :
   - **Idées** — extraites par l'IA quand c'est explicite ("elle rêve d'un cours de
     poterie") + ajout manuel. Chaque idée garde sa note source datée.
   - **Offerts** — quoi, quand, pour quelle occasion. Anti-doublon. Saisie manuelle
     rapide ou détectée ("je lui ai offert un tapis de yoga pour son anniv").
2. **Extraction** : champ `gifts[]` dans le schéma (`type: idea | given`, libellé,
   occasion). Règle stricte : uniquement l'explicite — pas de déduction depuis les loves.
3. **Notifications** : le rappel anniversaire **J-7** remonte les idées existantes ;
   à défaut, les loves en inspiration. Aucun rappel cadeau autonome.
4. **Données** : table `gifts` (SQLite) + `SyncedGift` chiffré, même pattern que `memories`.
5. Pas de statuts intermédiaires ("à acheter", budget, liens produits) — YAGNI.

---

## 6. Chantier multi-contacts

Principe : **le multi-contacts est une propriété de l'enregistrement, pas de la note.**
Le modèle de données reste mono-contact partout (notes, hot topics, facts, sync inchangés).
Cas d'usage cible : débrief de groupe ("j'ai vu du monde, la flemme de faire une note
chacun") + mentions secondaires (couple, bande d'amis).

**Prérequis absolu : chantier stabilité livré et vérifié.**

1. **Détection multiple** — `detect-contact` retourne un tableau de protagonistes
   (matching + désambiguïsation par personne, comme aujourd'hui). Plafond : **5 contacts**.
2. **Extraction en une passe, schéma bucketé** — `contacts[]`, chaque entrée avec ses
   hotTopics/loves/facts/gifts/contactInfo. (Rejeté : N extractions séparées — N× coût,
   N× latence, N chances d'échec.)
3. **Pertinence — trois garde-fous en couches :**
   - **Barre d'entrée (prompt)** : une personne n'entre dans `contacts[]` que si
     l'enregistrement contient au moins une info durable explicitement attribuée à elle.
     "J'ai vu Paul et Marie" tout court → pas d'extraction secondaire.
   - **Filtre déterministe (code)** : toute entrée sans champ substantiel est supprimée
     avant l'écran review.
   - **Défauts asymétriques (review)** : protagonistes **cochés** par défaut, mentions
     secondaires **décochées** (opt-in en un tap). L'utilisateur reste l'arbitre ;
     le défaut protège la base.
4. **Review par sections** — une carte repliable par contact, décochable entièrement,
   badge "nouveau" pour les contacts créés.
5. **Sauvegarde** — une note par contact retenu (portion de transcription pertinente,
   audio partagé). Sync inchangé.

---

## Décisions rejetées (et pourquoi)

- **Push serveur** — pas maintenant ; les notifs locales reprogrammées à l'ouverture
  suffisent au stade actuel.
- **Fallback provider OpenAI** — refusé explicitement.
- **Timing adaptatif des notifs** — opaque et overkill.
- **Écran de settings notifs par contact/par type** — un seul réglage global d'heures.
- **Relance post-événement orientée saisie** — la valeur est sociale, la donnée est un bonus.
- **Module cadeaux complet** (statuts, budgets, liens) — produit dans le produit.
- **Table de jointure note ↔ contacts (M2M)** — le split par l'IA préserve le modèle 1-N.
- **Nouveaux investissements sur memories/facts/contexte de rencontre** — poids mort relatif.
