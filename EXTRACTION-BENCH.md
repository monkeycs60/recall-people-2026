# Banc d'essai `/api/extract`

Suite de 20 transcriptions annotées qui mesure la qualité d'extraction contre l'API réelle,
avec le prompt de production. Sert à arbitrer un changement de modèle **et** à détecter une
régression après une modification de `PROMPT_TEMPLATES` ou d'`extractionSchema`.

Les fichiers vivent dans `backend/scripts/` :

| Fichier | Rôle |
|---|---|
| `ab-cases.ts` | Les 20 transcriptions et leurs assertions |
| `ab-extract-models.ts` | Le runner : croise modèles × variantes de prompt, agrège les métriques |
| `diag-schema-failures.ts` | Rejoue un cas N fois et capture la **réponse brute** quand la validation échoue |
| `long-note-cases.ts` | 4 notes fleuves de 156 à 428 mots, pour l'étude dédiée |
| `long-note-strategies.ts` | Compare des stratégies d'extraction sur ces notes |

## Lancer le banc

```bash
cd backend

# Comparaison complète : tous les modèles, tous les prompts, 2 runs par cas
RUNS=2 CONCURRENCY=5 OUT=/tmp/ab.json \
  npx tsx --env-file=.env --env-file=.dev.vars scripts/ab-extract-models.ts

# Non-régression après une modif de prompt : modèle de prod seul
MODELS=gpt-oss PROMPTS=prod RUNS=3 \
  npx tsx --env-file=.env --env-file=.dev.vars scripts/ab-extract-models.ts

# Diagnostiquer un échec de schéma sur des cas précis
CASES=C10-english-recall,C5-double-resolution N=8 \
  npx tsx --env-file=.env --env-file=.dev.vars scripts/diag-schema-failures.ts
```

Variables : `RUNS`, `CONCURRENCY`, `TIMEOUT_MS`, `MODELS` (`gpt-oss`, `qwen`),
`PROMPTS` (`prod`, `recall`), `LAYOUTS` (`cache-first`, `legacy`), `OUT`, et pour le
diagnostic `MODEL`, `N`, `CASES`.

> Le banc appelle l'API Cerebras et le juge OpenAI pour de vrai. Une campagne complète
> (160 runs) coûte environ **1,20 $** et prend une dizaine de minutes.

## Ce qui est mesuré

| Mesure | Comment | Ce qu'elle attrape |
|---|---|---|
| **Assertions dures** | 4 à 10 vérifications programmatiques par cas : date ISO exacte attendue, email reconstitué, bon `existingTopicId` résolu, absence de faux hot topic | Objectif et reproductible. C'est la mesure qui tranche. |
| **Rappel des sujets** | `expectedTopics` déclaré par cas vs `hotTopics.length` | Les actualités oubliées ou fusionnées — invisible pour les assertions |
| **Succès du schéma** | Compte les `No object generated` | L'équivalent direct des retries de `generation-retry` |
| **Juge LLM** | `gpt-5-mini`, grille dérivée de `lib/evaluators.ts`, score /10 | La qualité rédactionnelle et les hallucinations subtiles |
| **Latence / coût** | Médiane, p95, tokens réels × grille tarifaire | Régression de performance ou de coût |

Le juge du banc est délibérément **un troisième modèle**, distinct des candidats comparés,
pour ne favoriser aucun d'eux. Il est indépendant de l'évaluateur de production
(`lib/evaluators.ts`), qui reste désactivé.

Les dates attendues sont **recalculées à chaque exécution** depuis la date du jour : le banc
ne périme pas et ses assertions restent valides dans un an.

## Les 20 cas

| ID | Tier | Langue | Sujets attendus |
|---|---|---|---|
| `S1-appart` | simple | fr | 1 |
| `S2-coordonnees` | simple | fr | 0 |
| `S3-loves` | simple | fr | 0 |
| `S4-metier` | simple | fr | 0 |
| `S5-gouts` | simple | fr | 0 |
| `S6-anniversaire` | simple | fr | 0 |
| `S7-meeting-en` | simple | en | 0 |
| `S8-email-dicte` | simple | fr | 0 |
| `C1-multi-resolution` | complex | fr | 4 |
| `C2-bruit-pronoms` | complex | fr | 3 |
| `C3-english-dense` | complex | en | 2 |
| `C4-rappel-5-sujets` | complex | fr | 5 |
| `C5-double-resolution` | complex | fr | 1 |
| `C6-espagnol` | complex | es | 3 |
| `C7-utilisateur-bavard` | complex | fr | 2 |
| `C8-dates-variees` | complex | fr | 4 |
| `C9-loves-vs-topics` | complex | fr | 2 |
| `C10-english-recall` | complex | en | 4 |
| `C11-note-fleuve` | complex | fr | 6 |
| `C12-fausse-resolution` | complex | fr | 1 |

