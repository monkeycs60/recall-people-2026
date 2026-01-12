import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import type { User } from '@prisma/client';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

type Variables = {
  user: User;
};

export const seedRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const factSchema = z.object({
  factType: z.string(),
  factKey: z.string(),
  factValue: z.string(),
});

const memorySchema = z.object({
  description: z.string(),
  eventDate: z.string().optional(),
  isShared: z.boolean().default(false),
});

const hotTopicSchema = z.object({
  title: z.string(),
  context: z.string().optional(),
  status: z.enum(['active', 'resolved']).default('active'),
});

const noteSchema = z.object({
  title: z.string().optional(),
  transcription: z.string().optional(),
  summary: z.string().optional(),
});

const contactSchema = z.object({
  firstName: z.string(),
  lastName: z.string().optional(),
  nickname: z.string().optional(),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  phone: z.string().optional(),
  email: z.string().optional(),
  birthdayDay: z.number().min(1).max(31).optional(),
  birthdayMonth: z.number().min(1).max(12).optional(),
  birthdayYear: z.number().optional(),
  aiSummary: z.string().optional(),
  facts: z.array(factSchema).default([]),
  memories: z.array(memorySchema).default([]),
  hotTopics: z.array(hotTopicSchema).default([]),
  notes: z.array(noteSchema).default([]),
  groups: z.array(z.string()).default([]),
});

const seedRequestSchema = z.object({
  contacts: z.array(contactSchema),
});

const generateRequestSchema = z.object({
  count: z.number().min(1).max(50).default(5),
  locale: z.enum(['en', 'fr']).default('fr'),
  richness: z.enum(['minimal', 'normal', 'rich']).default('rich'),
});

