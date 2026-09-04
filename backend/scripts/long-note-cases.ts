import { format, addDays } from 'date-fns';

/**
 * Notes longues, de densite croissante. Le banc principal ne contient qu'un
 * seul cas de ce type ; il en faut plusieurs pour situer le decrochage et
 * comparer des strategies.
 *
 * Volontairement en prose decousue : C4 du banc principal montre que six sujets
 * enumeres ("un... deux... trois...") passent sans peine. Ce qui coute, c'est
 * la dispersion, pas le nombre de mots.
 *
 * expectedTopics ne liste QUE ce qui merite un rappel, au sens de la regle 2 du
 * prompt. En sont exclus :
 *   - les habitudes regulieres, meme recemment reprises ("le velo tous les
 *     jours", "la basse une fois par semaine", "le festival tous les ans") ;
 *   - les evenements deja acheves et sans suite ("le chat a ete opere la
 *     semaine derniere, tout s'est bien passe").
 * La premiere version de ce fichier les comptait, et une mesure de rappel a
 * conclu a tort que le modele oubliait des sujets alors qu'il appliquait la
 * regle correctement.
 */

const now = new Date();
const IN = (n: number) => format(addDays(now, n), 'yyyy-MM-dd');

export type LongCase = {
  id: string;
  words: number;
  language: string;
  transcription: string;
  /** Marqueurs attendus : un sujet compte comme retrouve si l'un de ses mots-cles apparait. */
  expectedTopics: { label: string; keywords: string[] }[];
};