Les cas simples vérifient qu'on ne casse pas le facile : un métier stable ou un hobby
hebdomadaire ne doit **pas** devenir un hot topic, un anniversaire non plus. Les cas complexes
tendent des pièges précis : confusion de pronoms (« je » = l'utilisateur, pas le contact),
résolution d'un topic existant sans en résoudre un autre, email dicté sans le symbole `@`,
dates relatives de toutes formes, et une note-fleuve de six sujets pour mesurer le rappel
sur contexte long.

## Ajouter un cas

Un cas déclare sa transcription, sa langue, le nombre d'actualités réellement présentes, et
ses assertions :

```ts
{
  id: 'C13-mon-cas', tier: 'complex', language: 'fr', expectedTopics: 2,
  transcription: "...",
  currentContact: { id: 'contact-x', firstName: 'X', lastName: null, hotTopics: [...] },
  checks: (o) => [
    { name: 'firstName=X', pass: has(o.contactIdentified.firstName, 'x'), got: o.contactIdentified.firstName },
    { name: `événement eventDate=${IN(7)}`, pass: topic(o, (t) => has(txt(t), 'mot') && t.eventDate === IN(7)), got: ... },
    noPastDates(o),
  ],
}
```

Les helpers `IN(n)`, `IN_M(n)`, `next(mois, jour)` calculent les dates attendues depuis la date
du jour. `noPastDates(o)` refuse toute `eventDate` antérieure à aujourd'hui.

## Métriques de référence — 4 septembre 2026

160 runs (20 cas × 2 modèles × 2 prompts × 2), après correction du contrat JSON et intégration
de la règle d'exhaustivité. **Ligne de référence pour les prochaines comparaisons.**

| Métrique | gpt-oss / prod | gpt-oss / v2 | qwen / prod | qwen / v2 |
|---|---|---|---|---|
| Succès du schéma | 100 % | 100 % | 100 % | 100 % |
| Rappel des sujets | 89 % | **93 %** | 84 % | 91 % |
| Juge moyen /10 | 8,25 | **8,30** | 8,07 | 8,20 |
| Assertions — simples | 96 % | 96 % | 96 % | 96 % |
| Assertions — complexes | **97 %** | 96 % | 94 % | 95 % |
| Latence médiane | **1 085 ms** | 1 160 ms | 1 196 ms | 1 223 ms |
| Coût / 1 000 extractions | **2,39 $** | 2,42 $ | 6,51 $ | 6,78 $ |

`prod` était alors le prompt du dépôt ; `v2` ajoutait la règle d'exhaustivité que le banc
injectait au moment du test.

**Cette règle est depuis intégrée à `PROMPT_TEMPLATES`.** Mesure de contrôle sur le prompt du
dépôt, 60 runs sur `gpt-oss` — c'est la ligne à battre :

| Succès schéma | Rappel | Juge | Simples | Complexes | Latence méd. | Coût / 1 000 |
|---|---|---|---|---|---|---|
| **100 %** (60/60) | **93 %** | **8,26** | 96 % | 97 % | 1 037 ms | 2,49 $ |

## Historique des décisions

**4 septembre 2026 — `qwen-3.8-27b` évalué puis écarté.** Le rapport de passation le proposait
en remplacement de `gpt-oss-120b` sur la foi d'un index d'intelligence doublé (52 vs 24) et
d'un taux de retries plus faible. Le banc a montré que le gain d'intelligence ne se traduit
par rien de mesurable sur nos extractions (juge 8,30 vs 8,20 en faveur de gpt-oss), pour un
coût 2,7 fois supérieur, et que le rappel de Qwen est **inférieur** parce qu'il fusionne les
actualités voisines. Son seul avantage — 100 % de succès de schéma contre 86 % — venait d'un
bug de notre prompt, pas du modèle.

Deux défauts de production ont été trouvés et corrigés à cette occasion :

1. **Dates d'exemple codées en dur.** `rule3Content` donnait ses exemples avec l'année 2026
   figée (« "en juin" → 2026-06-01 »). En septembre, tout mois déjà écoulé produisait un
   événement périmé : **9 `eventDate` sur 17 tombaient dans le passé**, donc autant de rappels
   qui ne se déclencheraient jamais. `buildDateExamples()` calcule désormais les exemples
   depuis la date du jour, avec la règle « prochaine occurrence à venir ».

2. **Contrat JSON incomplet.** Le bloc `FORMAT JSON` du prompt annonçait 5 champs quand
   `extractionSchema` en exigeait 7 : `meetingContext` et `loves` avaient été ajoutés au schéma
   sans l'être au prompt. gpt-oss suit le prompt, omet les deux champs, et la validation Zod
   rejette — **14 % de retries**. Reproductible à `temperature: 0` : 8 échecs sur 8 sur
   `C10-english-recall`, 0 sur 24 après correction. `test/prompt-schema-contract.test.mjs`
   empêche cette dérive de revenir.

L'argument **vision** de Qwen (images en entrée, donc scan de carte de visite) n'a pas été
tranché ici : il reste valable et indépendant de ces résultats, mais n'est pas jugé prioritaire.

## Disposition du prompt et cache Cerebras — 5 septembre 2026

**Essayé puis abandonné.** L'idée était de grouper en tête tout ce qui ne varie pas d'une requête
à l'autre et de passer la transcription en fin de prompt, pour que le préfixe commun atteigne
95 % du prompt au lieu du onzième centile.

Mesuré sur 60 runs par disposition, avant abandon :

| | cache-first | legacy |
|---|---|---|
| Tokens d'entrée en cache | **93 %** | 37 % |
| Latence médiane / p95 | **1 005 ms** / 1 739 ms | 1 057 ms / 1 896 ms |
| Assertions complexes | 97 % | 96 % |
| Rappel | 93 % | 94 % |
| Juge | 8,22 | 8,25 |

La qualité est identique à effectif égal. Mais **le cache n'apporte aucune économie** : la
documentation Cerebras précise que les tokens d'entrée sont facturés au tarif standard qu'ils
viennent du cache ou non. Le gain est la latence (~5 %) et le fait que les tokens cachés ne
comptent pas dans la limite TPM non-cachée. TTL d'au moins 5 minutes, blocs de 128 tokens,
automatique. Un gain de 5 % de latence ne justifiait pas de réorganiser le prompt : la
disposition historique a été rétablie.

Une variante également abandonnée : répéter les consignes de sécurité **après** la
transcription, pour retrouver la posture anti-injection de `legacy` où les règles suivaient
l'entrée utilisateur. Elle coûte 3 points de rappel à effectif égal (90 % contre 93 % sur
60 runs, 88 % sur un autre échantillon de 40). La protection qui compte reste `wrapUserInput`
et ses délimiteurs aléatoires, inchangée.