// ===========================================
// RICH SAMPLE DATA - FRENCH
// ===========================================
const sampleDataFr = {
  firstNames: {
    male: ['Thomas', 'Lucas', 'Hugo', 'Léo', 'Gabriel', 'Raphaël', 'Arthur', 'Louis', 'Jules', 'Adam', 'Mathis', 'Nathan', 'Ethan', 'Noah', 'Paul', 'Antoine', 'Maxime', 'Alexandre', 'Victor', 'Nicolas'],
    female: ['Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Léa', 'Manon', 'Rose', 'Anna', 'Inès', 'Camille', 'Lola', 'Sarah', 'Zoé', 'Juliette', 'Marie', 'Clara', 'Charlotte', 'Lucie', 'Margot'],
  },
  lastNames: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard'],
  nicknames: ['Loulou', 'Titi', 'Juju', 'Mimi', 'Nono', 'Doudou', 'Coco', 'Lili', 'Fifi', 'Bibi', 'Le Boss', 'Champion', 'Poulette', 'Mon pote', 'Chouchou'],

  companies: ['Airbus', 'L\'Oréal', 'Danone', 'Renault', 'BNP Paribas', 'Capgemini', 'Ubisoft', 'Dassault Systèmes', 'Orange', 'TotalEnergies', 'Société Générale', 'Carrefour', 'LVMH', 'Sanofi', 'Michelin', 'Thales', 'Safran', 'Alstom', 'Veolia', 'EDF'],
  jobs: ['Développeur senior', 'UX Designer', 'Chef de projet digital', 'Commercial grands comptes', 'Ingénieur DevOps', 'Consultant stratégie', 'Médecin généraliste', 'Avocat d\'affaires', 'Professeur des écoles', 'Architecte d\'intérieur', 'Journaliste indépendant', 'Photographe professionnel', 'Data Scientist', 'Product Manager', 'Infirmière', 'Comptable', 'Kinésithérapeute', 'Chef cuisinier', 'Graphiste freelance', 'Directeur marketing'],
  cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille', 'Strasbourg', 'Rennes', 'Montpellier', 'Grenoble', 'Aix-en-Provence', 'Annecy', 'La Rochelle', 'Biarritz'],
  origins: ['Français', 'Franco-marocain', 'Franco-algérien', 'Franco-italien', 'Franco-espagnol', 'Franco-portugais', 'Franco-polonais', 'Franco-vietnamien', 'Franco-sénégalais', 'Belge', 'Suisse', 'Québécois'],

  hobbies: ['Randonnée en montagne', 'Photographie de rue', 'Cuisine asiatique', 'Lecture de thrillers', 'Yoga Vinyasa', 'Tennis en club', 'Natation', 'Jardinage bio', 'Voyage en van', 'Guitare acoustique', 'Aquarelle', 'Escalade en salle', 'Running marathon', 'Plongée sous-marine', 'Œnologie', 'Bénévolat associatif', 'Bricolage maison', 'Jeux de société', 'Cinéphile', 'Poterie'],
  sports: ['Tennis', 'Football', 'Running', 'Cyclisme', 'Natation', 'Escalade', 'Ski', 'Surf', 'Boxe thaï', 'CrossFit', 'Padel', 'Golf', 'Voile', 'Triathlon', 'Basketball'],
  pets: ['un chat roux nommé Caramel', 'un labrador noir nommé Max', 'deux chats siamois', 'un bouledogue français nommé Gaston', 'un golden retriever nommé Luna', 'un aquarium tropical', 'un perroquet gris du Gabon', 'un chat bengal nommé Tigrou', 'un jack russell nommé Pixel'],
  languages: ['Anglais courant', 'Espagnol intermédiaire', 'Italien basique', 'Allemand scolaire', 'Mandarin débutant', 'Arabe dialectal', 'Portugais brésilien', 'Japonais N3'],

  partners: {
    male: ['Sophie', 'Marie', 'Julie', 'Céline', 'Pauline', 'Laura', 'Caroline', 'Élodie', 'Audrey', 'Nathalie'],
    female: ['Pierre', 'Marc', 'François', 'Julien', 'Sébastien', 'Olivier', 'Mathieu', 'Guillaume', 'Benoît', 'Christophe'],
  },
  childrenDescriptions: ['une fille de 3 ans (Léa)', 'un fils de 5 ans (Tom)', 'deux enfants (Emma 7 ans et Lucas 4 ans)', 'des jumeaux de 2 ans', 'une fille adolescente (15 ans)', 'trois enfants', 'un bébé de 6 mois', 'deux filles (8 et 10 ans)'],

  howMet: ['via des amis communs lors d\'une soirée', 'au travail sur un projet', 'à une conférence tech', 'dans un club de sport', 'à l\'université', 'par une appli de networking', 'lors d\'un voyage', 'dans un bar à vin', 'à un mariage', 'voisins depuis 5 ans', 'colocs à la fac', 'même école primaire retrouvés'],
  whereMet: ['Paris', 'Lyon', 'à un afterwork', 'en vacances en Espagne', 'à Bordeaux', 'lors d\'un meetup tech', 'au Japon', 'dans un coworking', 'à une expo d\'art', 'au marché du dimanche'],

  traits: ['grand avec barbe', 'petite, cheveux roux bouclés', 'lunettes rondes style hipster', 'toujours en costume', 'tatouages sur les bras', 'accent du sud prononcé', 'sourire communicatif', 'voix grave et posée', 'toujours bronzé', 'style très classe', 'rire reconnaissable', 'gestuelle expressive'],
  giftIdeas: ['un bon livre sur le management', 'une bouteille de vin nature', 'des places de concert', 'un cours de cuisine', 'un abonnement Spotify', 'un coffret dégustation whisky', 'des chocolats artisanaux', 'une plante d\'intérieur', 'un puzzle 1000 pièces', 'un carnet Moleskine', 'des écouteurs bluetooth', 'un escape game'],
  giftsGiven: ['un livre de développement personnel (2023)', 'une écharpe en cachemire pour Noël', 'un coffret champagne pour son anniversaire', 'des places pour un spectacle'],

  hotTopics: [
    { title: 'Recherche d\'emploi', context: 'Cherche un poste de senior developer, a eu 3 entretiens récemment. Stressé par le processus.' },
    { title: 'Déménagement à Lyon', context: 'Prévoit de déménager en mars pour se rapprocher de sa famille. Cherche un appartement.' },
    { title: 'Projet de mariage', context: 'Va se marier en juin prochain. En pleine organisation, cherche un traiteur.' },
    { title: 'Problème de santé (dos)', context: 'A des douleurs dorsales chroniques, voit un kiné 2x par semaine.' },
    { title: 'Lancement de sa boîte', context: 'Monte une startup dans la foodtech, en recherche de financements seed.' },
    { title: 'Formation data science', context: 'Suit un bootcamp Le Wagon de 9 semaines, très intense mais passionnant.' },
    { title: 'Achat immobilier', context: 'Cherche à acheter son premier appart, visite beaucoup en ce moment.' },
    { title: 'Changement de carrière', context: 'Veut quitter la finance pour l\'impact, réfléchit à une reconversion.' },
    { title: 'Projet bébé', context: 'Essaie d\'avoir un enfant avec sa compagne depuis quelques mois.' },
    { title: 'Conflit au travail', context: 'Tension avec son nouveau manager, envisage de partir.' },
    { title: 'Voyage au Japon', context: 'Prépare un voyage de 3 semaines au Japon pour avril.' },
    { title: 'Rénovation appartement', context: 'En plein travaux dans son appart, cuisine et salle de bain.' },
    { title: 'Problème familial', context: 'Sa mère est malade, fait des allers-retours en province.' },
    { title: 'Préparation marathon', context: 'S\'entraîne pour le marathon de Paris, court 4x par semaine.' },
    { title: 'Négociation salariale', context: 'Demande une augmentation, le process est en cours avec les RH.' },
  ],

  memories: [
    { description: 'Super soirée au bar Le Perchoir à Paris, on a refait le monde jusqu\'à 3h du mat', isShared: true },
    { description: 'Dîner au restaurant Septime pour son anniversaire, cuisine incroyable', isShared: true },
    { description: 'Week-end à Deauville tous ensemble, plage et fruits de mer', isShared: true },
    { description: 'Randonnée dans les Calanques, journée magnifique malgré la chaleur', isShared: true },
    { description: 'Escape game réussi en 45 minutes, on était trop fiers', isShared: true },
    { description: 'Soirée raclette chez lui avec sa bande de potes, ambiance top', isShared: true },
    { description: 'Concert de Stromae ensemble à l\'AccorHotels Arena', isShared: true },
    { description: 'Brunch dominical au café Oberkampf, leurs pancakes sont dingues', isShared: true },
    { description: 'Road trip en Bretagne, Saint-Malo et côte de Granit Rose', isShared: true },
    { description: 'Vernissage d\'une expo d\'un ami commun, très belles œuvres', isShared: true },
    { description: 'Karaoké mémorable, sa version de "Ne me quitte pas" était hilarante', isShared: true },
    { description: 'Match de foot PSG ensemble au Parc des Princes', isShared: true },
    { description: 'Cours de poterie ensemble, on a bien rigolé', isShared: true },
    { description: 'Pique-nique au parc des Buttes-Chaumont au coucher de soleil', isShared: true },
    { description: 'Festival Solidays, super ambiance malgré la pluie', isShared: true },
    { description: 'Soirée jeux de société, il nous a massacrés au Catan', isShared: false },
    { description: 'Balade en vélo le long du canal Saint-Martin', isShared: true },
    { description: 'Déjeuner d\'anniversaire surprise qu\'on lui a organisé', isShared: false },
  ],

  noteTranscriptions: [
    "Alors j'ai vu {name} hier soir, on a dîné ensemble au nouveau resto italien du quartier. {pronoun_subject} m'a parlé de son projet de changer de boulot, apparemment {pronoun_subject} en a marre de son manager actuel. {pronoun_subject} hésite entre deux offres, une chez une startup et une dans un grand groupe. Je lui ai conseillé de suivre son instinct. Sinon {pronoun_subject} part en vacances en Grèce le mois prochain avec {partner}, ils ont loué une maison sur une île.",
    "Café avec {name} ce matin. {pronoun_subject} avait l'air fatigué, {pronoun_subject} m'a dit que {child} fait ses dents et qu'ils dorment mal en ce moment. On a parlé de son nouveau hobby, {pronoun_subject} s'est mis à {hobby}, {pronoun_subject} adore ça. {pronoun_subject} m'a aussi recommandé un super bouquin sur {topic}. Faudra que je le note.",
    "Grosse discussion avec {name} au téléphone. {pronoun_subject} traverse une période compliquée au niveau perso, {pronoun_subject} se pose des questions sur sa relation avec {partner}. Je l'ai écouté pendant une bonne heure. {pronoun_subject} envisage de voir un psy pour en parler. Sinon côté boulot ça va, {pronoun_subject} a eu une promo récemment.",
    "Soirée chez {name} hier. Son appart est super bien décoré maintenant après les travaux. {pronoun_subject} nous a fait un tajine incroyable, {pronoun_subject} cuisine vraiment bien. On était une dizaine, ambiance très sympa. {pronoun_subject} m'a présenté {newPerson} qui bosse dans le même domaine que moi, contact intéressant.",
    "J'ai croisé {name} à la salle de sport ce matin. {pronoun_subject} prépare {event}, {pronoun_subject} s'entraîne dur. On a pris un smoothie après. {pronoun_subject} m'a parlé de son projet {project}, ça a l'air de bien avancer. {pronoun_subject} cherche des investisseurs en ce moment.",
    "Déjeuner avec {name} près de son bureau. {pronoun_subject} m'a raconté son week-end à {place}, {pronoun_subject} a adoré. {pronoun_subject} veut qu'on organise un truc tous ensemble bientôt. {pronoun_subject} a aussi mentionné que {pronoun_possessive} {relative} va mieux, c'est une bonne nouvelle après ces mois difficiles.",
  ],
};

