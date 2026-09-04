import { format, addDays, addMonths } from 'date-fns';
import type { buildExtractionPrompt } from '../src/routes/extract';

const now = new Date();
const D = (d: Date) => format(d, 'yyyy-MM-dd');
export const TODAY = D(now);
const IN = (n: number) => D(addDays(now, n));
const IN_M = (n: number) => D(addMonths(now, n));

/** Prochaine occurrence a venir d'un mois/jour, meme convention que le prompt. */
const next = (month: number, day: number): string => {
  const same = new Date(Date.UTC(now.getUTCFullYear(), month - 1, day));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return format(
    same.getTime() < today ? new Date(Date.UTC(now.getUTCFullYear() + 1, month - 1, day)) : same,
    'yyyy-MM-dd'
  );
};

export type Check = { name: string; pass: boolean; got?: unknown };

export type Extraction = {
  contactIdentified: { firstName: string; lastName: string | null; confidence: string };
  noteTitle: string;
  contactInfo: {
    phone: string | null;
    email: string | null;
    birthday: { day: number; month: number; year: number | null } | null;
  };
  meetingContext: string | null;
  loves: string[];
  hotTopics: { title: string; context: string; eventDate: string | null }[];
  resolvedTopics: { existingTopicId: string; resolution: string }[];
};