## Notes longues — étude du 5 septembre 2026

Quatre notes de 156 à 428 mots, 6 à 12 sujets, en prose décousue. Rappel par stratégie, 3 runs :

| Stratégie | 156 m | 233 m | 318 m | 428 m | Global | Coût / 1 000 | Latence méd. |
|---|---|---|---|---|---|---|---|
| baseline (production) | 83 % | 92 % | 93 % | 89 % | 90 % | 3,58 $ | 1 679 ms |
| reasoning high | — | 94 % | — | 92 % | 93 % | 18,42 $ | 20 088 ms |
| inventaire puis extraction | 100 % | 100 % | 90 % | 92 % | 94 % | 4,06 $ | 2 125 ms |
| extraction puis complétion | 83 % | 96 % | 93 % | 86 % | 90 % | 7,24 $ | 3 542 ms |

**Aucune stratégie n'a été retenue**, pour trois raisons.

1. **Le rappel ne décroît pas avec la longueur** (83 / 92 / 93 / 89 %). La note la plus courte
   est la pire. Il n'y a donc pas de seuil de mots à détecter : un déclencheur « note fleuve »
   instrumenterait un phénomène qui n'existe pas. Ce qui coûte, c'est la dispersion des sujets
   dans la prose, pas le nombre de mots — `C4-rappel-5-sujets` du banc principal sort 5 sujets
   sur 5 avec 85 mots parce qu'ils y sont énumérés.