// ===========================================
// RICH SAMPLE DATA - ENGLISH
// ===========================================
const sampleDataEn = {
  firstNames: {
    male: ['James', 'John', 'Michael', 'David', 'William', 'Richard', 'Robert', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew', 'Ryan', 'Brandon', 'Kevin', 'Brian'],
    female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Emily', 'Sophia', 'Olivia', 'Emma', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper'],
  },
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris', 'Clark', 'Lewis', 'Walker'],
  nicknames: ['Mike', 'Dave', 'Bobby', 'Johnny', 'Billy', 'Tommy', 'Danny', 'Jen', 'Liz', 'Katie', 'The Legend', 'Champ', 'Buddy', 'Chief', 'Boss'],

  companies: ['Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'Tesla', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Salesforce', 'Adobe', 'Twitter', 'LinkedIn', 'Spotify', 'Slack', 'Zoom', 'Square', 'Shopify', 'Coinbase'],
  jobs: ['Senior Software Engineer', 'UX Designer', 'Product Manager', 'Sales Director', 'DevOps Engineer', 'Management Consultant', 'Family Doctor', 'Corporate Lawyer', 'Elementary Teacher', 'Interior Architect', 'Freelance Journalist', 'Professional Photographer', 'Data Scientist', 'Marketing Director', 'Registered Nurse', 'CPA', 'Physical Therapist', 'Executive Chef', 'Freelance Designer', 'VP of Engineering'],
  cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Boston', 'Denver', 'Austin', 'Portland', 'Miami', 'San Diego', 'Nashville', 'Atlanta', 'Brooklyn'],
  origins: ['American', 'Mexican-American', 'Chinese-American', 'Indian-American', 'Irish-American', 'Italian-American', 'Filipino-American', 'Vietnamese-American', 'Korean-American', 'Canadian', 'British', 'Australian'],

  hobbies: ['Mountain hiking', 'Street photography', 'Asian cooking', 'Reading thrillers', 'Vinyasa yoga', 'Club tennis', 'Swimming laps', 'Organic gardening', 'Van life traveling', 'Acoustic guitar', 'Watercolor painting', 'Indoor climbing', 'Marathon running', 'Scuba diving', 'Wine tasting', 'Volunteering', 'Home renovation', 'Board games', 'Watching films', 'Pottery'],
  sports: ['Tennis', 'Soccer', 'Running', 'Cycling', 'Swimming', 'Rock climbing', 'Skiing', 'Surfing', 'Muay Thai', 'CrossFit', 'Pickleball', 'Golf', 'Sailing', 'Triathlon', 'Basketball'],
  pets: ['an orange cat named Cheddar', 'a black lab named Max', 'two siamese cats', 'a french bulldog named Frank', 'a golden retriever named Luna', 'a tropical fish tank', 'an african grey parrot', 'a bengal cat named Tiger', 'a jack russell named Pixel'],
  languages: ['Spanish fluent', 'French intermediate', 'Japanese basic', 'German conversational', 'Mandarin beginner', 'Italian intermediate', 'Portuguese Brazilian', 'Korean basic'],

  partners: {
    male: ['Sarah', 'Emily', 'Jessica', 'Amanda', 'Michelle', 'Jennifer', 'Ashley', 'Stephanie', 'Nicole', 'Lauren'],
    female: ['Michael', 'David', 'James', 'John', 'Chris', 'Matt', 'Ryan', 'Josh', 'Brian', 'Jason'],
  },
  childrenDescriptions: ['a 3-year-old daughter (Lily)', 'a 5-year-old son (Jack)', 'two kids (Emma 7 and Lucas 4)', 'twin toddlers', 'a teenage daughter (15)', 'three children', 'a 6-month-old baby', 'two daughters (8 and 10)'],

  howMet: ['through mutual friends at a party', 'at work on a project', 'at a tech conference', 'at a sports club', 'in college', 'through a networking app', 'while traveling', 'at a wine bar', 'at a wedding', 'neighbors for 5 years', 'college roommates', 'childhood friends reconnected'],
  whereMet: ['New York', 'San Francisco', 'at a happy hour', 'on vacation in Mexico', 'at a tech meetup', 'in Japan', 'at a coworking space', 'at an art gallery', 'at the farmers market'],

  traits: ['tall with a beard', 'short with curly red hair', 'round hipster glasses', 'always in a suit', 'arm tattoos', 'strong southern accent', 'infectious smile', 'deep calm voice', 'always tanned', 'very classy style', 'distinctive laugh', 'expressive gestures'],
  giftIdeas: ['a good book on leadership', 'a bottle of natural wine', 'concert tickets', 'a cooking class', 'a Spotify subscription', 'a whiskey tasting set', 'artisan chocolates', 'a houseplant', 'a 1000-piece puzzle', 'a Moleskine notebook', 'bluetooth earbuds', 'an escape room voucher'],
  giftsGiven: ['a self-help book (2023)', 'a cashmere scarf for Christmas', 'a champagne gift set for their birthday', 'tickets to a show'],

  hotTopics: [
    { title: 'Job hunting', context: 'Looking for a senior dev role, had 3 interviews recently. Stressed about the process.' },
    { title: 'Moving to Austin', context: 'Planning to relocate in March to be closer to family. Apartment hunting.' },
    { title: 'Wedding planning', context: 'Getting married in June. In full planning mode, looking for a caterer.' },
    { title: 'Back pain issues', context: 'Has chronic back problems, seeing a PT twice a week.' },
    { title: 'Launching a startup', context: 'Building a foodtech startup, raising seed funding.' },
    { title: 'Data science bootcamp', context: 'Doing a 9-week intensive bootcamp, challenging but exciting.' },
    { title: 'Buying first home', context: 'Looking to buy their first place, doing lots of open houses.' },
    { title: 'Career pivot', context: 'Wants to leave finance for impact work, considering options.' },
    { title: 'Trying for a baby', context: 'Been trying to have a baby with partner for a few months.' },
    { title: 'Work conflict', context: 'Tension with new manager, considering leaving.' },
    { title: 'Japan trip', context: 'Planning a 3-week trip to Japan for April.' },
    { title: 'Home renovation', context: 'In the middle of renovating their place, kitchen and bathroom.' },
    { title: 'Family health issue', context: 'Mom is sick, making frequent trips back home.' },
    { title: 'Marathon training', context: 'Training for the NYC marathon, running 4x a week.' },
    { title: 'Salary negotiation', context: 'Asking for a raise, in discussions with HR.' },
  ],

  memories: [
    { description: 'Amazing night at a rooftop bar downtown, talked until 3am', isShared: true },
    { description: 'Birthday dinner at that fancy new restaurant, incredible food', isShared: true },
    { description: 'Beach weekend together, seafood and sunsets', isShared: true },
    { description: 'Hiking trip despite the heat, beautiful views', isShared: true },
    { description: 'Escape room win in 45 minutes, we were so proud', isShared: true },
    { description: 'Game night at their place with the crew, great vibes', isShared: true },
    { description: 'Concert together at Madison Square Garden', isShared: true },
    { description: 'Sunday brunch at that cafe, amazing pancakes', isShared: true },
    { description: 'Road trip up the coast, beautiful scenery', isShared: true },
    { description: 'Art gallery opening for a mutual friend', isShared: true },
    { description: 'Karaoke night, their rendition was hilarious', isShared: true },
    { description: 'Basketball game together at the arena', isShared: true },
    { description: 'Pottery class together, lots of laughs', isShared: true },
    { description: 'Picnic in the park at sunset', isShared: true },
    { description: 'Music festival, great vibes despite the rain', isShared: true },
    { description: 'Board game night, they destroyed us at Settlers', isShared: false },
    { description: 'Bike ride along the river path', isShared: true },
    { description: 'Surprise birthday lunch we organized for them', isShared: false },
  ],

  noteTranscriptions: [
    "So I saw {name} last night, we had dinner at this new Italian place in the neighborhood. {pronoun_subject} told me about wanting to change jobs, apparently {pronoun_subject}'s fed up with the current manager. {pronoun_subject}'s torn between two offers, one at a startup and one at a big company. I told them to trust their gut. Also {pronoun_subject}'s going to Greece next month with {partner}, they rented a house on an island.",
    "Coffee with {name} this morning. {pronoun_subject} looked tired, told me {child} is teething and they're not sleeping well. We talked about their new hobby, {pronoun_subject} got into {hobby} and loves it. {pronoun_subject} also recommended a great book on {topic}. Need to note that.",
    "Long talk with {name} on the phone. {pronoun_subject}'s going through a rough patch personally, questioning things with {partner}. Listened for about an hour. {pronoun_subject}'s thinking of seeing a therapist. Work is good though, {pronoun_subject} got a promotion recently.",
    "Party at {name}'s place last night. Their apartment looks amazing after the renovation. {pronoun_subject} made an incredible tagine, {pronoun_subject} really can cook. About ten of us there, great atmosphere. {pronoun_subject} introduced me to {newPerson} who works in my field, interesting connection.",
    "Ran into {name} at the gym this morning. {pronoun_subject}'s training for {event}, working out hard. Grabbed a smoothie after. {pronoun_subject} told me about the {project} project, seems to be going well. {pronoun_subject}'s looking for investors now.",
    "Lunch with {name} near their office. {pronoun_subject} told me about the weekend in {place}, loved it. {pronoun_subject} wants to plan something with the whole group soon. Also mentioned that {pronoun_possessive} {relative} is doing better, good news after those tough months.",
  ],
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPickMultiple<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(min + Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomDate(yearsBack: number = 2): string {
  const now = new Date();
  const past = new Date(now.getTime() - yearsBack * 365 * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function randomFutureDate(monthsAhead: number = 6): string {
  const now = new Date();
  const future = new Date(now.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);
  const randomTime = now.getTime() + Math.random() * (future.getTime() - now.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ===========================================
// RICH CONTACT GENERATOR
// ===========================================

function generateRichContact(locale: 'en' | 'fr', richness: 'minimal' | 'normal' | 'rich' = 'rich') {
  const data = locale === 'fr' ? sampleDataFr : sampleDataEn;
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = randomPick(data.firstNames[gender]);
  const lastName = randomPick(data.lastNames);
  const hasNickname = Math.random() > 0.7;

  const pronouns = {
    subject: gender === 'male' ? (locale === 'fr' ? 'il' : 'he') : (locale === 'fr' ? 'elle' : 'she'),
    possessive: gender === 'male' ? (locale === 'fr' ? 'son' : 'his') : (locale === 'fr' ? 'sa' : 'her'),
  };

  const facts = [];
  const job = randomPick(data.jobs);
  const company = randomPick(data.companies);
  const city = randomPick(data.cities);

  // Partner (declared early for use in notes)
  const hasPartner = richness !== 'minimal' && Math.random() > 0.4;
  const partnerName = hasPartner ? randomPick(data.partners[gender === 'male' ? 'female' : 'male']) : null;

  // Physical trait for avatar hints
  const physicalTrait = Math.random() > 0.5 ? randomPick(data.traits) : null;

  // Core facts (always present)
  facts.push({
    factType: 'work',
    factKey: locale === 'fr' ? 'Métier' : 'Job',
    factValue: job,
  });
  facts.push({
    factType: 'company',
    factKey: locale === 'fr' ? 'Entreprise' : 'Company',
    factValue: company,
  });
  facts.push({
    factType: 'location',
    factKey: locale === 'fr' ? 'Ville' : 'City',
    factValue: city,
  });

  // Rich mode: add many more facts
  if (richness === 'rich' || richness === 'normal') {
    // Origin
    if (Math.random() > 0.5) {
      facts.push({
        factType: 'origin',
        factKey: locale === 'fr' ? 'Origine' : 'Origin',
        factValue: randomPick(data.origins),
      });
    }

    // Partner fact
    if (partnerName) {
      facts.push({
        factType: 'partner',
        factKey: locale === 'fr' ? 'Conjoint(e)' : 'Partner',
        factValue: partnerName,
      });
    }

    // Children
    if (hasPartner && Math.random() > 0.5) {
      facts.push({
        factType: 'children',
        factKey: locale === 'fr' ? 'Enfants' : 'Children',
        factValue: randomPick(data.childrenDescriptions),
      });
    }

    // Multiple hobbies
    const hobbies = randomPickMultiple(data.hobbies, 1, 3);
    hobbies.forEach((hobby, idx) => {
      facts.push({
        factType: 'hobby',
        factKey: locale === 'fr' ? `Loisir ${idx + 1}` : `Hobby ${idx + 1}`,
        factValue: hobby,
      });
    });

    // Sport
    if (Math.random() > 0.4) {
      facts.push({
        factType: 'sport',
        factKey: 'Sport',
        factValue: randomPick(data.sports),
      });
    }

    // Pet
    if (Math.random() > 0.6) {
      facts.push({
        factType: 'pet',
        factKey: locale === 'fr' ? 'Animal' : 'Pet',
        factValue: randomPick(data.pets),
      });
    }

    // Languages
    if (Math.random() > 0.5) {
      const langs = randomPickMultiple(data.languages, 1, 2);
      langs.forEach(lang => {
        facts.push({
          factType: 'language',
          factKey: locale === 'fr' ? 'Langue' : 'Language',
          factValue: lang,
        });
      });
    }

    // How/where met
    facts.push({
      factType: 'how_met',
      factKey: locale === 'fr' ? 'Comment connu' : 'How we met',
      factValue: randomPick(data.howMet),
    });
    if (Math.random() > 0.5) {
      facts.push({
        factType: 'where_met',
        factKey: locale === 'fr' ? 'Où rencontré' : 'Where we met',
        factValue: randomPick(data.whereMet),
      });
    }

    // Physical trait (use the one declared earlier for avatar hints)
    if (physicalTrait) {
      facts.push({
        factType: 'trait',
        factKey: locale === 'fr' ? 'Signe distinctif' : 'Distinctive trait',
        factValue: physicalTrait,
      });
    }

    // Gift ideas
    if (Math.random() > 0.6) {
      facts.push({
        factType: 'gift_idea',
        factKey: locale === 'fr' ? 'Idée cadeau' : 'Gift idea',
        factValue: randomPick(data.giftIdeas),
      });
    }
    if (Math.random() > 0.7) {
      facts.push({
        factType: 'gift_given',
        factKey: locale === 'fr' ? 'Cadeau offert' : 'Gift given',
        factValue: randomPick(data.giftsGiven),
      });
    }
  }

  // Hot topics (1-3 for rich, 0-2 for normal)
  const hotTopics = [];
  const topicCount = richness === 'rich' ? Math.floor(1 + Math.random() * 3) :
                     richness === 'normal' ? Math.floor(Math.random() * 2) : 0;
  const selectedTopics = randomPickMultiple(data.hotTopics, topicCount, topicCount);
  selectedTopics.forEach(topic => {
    hotTopics.push({
      ...topic,
      status: Math.random() > 0.8 ? 'resolved' as const : 'active' as const,
    });
  });

  // Memories (2-5 for rich, 1-2 for normal)
  const memories = [];
  const memoryCount = richness === 'rich' ? Math.floor(2 + Math.random() * 4) :
                      richness === 'normal' ? Math.floor(1 + Math.random() * 2) : 0;
  const selectedMemories = randomPickMultiple(data.memories, memoryCount, memoryCount);
  selectedMemories.forEach(memory => {
    memories.push({
      ...memory,
      eventDate: randomDate(2),
    });
  });

  // Notes with transcriptions (1-3 for rich)
  const notes = [];
  if (richness === 'rich') {
    const noteCount = Math.floor(1 + Math.random() * 3);
    const selectedTranscriptions = randomPickMultiple(data.noteTranscriptions, noteCount, noteCount);

    selectedTranscriptions.forEach(template => {
      const transcription = fillTemplate(template, {
        name: firstName,
        pronoun_subject: pronouns.subject,
        pronoun_possessive: pronouns.possessive,
        partner: partnerName || randomPick(data.partners[gender === 'male' ? 'female' : 'male']),
        child: locale === 'fr' ? 'le petit' : 'the little one',
        hobby: randomPick(data.hobbies).toLowerCase(),
        topic: locale === 'fr' ? 'la productivité' : 'productivity',
        newPerson: randomPick(data.firstNames[Math.random() > 0.5 ? 'male' : 'female']),
        event: locale === 'fr' ? 'un marathon' : 'a marathon',
        project: locale === 'fr' ? 'de startup' : 'startup',
        place: randomPick(data.cities),
        relative: locale === 'fr' ? 'mère' : 'mom',
      });

      notes.push({
        title: locale === 'fr' ? `Note sur ${firstName}` : `Note about ${firstName}`,
        transcription,
        summary: transcription.substring(0, 150) + '...',
      });
    });
  }

  // Birthday
  const hasBirthday = Math.random() > 0.3;

  // Build rich AI summary
  const summaryParts = [
    `${firstName} ${locale === 'fr' ? 'travaille comme' : 'works as'} ${job} ${locale === 'fr' ? 'chez' : 'at'} ${company} ${locale === 'fr' ? 'à' : 'in'} ${city}.`,
  ];

  if (facts.find(f => f.factType === 'partner')) {
    const p = facts.find(f => f.factType === 'partner')!.factValue;
    summaryParts.push(`${locale === 'fr' ? 'En couple avec' : 'In a relationship with'} ${p}.`);
  }

  if (hotTopics.length > 0) {
    summaryParts.push(`${locale === 'fr' ? 'Actuellement' : 'Currently'}: ${hotTopics[0].title.toLowerCase()}.`);
  }

  const hobbyFacts = facts.filter(f => f.factType === 'hobby');
  if (hobbyFacts.length > 0) {
    summaryParts.push(`${locale === 'fr' ? 'Passionné(e) de' : 'Passionate about'} ${hobbyFacts.map(h => h.factValue.toLowerCase()).join(', ')}.`);
  }

  // Build avatar hints for automatic generation
  const hobbyForHint = hobbyFacts.length > 0 ? hobbyFacts[0].factValue : null;
  const avatarHints = {
    physical: physicalTrait,
    personality: null,
    interest: hobbyForHint,
    context: job.toLowerCase().includes('dev') || job.toLowerCase().includes('engineer') || job.toLowerCase().includes('ingénieur') ? 'tech' :
             job.toLowerCase().includes('design') || job.toLowerCase().includes('artist') || job.toLowerCase().includes('photo') ? 'creative' :
             job.toLowerCase().includes('sport') || job.toLowerCase().includes('coach') ? 'sport' :
             job.toLowerCase().includes('commercial') || job.toLowerCase().includes('sales') || job.toLowerCase().includes('avocat') || job.toLowerCase().includes('lawyer') ? 'professional' :
             'casual',
  };

  return {
    firstName,
    lastName,
    nickname: hasNickname ? randomPick(data.nicknames) : undefined,
    gender: gender as 'male' | 'female',
    phone: Math.random() > 0.3 ? (locale === 'fr' ? `+33 6 ${Math.floor(10000000 + Math.random() * 90000000)}` : `+1 ${Math.floor(200 + Math.random() * 800)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`) : undefined,
    email: Math.random() > 0.3 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com` : undefined,
    birthdayDay: hasBirthday ? Math.floor(1 + Math.random() * 28) : undefined,
    birthdayMonth: hasBirthday ? Math.floor(1 + Math.random() * 12) : undefined,
    birthdayYear: hasBirthday ? Math.floor(1970 + Math.random() * 40) : undefined,
    aiSummary: summaryParts.join(' '),
    avatarHints,
    facts,
    hotTopics,
    memories,
    notes,
    groups: [],
  };
}

// Auth required for seed endpoints
seedRoutes.use('/*', authMiddleware);

/**
 * POST /api/seed
 * Accept contacts data and return them formatted for frontend import
 */
seedRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = seedRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Invalid request', details: validation.error.issues }, 400);
    }

    const { contacts } = validation.data;

    const processedContacts = contacts.map((contact, idx) => {
      const contactId = `seed-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        ...contact,
        id: contactId,
        facts: contact.facts.map((fact, fIdx) => ({
          ...fact,
          id: `${contactId}-fact-${fIdx}`,
          contactId,
        })),
        memories: contact.memories.map((memory, mIdx) => ({
          ...memory,
          id: `${contactId}-memory-${mIdx}`,
          contactId,
        })),
        hotTopics: contact.hotTopics.map((topic, tIdx) => ({
          ...topic,
          id: `${contactId}-topic-${tIdx}`,
          contactId,
        })),
        notes: (contact.notes || []).map((note, nIdx) => ({
          ...note,
          id: `${contactId}-note-${nIdx}`,
          contactId,
        })),
      };
    });

    return c.json({
      success: true,
      contacts: processedContacts,
      count: processedContacts.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return c.json({ error: 'Failed to process seed data' }, 500);
  }
});

/**
 * POST /api/seed/generate
 * Generate random contacts with realistic rich data
 */
seedRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const validation = generateRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Invalid request', details: validation.error.issues }, 400);
    }

    const { count, locale, richness } = validation.data;
    const contacts = [];

    for (let i = 0; i < count; i++) {
      contacts.push(generateRichContact(locale, richness));
    }

    const processedContacts = contacts.map((contact, idx) => {
      const contactId = `seed-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`;

      return {
        ...contact,
        id: contactId,
        facts: contact.facts.map((fact, fIdx) => ({
          ...fact,
          id: `${contactId}-fact-${fIdx}`,
          contactId,
        })),
        memories: contact.memories.map((memory, mIdx) => ({
          ...memory,
          id: `${contactId}-memory-${mIdx}`,
          contactId,
        })),
        hotTopics: contact.hotTopics.map((topic, tIdx) => ({
          ...topic,
          id: `${contactId}-topic-${tIdx}`,
          contactId,
        })),
        notes: contact.notes.map((note, nIdx) => ({
          ...note,
          id: `${contactId}-note-${nIdx}`,
          contactId,
        })),
      };
    });

    return c.json({
      success: true,
      contacts: processedContacts,
      count: processedContacts.length,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return c.json({ error: 'Failed to generate contacts' }, 500);
  }
});
