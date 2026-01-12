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
  groups: z.array(z.string()).default([]),
});

const seedRequestSchema = z.object({
  contacts: z.array(contactSchema),
});

const generateRequestSchema = z.object({
  count: z.number().min(1).max(50).default(5),
  locale: z.enum(['en', 'fr']).default('fr'),
});

// Sample data for random generation
const sampleDataFr = {
  firstNames: {
    male: ['Thomas', 'Lucas', 'Hugo', 'Léo', 'Gabriel', 'Raphaël', 'Arthur', 'Louis', 'Jules', 'Adam', 'Mathis', 'Nathan', 'Ethan', 'Noah', 'Paul'],
    female: ['Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Léa', 'Manon', 'Rose', 'Anna', 'Inès', 'Camille', 'Lola', 'Sarah', 'Zoé', 'Juliette'],
  },
  lastNames: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux'],
  companies: ['Airbus', 'L\'Oréal', 'Danone', 'Renault', 'BNP Paribas', 'Capgemini', 'Ubisoft', 'Dassault', 'Orange', 'TotalEnergies', 'Startup XYZ', 'Agence ABC'],
  jobs: ['Développeur', 'Designer', 'Chef de projet', 'Commercial', 'Ingénieur', 'Consultant', 'Médecin', 'Avocat', 'Professeur', 'Architecte', 'Journaliste', 'Photographe'],
  cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Bordeaux', 'Lille', 'Strasbourg', 'Rennes', 'Montpellier', 'Grenoble'],
  hobbies: ['Randonnée', 'Photographie', 'Cuisine', 'Lecture', 'Yoga', 'Tennis', 'Natation', 'Jardinage', 'Voyage', 'Musique', 'Dessin', 'Escalade'],
  topics: [
    { title: 'Recherche d\'emploi', context: 'Cherche un nouveau poste' },
    { title: 'Déménagement prévu', context: 'Va déménager bientôt' },
    { title: 'Projet de voyage', context: 'Planifie un voyage' },
    { title: 'Problème de santé', context: 'A des soucis de santé récents' },
    { title: 'Nouveau projet pro', context: 'Lance un nouveau projet' },
    { title: 'Formation en cours', context: 'Suit une formation' },
  ],
  memories: [
    'Dîner ensemble au restaurant',
    'Rencontre lors d\'une conférence',
    'Voyage ensemble',
    'Sortie cinéma',
    'Soirée entre amis',
    'Randonnée en montagne',
  ],
};

const sampleDataEn = {
  firstNames: {
    male: ['James', 'John', 'Michael', 'David', 'William', 'Richard', 'Robert', 'Joseph', 'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven'],
    female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Emily', 'Sophia', 'Olivia', 'Emma', 'Ava'],
  },
  lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson'],
  companies: ['Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'Tesla', 'Netflix', 'Uber', 'Airbnb', 'Stripe', 'Startup XYZ', 'Agency ABC'],
  jobs: ['Developer', 'Designer', 'Product Manager', 'Sales Rep', 'Engineer', 'Consultant', 'Doctor', 'Lawyer', 'Teacher', 'Architect', 'Journalist', 'Photographer'],
  cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Boston', 'Denver', 'Austin', 'Portland', 'Miami'],
  hobbies: ['Hiking', 'Photography', 'Cooking', 'Reading', 'Yoga', 'Tennis', 'Swimming', 'Gardening', 'Travel', 'Music', 'Drawing', 'Climbing'],
  topics: [
    { title: 'Job hunting', context: 'Looking for a new position' },
    { title: 'Moving soon', context: 'Planning to relocate' },
    { title: 'Trip planning', context: 'Planning a vacation' },
    { title: 'Health issue', context: 'Dealing with health concerns' },
    { title: 'New project', context: 'Starting a new venture' },
    { title: 'Taking a course', context: 'Learning something new' },
  ],
  memories: [
    'Dinner together at a restaurant',
    'Met at a conference',
    'Traveled together',
    'Movie night',
    'Party with friends',
    'Hiking trip',
  ],
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(yearsBack: number = 2): string {
  const now = new Date();
  const past = new Date(now.getTime() - yearsBack * 365 * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (now.getTime() - past.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function generateRandomContact(locale: 'en' | 'fr') {
  const data = locale === 'fr' ? sampleDataFr : sampleDataEn;
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const firstName = randomPick(data.firstNames[gender]);
  const lastName = randomPick(data.lastNames);

  const facts = [];

  // Always add job and company
  facts.push({
    factType: 'work',
    factKey: locale === 'fr' ? 'Métier' : 'Job',
    factValue: randomPick(data.jobs),
  });
  facts.push({
    factType: 'company',
    factKey: locale === 'fr' ? 'Entreprise' : 'Company',
    factValue: randomPick(data.companies),
  });
  facts.push({
    factType: 'location',
    factKey: locale === 'fr' ? 'Ville' : 'City',
    factValue: randomPick(data.cities),
  });

  // Maybe add hobbies
  if (Math.random() > 0.5) {
    facts.push({
      factType: 'hobby',
      factKey: locale === 'fr' ? 'Loisir' : 'Hobby',
      factValue: randomPick(data.hobbies),
    });
  }
  if (Math.random() > 0.7) {
    facts.push({
      factType: 'hobby',
      factKey: locale === 'fr' ? 'Sport' : 'Sport',
      factValue: randomPick(data.hobbies),
    });
  }

  // Maybe add hot topic
  const hotTopics = [];
  if (Math.random() > 0.4) {
    hotTopics.push({
      ...randomPick(data.topics),
      status: 'active' as const,
    });
  }

  // Maybe add memory
  const memories = [];
  if (Math.random() > 0.5) {
    memories.push({
      description: randomPick(data.memories),
      eventDate: randomDate(),
      isShared: Math.random() > 0.5,
    });
  }

  // Maybe add birthday
  const hasBirthday = Math.random() > 0.5;

  return {
    firstName,
    lastName,
    gender: gender as 'male' | 'female',
    phone: Math.random() > 0.6 ? `+33 6 ${Math.floor(10000000 + Math.random() * 90000000)}` : undefined,
    email: Math.random() > 0.6 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com` : undefined,
    birthdayDay: hasBirthday ? Math.floor(1 + Math.random() * 28) : undefined,
    birthdayMonth: hasBirthday ? Math.floor(1 + Math.random() * 12) : undefined,
    birthdayYear: hasBirthday ? Math.floor(1970 + Math.random() * 40) : undefined,
    aiSummary: `${firstName} ${locale === 'fr' ? 'travaille chez' : 'works at'} ${facts.find(f => f.factType === 'company')?.factValue}. ${hotTopics.length > 0 ? hotTopics[0].context : ''}`.trim(),
    facts,
    hotTopics,
    memories,
    groups: [],
  };
}

// Auth required for seed endpoints
seedRoutes.use('/*', authMiddleware);

/**
 * POST /api/seed
 * Accept contacts data and return them formatted for frontend import
 * The backend does NOT store these - it just validates and returns
 */
seedRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = seedRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Invalid request', details: validation.error.issues }, 400);
    }

    const { contacts } = validation.data;

    // Generate unique IDs for each contact and related entities
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
 * Generate random contacts with realistic data
 */
seedRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const validation = generateRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Invalid request', details: validation.error.issues }, 400);
    }

    const { count, locale } = validation.data;
    const contacts = [];

    for (let i = 0; i < count; i++) {
      contacts.push(generateRandomContact(locale));
    }

    // Process with IDs like the regular endpoint
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