export type Case = {
  id: string;
  tier: 'simple' | 'complex';
  language: string;
  transcription: string;
  currentContact?: Parameters<typeof buildExtractionPrompt>[1];
  /** Nombre d'actualites distinctes reellement presentes : mesure le rappel. */
  expectedTopics: number;
  checks: (o: Extraction) => Check[];
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const has = (hay: string, needle: string) => norm(hay).includes(norm(needle));
const topic = (o: Extraction, p: (t: Extraction['hotTopics'][number]) => boolean) => o.hotTopics.some(p);
const txt = (t: { title: string; context: string }) => t.title + ' ' + t.context;
const digits = (s: string | null) => (s || '').replace(/\D/g, '');
const noPastDates = (o: Extraction): Check => ({
  name: 'aucune eventDate dans le passe',
  pass: o.hotTopics.every((t) => !t.eventDate || t.eventDate >= TODAY),
  got: o.hotTopics.map((t) => t.eventDate),
});

export const CASES: Case[] = [
  // ---------- SIMPLES ----------
  {
    id: 'S1-appart', tier: 'simple', language: 'fr', expectedTopics: 1,
    transcription: "J'ai croisé Marie ce matin au marché, elle m'a dit qu'elle cherche un appartement sur Lyon en ce moment.",
    checks: (o) => [
      { name: 'firstName=Marie', pass: has(o.contactIdentified.firstName, 'marie'), got: o.contactIdentified.firstName },
      { name: '1 hot topic appart', pass: o.hotTopics.length === 1 && topic(o, (t) => has(txt(t), 'appart')), got: o.hotTopics.map((t) => t.title) },
      { name: 'pas de date inventee', pass: o.hotTopics.every((t) => t.eventDate === null), got: o.hotTopics.map((t) => t.eventDate) },
      { name: 'titre non generique', pass: !/^(discussion|nouvelles|rattrapage|point)$/i.test(o.noteTitle.trim()), got: o.noteTitle },
    ],
  },
  {
    id: 'S2-coordonnees', tier: 'simple', language: 'fr', expectedTopics: 0,
    transcription: "Thomas m'a donné son numéro, c'est le 06 12 34 56 78, et son anniversaire c'est le 12 mars 1990.",
    checks: (o) => [
      { name: 'firstName=Thomas', pass: has(o.contactIdentified.firstName, 'thomas'), got: o.contactIdentified.firstName },
      { name: 'phone 0612345678', pass: digits(o.contactInfo.phone).endsWith('0612345678'), got: o.contactInfo.phone },
      { name: 'birthday 12/3/1990', pass: o.contactInfo.birthday?.day === 12 && o.contactInfo.birthday?.month === 3 && o.contactInfo.birthday?.year === 1990, got: o.contactInfo.birthday },
      { name: 'aucun hot topic', pass: o.hotTopics.length === 0, got: o.hotTopics.map((t) => t.title) },
    ],
  },
  {
    id: 'S3-loves', tier: 'simple', language: 'fr', expectedTopics: 0,
    transcription: "Café avec Sophie hier. Elle adore la céramique et elle ne jure que par les cafés calmes sans musique.",
    checks: (o) => [
      { name: 'firstName=Sophie', pass: has(o.contactIdentified.firstName, 'sophie'), got: o.contactIdentified.firstName },
      { name: 'loves ceramique', pass: o.loves.some((l) => has(l, 'ceramique')), got: o.loves },
      { name: 'loves cafes calmes', pass: o.loves.some((l) => has(l, 'calme')), got: o.loves },
      { name: 'aucun hot topic', pass: o.hotTopics.length === 0, got: o.hotTopics.map((t) => t.title) },
    ],
  },
  {
    id: 'S4-metier', tier: 'simple', language: 'fr', expectedTopics: 0,
    transcription: "Je viens de rencontrer Léa à la salle de sport, elle est kiné dans le 15ème depuis six ans.",
    checks: (o) => [
      { name: 'firstName=Lea', pass: has(o.contactIdentified.firstName, 'lea'), got: o.contactIdentified.firstName },
      { name: 'metier stable != hot topic', pass: o.hotTopics.length === 0, got: o.hotTopics.map((t) => t.title) },
      { name: 'meetingContext = salle de sport', pass: !!o.meetingContext && has(o.meetingContext, 'sport'), got: o.meetingContext },
    ],
  },
  {
    id: 'S5-gouts', tier: 'simple', language: 'fr', expectedTopics: 0,
    transcription: "Note pour moi : Nico déteste le poisson, et il adore les jeux de société, surtout les jeux de stratégie.",
    checks: (o) => [
      { name: 'firstName=Nico', pass: has(o.contactIdentified.firstName, 'nico'), got: o.contactIdentified.firstName },
      { name: 'loves jeux de societe', pass: o.loves.some((l) => has(l, 'jeu')), got: o.loves },
      { name: 'aucun hot topic', pass: o.hotTopics.length === 0, got: o.hotTopics.map((t) => t.title) },
      { name: 'aucune date', pass: o.hotTopics.every((t) => t.eventDate === null), got: o.hotTopics.map((t) => t.eventDate) },
    ],
  },
  {
    id: 'S6-anniversaire', tier: 'simple', language: 'fr', expectedTopics: 0,
    transcription: "L'anniversaire de Clara c'est le 8 juillet, faut que je pense à lui souhaiter cette année.",
    checks: (o) => [
      { name: 'firstName=Clara', pass: has(o.contactIdentified.firstName, 'clara'), got: o.contactIdentified.firstName },
      { name: 'birthday 8/7 sans annee', pass: o.contactInfo.birthday?.day === 8 && o.contactInfo.birthday?.month === 7 && o.contactInfo.birthday?.year === null, got: o.contactInfo.birthday },
      { name: 'anniversaire != hot topic', pass: o.hotTopics.length === 0, got: o.hotTopics.map((t) => t.title) },
    ],
  },
  {
    id: 'S7-meeting-en', tier: 'simple', language: 'en', expectedTopics: 0,
    transcription: "Met Dave at the Paris fintech conference last week. He works at Stripe on the payments team.",
    checks: (o) => [
      { name: 'firstName=Dave', pass: has(o.contactIdentified.firstName, 'dave'), got: o.contactIdentified.firstName },
      { name: 'meetingContext = conference', pass: !!o.meetingContext && has(o.meetingContext, 'conference'), got: o.meetingContext },
      { name: 'emploi stable != hot topic', pass: o.hotTopics.length === 0, got: o.hotTopics.map((t) => t.title) },
      { name: 'reponse en anglais', pass: !/[éèêàçù]/i.test(JSON.stringify(o)), got: o.noteTitle },
    ],
  },
  {
    id: 'S8-email-dicte', tier: 'simple', language: 'fr', expectedTopics: 0,
    transcription: "Sarah m'a donné son mail pour le devis, c'est s.dupont arobase orange point fr.",
    checks: (o) => [
      { name: 'firstName=Sarah', pass: has(o.contactIdentified.firstName, 'sarah'), got: o.contactIdentified.firstName },
      { name: 'email s.dupont@orange.fr', pass: (o.contactInfo.email || '').toLowerCase() === 's.dupont@orange.fr', got: o.contactInfo.email },
    ],
  },

  // ---------- COMPLEXES ----------
  {
    id: 'C1-multi-resolution', tier: 'complex', language: 'fr', expectedTopics: 4,
    transcription: "Alors gros point sur Camille. Elle m'a rappelé hier soir : elle a eu la réponse de Google, elle est prise, elle commence en mars et c'est sur le poste de staff engineer. Du coup elle m'a dit qu'elle allait déménager, elle vise Lyon, elle a une visite d'appart la semaine prochaine. Ah et elle m'a redonné son mail parce que l'ancien ne marche plus, c'est camille.durand arobase proton.me. Elle passe aussi son permis moto dans trois semaines, elle stresse à mort. Et son frère se marie en juin, elle m'a invité.",
    currentContact: {
      id: 'contact-camille', firstName: 'Camille', lastName: 'Durand',
      hotTopics: [
        { id: 'topic-google', title: 'Entretien Google', context: 'Process en cours pour un poste senior' },
        { id: 'topic-perm', title: 'Permis moto', context: 'Formation commencée en juillet' },
      ],
    } as Parameters<typeof buildExtractionPrompt>[1],
    checks: (o) => [
      { name: 'firstName=Camille', pass: has(o.contactIdentified.firstName, 'camille'), got: o.contactIdentified.firstName },
      { name: 'email camille.durand@proton.me', pass: (o.contactInfo.email || '').toLowerCase() === 'camille.durand@proton.me', got: o.contactInfo.email },
      { name: 'resout topic-google', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-google'), got: o.resolvedTopics.map((r) => r.existingTopicId) },
      { name: 'resolution detaillee (mars)', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-google' && has(r.resolution, 'mars')), got: o.resolvedTopics },
      { name: 'ne resout PAS topic-perm', pass: !o.resolvedTopics.some((r) => r.existingTopicId === 'topic-perm'), got: o.resolvedTopics.map((r) => r.existingTopicId) },
      { name: 'topic demenagement Lyon', pass: topic(o, (t) => has(txt(t), 'lyon') || has(txt(t), 'demenag')), got: o.hotTopics.map((t) => t.title) },
      { name: `visite appart eventDate=${IN(7)}`, pass: topic(o, (t) => has(txt(t), 'appart') && t.eventDate === IN(7)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `permis moto eventDate=${IN(21)}`, pass: topic(o, (t) => has(txt(t), 'moto') && t.eventDate === IN(21)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `mariage frere eventDate=${next(6, 1)}`, pass: topic(o, (t) => has(txt(t), 'mariage') && t.eventDate === next(6, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      noPastDates(o),
    ],
  },
  {
    id: 'C2-bruit-pronoms', tier: 'complex', language: 'fr', expectedTopics: 3,
    transcription: "Bon alors euh... j'ai vu Julien au pot de départ de Nadia jeudi, enfin non c'était mercredi je crois. Bref. Moi je lui ai raconté que je changeais de boîte, lui il s'en fout un peu. Par contre il m'a dit que sa femme est enceinte, ça tombe fin février, et que du coup ils cherchent une nourrice, c'est la galère. Ah oui et il fait de l'escalade tous les mardis depuis dix ans, ça c'est son truc. Il m'a dit aussi qu'il repartait au Japon cet été, il adore ce pays, c'est la quatrième fois. On s'était rencontrés à la fac de Nanterre en 2014 d'ailleurs.",
    checks: (o) => [
      { name: 'firstName=Julien', pass: has(o.contactIdentified.firstName, 'julien'), got: o.contactIdentified.firstName },
      { name: `grossesse eventDate=${next(2, 28)}`, pass: topic(o, (t) => (has(txt(t), 'enceinte') || has(txt(t), 'grossesse') || has(txt(t), 'bebe') || has(txt(t), 'naissance')) && t.eventDate === next(2, 28)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'topic recherche nourrice', pass: topic(o, (t) => has(txt(t), 'nourrice')), got: o.hotTopics.map((t) => t.title) },
      { name: 'escalade PAS un hot topic', pass: !topic(o, (t) => has(txt(t), 'escalade')), got: o.hotTopics.map((t) => t.title) },
      { name: 'escalade ou Japon dans loves', pass: o.loves.some((l) => has(l, 'escalade') || has(l, 'japon')), got: o.loves },
      { name: 'changement de boite = utilisateur, ignore', pass: !topic(o, (t) => has(txt(t), 'change de boite') || has(txt(t), 'changement de boite')), got: o.hotTopics.map((t) => t.title) },
      { name: 'meetingContext = fac Nanterre', pass: !!o.meetingContext && has(o.meetingContext, 'nanterre'), got: o.meetingContext },
      { name: `voyage Japon eventDate=${next(7, 1)}`, pass: !topic(o, (t) => has(txt(t), 'japon')) || topic(o, (t) => has(txt(t), 'japon') && t.eventDate === next(7, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      noPastDates(o),
    ],
  },
  {
    id: 'C3-english-dense', tier: 'complex', language: 'en', expectedTopics: 2,
    transcription: "Quick catch-up with Priya. She told me her startup finally closed the seed round, two point one million, led by Kima, so the fundraising thing is done. She's hiring two engineers before the end of the year. She's also moving to Berlin in three months, her partner got a job at Zalando. Her birthday is on the 3rd of November by the way. And she said she'd send me the deck at priya.n gmail dot com. She's really into free diving and vinyl records.",
    currentContact: {
      id: 'contact-priya', firstName: 'Priya', lastName: null,
      hotTopics: [{ id: 'topic-seed', title: 'Seed fundraising', context: 'Raising a seed round for her startup' }],
    } as Parameters<typeof buildExtractionPrompt>[1],
    checks: (o) => [
      { name: 'firstName=Priya', pass: has(o.contactIdentified.firstName, 'priya'), got: o.contactIdentified.firstName },
      { name: 'resout topic-seed', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-seed'), got: o.resolvedTopics.map((r) => r.existingTopicId) },
      { name: 'resolution chiffree (2.1M / Kima)', pass: o.resolvedTopics.some((r) => has(r.resolution, '2.1') || has(r.resolution, '2,1') || has(r.resolution, 'kima') || has(r.resolution, '2 100')), got: o.resolvedTopics },
      { name: 'email priya.n@gmail.com', pass: (o.contactInfo.email || '').toLowerCase() === 'priya.n@gmail.com', got: o.contactInfo.email },
      { name: 'birthday 3/11', pass: o.contactInfo.birthday?.day === 3 && o.contactInfo.birthday?.month === 11, got: o.contactInfo.birthday },
      { name: `moving Berlin eventDate=${IN_M(3)}`, pass: topic(o, (t) => has(txt(t), 'berlin') && t.eventDate === IN_M(3)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'topic hiring engineers', pass: topic(o, (t) => has(txt(t), 'hiring') || has(txt(t), 'engineer')), got: o.hotTopics.map((t) => t.title) },
      { name: 'loves free diving + vinyl', pass: o.loves.some((l) => has(l, 'diving')) && o.loves.some((l) => has(l, 'vinyl')), got: o.loves },
      { name: 'reponse en anglais', pass: !/[éèêàçù]/i.test(JSON.stringify(o)), got: o.noteTitle },
      noPastDates(o),
    ],
  },
  {
    id: 'C4-rappel-5-sujets', tier: 'complex', language: 'fr', expectedTopics: 5,
    transcription: "Long déjeuner avec Antoine, il m'a tout raconté. Un, il passe son oral de concours dans dix jours, il révise comme un dingue. Deux, sa mère est hospitalisée depuis lundi, ils attendent les résultats. Trois, il vend sa voiture, il a mis l'annonce le week-end dernier. Quatre, il part en Islande le 20 décembre avec sa copine. Et cinq, il monte une asso de réparation de vélos avec deux potes, ils déposent les statuts le mois prochain. Voilà, c'est chargé en ce moment pour lui.",
    checks: (o) => [
      { name: 'firstName=Antoine', pass: has(o.contactIdentified.firstName, 'antoine'), got: o.contactIdentified.firstName },
      { name: 'les 5 sujets sont presents', pass: o.hotTopics.length >= 5, got: o.hotTopics.length },
      { name: `oral concours eventDate=${IN(10)}`, pass: topic(o, (t) => (has(txt(t), 'oral') || has(txt(t), 'concours')) && t.eventDate === IN(10)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'topic hospitalisation mere', pass: topic(o, (t) => has(txt(t), 'hospital') || has(txt(t), 'mere')), got: o.hotTopics.map((t) => t.title) },
      { name: 'topic vente voiture', pass: topic(o, (t) => has(txt(t), 'voiture')), got: o.hotTopics.map((t) => t.title) },
      { name: `Islande eventDate=${next(12, 20)}`, pass: topic(o, (t) => has(txt(t), 'islande') && t.eventDate === next(12, 20)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'topic asso velos', pass: topic(o, (t) => has(txt(t), 'asso') || has(txt(t), 'velo')), got: o.hotTopics.map((t) => t.title) },
      noPastDates(o),
    ],
  },
  {
    id: 'C5-double-resolution', tier: 'complex', language: 'fr', expectedTopics: 1,
    transcription: "Des nouvelles de Fatou : elle a soutenu sa thèse vendredi, mention très honorable avec félicitations du jury. Et elle a enfin signé pour la maison de Bordeaux, la vente est passée mardi. Par contre le dossier de naturalisation traîne toujours, rien de neuf. Elle m'a dit qu'elle organisait une crémaillère mi-novembre.",
    currentContact: {
      id: 'contact-fatou', firstName: 'Fatou', lastName: null,
      hotTopics: [
        { id: 'topic-these', title: 'Soutenance de thèse', context: 'Doit soutenir cet automne' },
        { id: 'topic-maison', title: 'Achat maison Bordeaux', context: 'Compromis signé, attend le notaire' },
        { id: 'topic-natu', title: 'Dossier naturalisation', context: 'Déposé au printemps' },
      ],
    } as Parameters<typeof buildExtractionPrompt>[1],
    checks: (o) => [
      { name: 'resout topic-these', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-these'), got: o.resolvedTopics.map((r) => r.existingTopicId) },
      { name: 'resout topic-maison', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-maison'), got: o.resolvedTopics.map((r) => r.existingTopicId) },
      { name: 'ne resout PAS topic-natu', pass: !o.resolvedTopics.some((r) => r.existingTopicId === 'topic-natu'), got: o.resolvedTopics.map((r) => r.existingTopicId) },
      { name: 'resolution these detaillee (mention)', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-these' && (has(r.resolution, 'felicitations') || has(r.resolution, 'honorable'))), got: o.resolvedTopics },
      { name: `cremaillere eventDate=${next(11, 15)}`, pass: topic(o, (t) => has(txt(t), 'cremaillere') && t.eventDate === next(11, 15)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      noPastDates(o),
    ],
  },
  {
    id: 'C6-espagnol', tier: 'complex', language: 'es', expectedTopics: 3,
    transcription: "Hablé con Lucía ayer. Me dijo que deja su trabajo en el banco a final de mes, ya avisó. Va a montar una tienda de plantas con su hermana, abren en enero si todo va bien. Su hija empieza el colegio la semana que viene y está muy nerviosa. Ah, y me pasó su teléfono nuevo, es el 612 33 44 55. Le encanta la cerámica y el senderismo.",
    checks: (o) => [
      { name: 'firstName=Lucia', pass: has(o.contactIdentified.firstName, 'lucia'), got: o.contactIdentified.firstName },
      { name: 'phone 612334455', pass: digits(o.contactInfo.phone).endsWith('612334455'), got: o.contactInfo.phone },
      { name: 'topic dejar el banco', pass: topic(o, (t) => has(txt(t), 'banco') || has(txt(t), 'trabajo')), got: o.hotTopics.map((t) => t.title) },
      { name: `tienda plantas eventDate=${next(1, 1)}`, pass: topic(o, (t) => has(txt(t), 'tienda') || has(txt(t), 'plantas')) && topic(o, (t) => (has(txt(t), 'tienda') || has(txt(t), 'plantas')) && t.eventDate === next(1, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `colegio hija eventDate=${IN(7)}`, pass: topic(o, (t) => (has(txt(t), 'colegio') || has(txt(t), 'hija')) && t.eventDate === IN(7)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'loves ceramica + senderismo', pass: o.loves.some((l) => has(l, 'ceramica')) && o.loves.some((l) => has(l, 'senderismo')), got: o.loves },
      noPastDates(o),
    ],
  },
  {
    id: 'C7-utilisateur-bavard', tier: 'complex', language: 'fr', expectedTopics: 2,
    transcription: "Alors moi je suis crevé, j'ai bossé tout le week-end sur mon dossier, et j'ai encore mon rendez-vous chez le dentiste jeudi. Enfin bref. J'ai appelé Malik. Lui, il m'a dit qu'il se lance en freelance le mois prochain, il quitte son CDI. Et il m'a raconté qu'il déménageait pas finalement, il reste à Montreuil. Moi je lui ai dit que je viendrais le voir. Il fait toujours son foot le dimanche.",
    currentContact: {
      id: 'contact-malik', firstName: 'Malik', lastName: null,
      hotTopics: [{ id: 'topic-demenagement', title: 'Déménagement', context: 'Envisage de quitter Montreuil' }],
    } as Parameters<typeof buildExtractionPrompt>[1],
    checks: (o) => [
      { name: 'firstName=Malik', pass: has(o.contactIdentified.firstName, 'malik'), got: o.contactIdentified.firstName },
      { name: 'dentiste = utilisateur, ignore', pass: !topic(o, (t) => has(txt(t), 'dentiste')), got: o.hotTopics.map((t) => t.title) },
      { name: 'dossier week-end = utilisateur, ignore', pass: !topic(o, (t) => has(txt(t), 'dossier')), got: o.hotTopics.map((t) => t.title) },
      { name: 'topic passage freelance', pass: topic(o, (t) => has(txt(t), 'freelance')), got: o.hotTopics.map((t) => t.title) },
      { name: 'resout topic-demenagement (annule)', pass: o.resolvedTopics.some((r) => r.existingTopicId === 'topic-demenagement'), got: o.resolvedTopics },
      { name: 'foot dominical != hot topic', pass: !topic(o, (t) => has(txt(t), 'foot')), got: o.hotTopics.map((t) => t.title) },
      noPastDates(o),
    ],
  },
  {
    id: 'C8-dates-variees', tier: 'complex', language: 'fr', expectedTopics: 4,
    transcription: "Point sur Hugo. Il a son scanner de contrôle le 15, il m'a dit qu'il flippait. Il part à Marrakech dans dix jours pour le mariage d'un cousin. Sa boîte annonce un plan social en janvier, il est sur la liste apparemment. Et il commence sa formation d'ébéniste au printemps.",
    checks: (o) => [
      { name: 'firstName=Hugo', pass: has(o.contactIdentified.firstName, 'hugo'), got: o.contactIdentified.firstName },
      { name: 'les 4 sujets presents', pass: o.hotTopics.length >= 4, got: o.hotTopics.length },
      { name: 'scanner date au 15 du mois', pass: topic(o, (t) => has(txt(t), 'scanner') && !!t.eventDate && t.eventDate.endsWith('-15')), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `Marrakech eventDate=${IN(10)}`, pass: topic(o, (t) => has(txt(t), 'marrakech') && t.eventDate === IN(10)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `plan social eventDate=${next(1, 1)}`, pass: topic(o, (t) => (has(txt(t), 'plan social') || has(txt(t), 'licenciement')) && t.eventDate === next(1, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `formation eventDate=${next(3, 1)}`, pass: topic(o, (t) => (has(txt(t), 'formation') || has(txt(t), 'ebenist')) && t.eventDate === next(3, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      noPastDates(o),
    ],
  },
  {
    id: 'C9-loves-vs-topics', tier: 'complex', language: 'fr', expectedTopics: 2,
    transcription: "Dîner chez Inès. Elle adore cuisiner thaï, c'est son truc depuis toujours, et elle collectionne les vinyles de jazz. Là elle prépare un semi-marathon en octobre, elle court quatre fois par semaine. Elle m'a dit aussi qu'elle repassait son permis en novembre, elle l'a perdu l'an dernier.",
    checks: (o) => [
      { name: 'firstName=Ines', pass: has(o.contactIdentified.firstName, 'ines'), got: o.contactIdentified.firstName },
      { name: 'loves cuisine thai', pass: o.loves.some((l) => has(l, 'thai') || has(l, 'cuisine')), got: o.loves },
      { name: 'loves vinyles jazz', pass: o.loves.some((l) => has(l, 'vinyle') || has(l, 'jazz')), got: o.loves },
      { name: `semi-marathon eventDate=${next(10, 1)}`, pass: topic(o, (t) => (has(txt(t), 'semi') || has(txt(t), 'marathon')) && t.eventDate === next(10, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `permis eventDate=${next(11, 1)}`, pass: topic(o, (t) => has(txt(t), 'permis') && t.eventDate === next(11, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'cuisine/vinyles PAS des hot topics', pass: !topic(o, (t) => has(txt(t), 'vinyle') || has(txt(t), 'thai')), got: o.hotTopics.map((t) => t.title) },
      noPastDates(o),
    ],
  },
  {
    id: 'C10-english-recall', tier: 'complex', language: 'en', expectedTopics: 4,
    transcription: "Long call with Marcus. His visa renewal is stuck, the lawyer said it could take until February. He's presenting at a conference in Lisbon on the 12th of next month, first time keynoting. His dog had surgery last Tuesday and is recovering fine. He's also thinking of buying a boat, he's been looking at listings for weeks. Oh and he finally quit smoking, three months clean now. His number changed, it's plus four four seven seven double six one two three four double five.",
    checks: (o) => [
      { name: 'firstName=Marcus', pass: has(o.contactIdentified.firstName, 'marcus'), got: o.contactIdentified.firstName },
      { name: 'au moins 4 sujets', pass: o.hotTopics.length >= 4, got: o.hotTopics.length },
      { name: `visa eventDate=${next(2, 1)}`, pass: topic(o, (t) => has(txt(t), 'visa') && t.eventDate === next(2, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'topic Lisbon keynote', pass: topic(o, (t) => has(txt(t), 'lisbon') || has(txt(t), 'conference')), got: o.hotTopics.map((t) => t.title) },
      { name: 'topic dog surgery', pass: topic(o, (t) => has(txt(t), 'dog') || has(txt(t), 'surgery')), got: o.hotTopics.map((t) => t.title) },
      { name: 'topic buying a boat', pass: topic(o, (t) => has(txt(t), 'boat')), got: o.hotTopics.map((t) => t.title) },
      { name: 'reponse en anglais', pass: !/[éèêàçù]/i.test(JSON.stringify(o)), got: o.noteTitle },
      noPastDates(o),
    ],
  },
  {
    id: 'C11-note-fleuve', tier: 'complex', language: 'fr', expectedTopics: 6,
    transcription: "Bon, note un peu longue sur Yasmine parce qu'on a parlé deux heures. Alors déjà elle a changé de service, elle est passée au juridique le mois dernier, ça se passe bien. Ensuite elle m'a dit qu'elle avait un souci avec son proprio, il veut vendre l'appart, elle a trois mois pour partir. Du coup elle cherche à acheter, elle a un rendez-vous banque vendredi pour son prêt. Après on a parlé de son père, il se fait opérer du genou le 3 du mois prochain, elle va descendre à Toulouse pour être là. Elle m'a raconté aussi qu'elle s'était remise au piano, elle prend des cours le samedi, ça la détend. Ah et elle part en Grèce deux semaines en octobre avec ses soeurs, c'est réservé. Et le dernier truc, elle passe le TOEIC dans un mois pour son dossier de mutation. Voilà. Elle est en forme mais elle a beaucoup de choses en cours.",
    checks: (o) => [
      { name: 'firstName=Yasmine', pass: has(o.contactIdentified.firstName, 'yasmine'), got: o.contactIdentified.firstName },
      { name: 'au moins 5 sujets sur 6', pass: o.hotTopics.length >= 5, got: o.hotTopics.length },
      { name: 'topic depart appart / proprio', pass: topic(o, (t) => has(txt(t), 'proprio') || has(txt(t), 'appart') || has(txt(t), 'logement')), got: o.hotTopics.map((t) => t.title) },
      { name: `rendez-vous banque eventDate futur`, pass: topic(o, (t) => (has(txt(t), 'banque') || has(txt(t), 'pret')) && !!t.eventDate && t.eventDate >= TODAY), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'operation genou du pere le 3', pass: topic(o, (t) => (has(txt(t), 'genou') || has(txt(t), 'pere') || has(txt(t), 'operation')) && !!t.eventDate && t.eventDate.endsWith('-03')), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `Grece eventDate=${next(10, 1)}`, pass: topic(o, (t) => has(txt(t), 'grece') && t.eventDate === next(10, 1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: `TOEIC eventDate=${IN_M(1)}`, pass: topic(o, (t) => has(txt(t), 'toeic') && t.eventDate === IN_M(1)), got: o.hotTopics.map((t) => [t.title, t.eventDate]) },
      { name: 'piano dans loves, pas en topic', pass: o.loves.some((l) => has(l, 'piano')) && !topic(o, (t) => has(txt(t), 'piano')), got: [o.loves, o.hotTopics.map((t) => t.title)] },
      noPastDates(o),
    ],
  },
  {
    id: 'C12-fausse-resolution', tier: 'complex', language: 'fr', expectedTopics: 1,
    transcription: "J'ai eu Bastien vite fait. Il m'a juste dit que pour le procès, il attend toujours, ça n'avance pas, l'audience n'est pas fixée. Sinon rien de spécial. Ah si, il part à Berlin le week-end prochain voir un pote.",
    currentContact: {
      id: 'contact-bastien', firstName: 'Bastien', lastName: null,
      hotTopics: [
        { id: 'topic-proces', title: 'Procès prud’hommes', context: 'Attend une date d’audience' },
        { id: 'topic-perm-b', title: 'Permis bateau', context: 'Inscrit à la formation' },
      ],
    } as Parameters<typeof buildExtractionPrompt>[1],
    checks: (o) => [
      { name: 'firstName=Bastien', pass: has(o.contactIdentified.firstName, 'bastien'), got: o.contactIdentified.firstName },
      { name: 'ne resout AUCUN topic', pass: o.resolvedTopics.length === 0, got: o.resolvedTopics },
      { name: 'topic Berlin week-end prochain', pass: topic(o, (t) => has(txt(t), 'berlin')), got: o.hotTopics.map((t) => t.title) },
      { name: 'ne recree pas le proces en doublon', pass: !topic(o, (t) => has(txt(t), 'proces') || has(txt(t), 'audience')), got: o.hotTopics.map((t) => t.title) },
      noPastDates(o),
    ],
  },
];
