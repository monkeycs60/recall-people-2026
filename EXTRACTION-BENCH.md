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
`PROMPTS` (`prod`, `recall`), `OUT`, et pour le diagnostic `MODEL`, `N`, `CASES`.

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

**Cette règle est depuis intégrée à `PROMPT_TEMPLATES`.** Mesure de contrôle après intégration,
60 runs sur `gpt-oss` avec le prompt du dépôt — c'est la ligne à battre :

| Succès schéma | Rappel | Juge | Simples | Complexes | Latence méd. | Coût / 1 000 |
|---|---|---|---|---|---|---|
| **100 %** (60/60) | **94 %** | **8,32** | 96 % | 96 % | 1 132 ms | 2,49 $ |

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