export const LONG_CASES: LongCase[] = [
  {
    id: 'L1-150mots-5sujets',
    words: 156,
    language: 'fr',
    transcription:
      "Bon, note un peu longue sur Yasmine parce qu'on a parlé deux heures. Alors déjà elle a changé de service, elle est passée au juridique le mois dernier, ça se passe bien. Ensuite elle m'a dit qu'elle avait un souci avec son proprio, il veut vendre l'appart, elle a trois mois pour partir. Du coup elle cherche à acheter, elle a un rendez-vous banque vendredi pour son prêt. Après on a parlé de son père, il se fait opérer du genou le 3 du mois prochain, elle va descendre à Toulouse pour être là. Elle m'a raconté aussi qu'elle s'était remise au piano, elle prend des cours le samedi, ça la détend. Ah et elle part en Grèce deux semaines en octobre avec ses soeurs, c'est réservé. Et le dernier truc, elle passe le TOEIC dans un mois pour son dossier de mutation. Voilà. Elle est en forme mais elle a beaucoup de choses en cours.",
    expectedTopics: [
      { label: 'départ de l appartement', keywords: ['proprio', 'appart', 'logement', 'partir'] },
      { label: 'achat / prêt', keywords: ['banque', 'pret', 'prêt', 'achat', 'acheter'] },
      { label: 'opération du père', keywords: ['genou', 'pere', 'père', 'operation', 'opération'] },
      { label: 'voyage Grèce', keywords: ['grece', 'grèce'] },
      { label: 'TOEIC', keywords: ['toeic'] },
    ],
  },
  {
    id: 'L2-230mots-7sujets',
    words: 233,
    language: 'fr',
    transcription:
      "Alors gros débrief sur Karim, on a mangé ensemble hier midi et il m'a déballé toute sa vie. Bon déjà côté boulot il est sur les nerfs, son manager part fin octobre et il pense candidater sur le poste, il hésite encore. En parallèle il m'a dit que sa boîte déménage les bureaux à La Défense en janvier, ça va lui rajouter quarante minutes de trajet, il est pas content. Côté perso sa copine et lui cherchent un chien, ils sont sur des listes d'adoption depuis six mois, toujours rien. Ah et ils se sont inscrits à un cours de cuisine italienne, ça commence la semaine prochaine, c'est elle qui a insisté. Il m'a parlé aussi de son dos, il a une IRM prévue le 12, il traîne ça depuis le printemps. Ensuite, sa soeur qui vit à Montréal revient en France pour de bon en février, ils sont super contents, ils vont l'aider à trouver un appart. Il m'a dit qu'il avait recommencé à jouer de la basse aussi, il a repris des cours en ligne. Et le truc que j'oubliais, il passe devant le tribunal dans quinze jours pour l'histoire de son ancien bailleur, celle dont il m'avait parlé l'an dernier. Voilà, il a beaucoup de choses en même temps mais il a l'air d'aller bien globalement.",
    expectedTopics: [
      { label: 'candidature poste manager', keywords: ['manager', 'poste', 'candidat', 'promotion'] },
      { label: 'déménagement des bureaux', keywords: ['defense', 'défense', 'bureaux', 'trajet'] },
      { label: 'adoption chien', keywords: ['chien', 'adoption'] },
      { label: 'cours de cuisine', keywords: ['cuisine'] },
      { label: 'IRM du dos', keywords: ['irm', 'dos'] },
      { label: 'retour de la soeur', keywords: ['soeur', 'sœur', 'montreal', 'montréal'] },
      { label: 'tribunal / bailleur', keywords: ['tribunal', 'bailleur', 'audience'] },
    ],
  },
  {
    id: 'L3-320mots-8sujets',
    words: 318,
    language: 'fr',
    transcription:
      "Ok alors note longue sur Hélène, on s'est vues samedi et franchement il s'en passe des choses chez elle. Déjà le plus gros : elle quitte son CDI en décembre, elle a posé sa démission, elle veut se lancer en indépendante dans la traduction. Elle a déjà deux clients pressentis. Du coup elle fait une formation de gestion en novembre, un truc court financé par son CPF. Ensuite, elle m'a annoncé que son fils Malo entre au collège à la rentrée et qu'ils hésitent entre deux établissements, ils visitent le second la semaine prochaine. Elle m'a aussi raconté que son compagnon a eu une proposition à Nantes, ils ne savent pas encore s'ils suivent, ça se décide avant Noël. Côté santé, elle a enfin obtenu un rendez-vous chez le spécialiste pour sa thyroïde, c'est le 18, elle attendait depuis huit mois. Elle a repris la natation aussi, deux fois par semaine, ça lui fait du bien. Ah et elle m'a dit qu'elle refaisait la salle de bain, les travaux commencent début octobre et devraient durer trois semaines, elle redoute le chantier. Sa mère par contre l'inquiète, elle perd un peu la tête et ils commencent à regarder des solutions d'accompagnement à domicile, elle a un rendez-vous avec une assistante sociale le mois prochain. Elle m'a parlé de son chat aussi qui a été opéré la semaine dernière, tout s'est bien passé. Et puis elle m'a dit qu'elle repartait au festival de Bourges en avril, elle y va tous les ans, c'est son truc. Enfin dernier point, elle attend une réponse pour une résidence d'écriture, elle a candidaté en juillet, réponse fin septembre. Voilà, énormément de choses, je voulais tout noter avant d'oublier.",
    expectedTopics: [
      { label: 'démission / passage indépendante', keywords: ['demission', 'démission', 'independant', 'indépendant', 'traduction', 'cdi'] },
      { label: 'formation gestion', keywords: ['formation', 'cpf', 'gestion'] },
      { label: 'collège du fils', keywords: ['college', 'collège', 'malo', 'etablissement', 'établissement'] },
      { label: 'proposition à Nantes', keywords: ['nantes'] },
      { label: 'rendez-vous thyroïde', keywords: ['thyroide', 'thyroïde', 'specialiste', 'spécialiste'] },
      { label: 'travaux salle de bain', keywords: ['salle de bain', 'travaux', 'chantier'] },
      { label: 'accompagnement de la mère', keywords: ['mere', 'mère', 'assistante sociale', 'domicile'] },
      { label: 'résidence d écriture', keywords: ['residence', 'résidence', 'ecriture', 'écriture', 'candidat'] },
    ],
  },
  {
    id: 'L4-430mots-10sujets',
    words: 428,
    language: 'fr',
    transcription:
      "Bon, note vraiment longue sur Damien, on a passé la soirée ensemble et il m'a tout raconté, je note tout tant que c'est frais. Alors déjà le truc principal : sa boîte est en redressement, ils ont appris ça il y a dix jours, il y aura des départs et il ne sait pas s'il est concerné, la décision tombe mi-novembre. Du coup il a recommencé à regarder des offres, il a déjà passé un premier entretien chez un éditeur de logiciels la semaine dernière, il attend un retour. En parallèle, sa femme Sonia est enceinte, ils l'ont su le mois dernier, le terme est prévu en mai, ils n'ont pas encore annoncé à la famille. Ils vont devoir déménager du coup, leur deux-pièces est trop petit, ils commencent les visites en octobre. Il m'a dit aussi qu'il avait repris le vélo pour aller au travail, tous les jours depuis septembre, il adore ça. Côté famille son père a fait une chute en août, il s'est remis mais ils lui cherchent une téléassistance, ils doivent trancher avant l'hiver. Sa soeur se marie le 6 juin, il est témoin, il stresse déjà pour le discours. Ah et il m'a raconté qu'il apprenait le japonais, il prend des cours par visio deux fois par semaine depuis un an, il compte passer le JLPT niveau 5 en décembre. Ensuite, ils ont un problème avec leur voiture, la boîte de vitesses est morte, le garagiste leur a fait un devis à deux mille euros, ils hésitent à la remplacer complètement. Il m'a dit qu'il avait aussi commencé une psychothérapie en juin, une fois par semaine, ça l'aide beaucoup. Et puis leur chien a un traitement au long cours pour ses articulations, contrôle prévu dans trois semaines. Dernier point, il a un projet de side-project avec un ancien collègue, une appli pour les clubs de sport amateur, ils se donnent jusqu'à janvier pour sortir une première version. Voilà, c'est vraiment chargé pour lui en ce moment mais il tient le coup, il m'a dit que le vélo et la thérapie l'aidaient beaucoup. Je le rappelle dans deux semaines pour prendre des nouvelles du boulot.",
    expectedTopics: [
      { label: 'redressement de la boîte', keywords: ['redressement', 'depart', 'départ', 'plan'] },
      { label: 'recherche d emploi / entretien', keywords: ['entretien', 'offres', 'editeur', 'éditeur', 'recherche'] },
      { label: 'grossesse de Sonia', keywords: ['enceinte', 'grossesse', 'bebe', 'bébé', 'terme', 'sonia'] },
      { label: 'déménagement', keywords: ['demenag', 'déménag', 'visites', 'deux-pieces', 'deux-pièces'] },
      { label: 'chute du père / téléassistance', keywords: ['teleassistance', 'téléassistance', 'pere', 'père', 'chute'] },
      { label: 'mariage de la soeur', keywords: ['mariage', 'temoin', 'témoin', 'discours'] },
      { label: 'JLPT japonais', keywords: ['jlpt', 'japonais'] },
      { label: 'boîte de vitesses', keywords: ['voiture', 'vitesses', 'garagiste', 'devis'] },
      { label: 'traitement du chien', keywords: ['chien', 'articulation'] },
      { label: 'side-project appli', keywords: ['side', 'appli', 'projet', 'clubs'] },
    ],
  },
];

export const IN_DAYS = IN;