2. **`reasoning high` est inutilisable** : 9 runs sur 12 échouent en `No output generated`, et
   20 s de latence médiane, très au-delà de l'abort à 15 s de la route. Son 93 % n'est calculé
   que sur les survivants.

3. **L'étalon sur-comptait.** Les sujets le plus souvent « manqués » — vélo quotidien,
   psychothérapie hebdomadaire, reprise de la basse, opération du chat déjà faite, changement
   de service déjà effectué — sont exactement ce que la règle 2 exclut : habitudes régulières
   et événements passés terminés. Le modèle a raison, la liste attendue avait tort.

Le seul défaut réel qui subsiste est la **fusion de facettes** : sur `L1`, « le proprio veut
vendre », « trois mois pour partir » et « cherche à acheter » deviennent un ou deux hot topics
au lieu de trois. La stratégie d'inventaire gagne en fusionnant moins, mais sur-découpe en
retour — elle produit « Propriétaire veut vendre » *et* « Délai départ appartement » pour une
même situation, ce qui donnerait deux rappels doublons à l'utilisateur.

**Avant toute nouvelle itération sur ce sujet**, corriger `expectedTopics` dans
`long-note-cases.ts` pour en retirer les habitudes régulières et les événements terminés.
Sinon toute mesure future répétera le même biais.

## Une situation, plusieurs échéances — 5 septembre 2026

Défaut résiduel après la règle d'exhaustivité : le modèle reconnaissait bien une situation mais
la rendait en un seul hot topic là où elle porte plusieurs échéances distinctes. « Le proprio
veut vendre, trois mois pour partir, rendez-vous banque vendredi » donnait un topic au lieu de
trois — donc un seul rappel pour trois échéances.

Une règle a été ajoutée aux cinq langues, avec son test explicite : *si deux éléments méritent
des rappels à des moments différents, ce sont deux hot topics*.

| | sans la règle | règle seule | règle + gardes |
|---|---|---|---|
| **Rappel des sujets** | 93 % | **96 %** | **96 %** |
| Assertions simples | 96 % | 95 % | 96 % |
| Assertions complexes | 97 % | 95 % | 96 % |
| Échecs d'assertion (sur ~1 500) | 11 | 17 | 14 |
| Juge | 8,26 | 8,25 | 8,02 |
| Coût / 1 000 | 2,49 $ | 2,56 $ | 2,57 $ |

La règle seule gagne 3 points de rappel mais **crée des doublons** : elle recréait un hot topic
déjà listé dans les actualités existantes auquel la note n'ajoutait rien (`C12`, 2 occurrences
sur 3 runs) et inventait un hot topic sur une note qui n'en contient aucun (`S2`). En
production, ce sont des rappels en double pour le même événement.

Deux gardes ont donc été ajoutées : la règle **découpe** une situation réellement présente, elle
n'autorise ni à inventer une échéance non mentionnée, ni à recréer une actualité existante à
laquelle la note n'ajoute rien de neuf. Les trois régressions ciblées disparaissent.

**Décision : la règle n'est PAS retenue.** Elle a été intégrée, déployée, puis retirée le même
jour. Le rappel montait de 3 points et s'y tenait sur deux mesures indépendantes, les assertions
revenaient à 3 échecs près de la baseline, mais le juge ne corroborait pas : 8,37 / 8,25 / 8,02
sur des prompts très proches, avec la version finale la plus basse des trois.

Deux lectures restaient possibles et le banc ne permettait pas de trancher entre elles à n=60 :
soit le juge mesure une dégradation réelle que les assertions ne voient pas, soit ces trois
valeurs sont son bruit. Face à cette ambiguïté, le choix a été de rester sur la configuration
dont la qualité est la mieux établie plutôt que d'expédier un gain de rappel dont le prix reste
inconnu.

**Pour reprendre ce sujet**, il faut d'abord établir le bruit du juge : faire tourner deux fois
la même configuration à n=60 et regarder l'écart entre les deux. Tant qu'on ignore si 0,24 point
est significatif, aucune comparaison de prompt qui se joue à cette échelle n'est concluante. La
règle et ses gardes restent dans l'historique git (`d37b7bb`) pour être reprises telles quelles.
