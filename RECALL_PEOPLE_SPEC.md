# Recall People — Spécification Produit Complète v2

## Vue d'ensemble

**Recall People** est une application mobile de Personal CRM dopée à l'IA qui permet de capturer des notes vocales sur les personnes de son entourage (clients, amis, famille, collègues) et d'enrichir automatiquement leurs fiches grâce à l'extraction intelligente d'informations.

**Philosophie produit** : "Talk first, organize later" — L'app doit être aussi simple que d'envoyer un vocal WhatsApp.

---

## Stack technique

### Mobile (Expo)
- **Framework** : Expo (React Native) avec Expo Router
- **Styling** : NativeWind (Tailwind CSS pour React Native)
- **Base de données locale** : SQLite (expo-sqlite)
- **Audio** : expo-av
- **Auth client** : Better Auth Expo client

### Backend (Hono)
- **Framework** : Hono (ultra-léger, edge-ready)
- **Déploiement** : Cloudflare Workers (gratuit jusqu'à 100K req/jour)
- **Base de données** : Neon (Postgres serverless)
- **ORM** : Prisma 7 (avec driver adapter pour edge)
- **Auth** : Better Auth

### Services externes
- **Transcription** : Deepgram API (Nova-3 — dernier modèle, meilleure accuracy)
- **Extraction IA** : Claude API (Anthropic)

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐              ┌─────────────────────────┐  │
│  │   Expo App      │              │   Hono Backend          │  │
│  │   (Mobile)      │◄────────────▶│   (Cloudflare Workers)  │  │
│  │                 │    HTTPS     │                         │  │
│  │  ┌───────────┐  │              │  ┌─────────────────┐    │  │
│  │  │ SQLite    │  │              │  │ Better Auth     │    │  │
│  │  │ (local)   │  │              │  └─────────────────┘    │  │
│  │  └───────────┘  │              │           │             │  │
│  │                 │              │           ▼             │  │
│  │  ┌───────────┐  │              │  ┌─────────────────┐    │  │
│  │  │ expo-av   │  │              │  │ Neon (Postgres) │    │  │
│  │  │ (audio)   │  │              │  └─────────────────┘    │  │
│  │  └───────────┘  │              │                         │  │
│  │                 │              │  ┌─────────────────┐    │  │
│  │  ┌───────────┐  │              │  │ Deepgram Proxy  │────┼──┼──▶ Deepgram API
│  │  │ NativeWind│  │              │  └─────────────────┘    │  │
│  │  └───────────┘  │              │                         │  │
│  └─────────────────┘              │  ┌─────────────────┐    │  │
│                                   │  │ Claude Proxy    │────┼──┼──▶ Claude API
│                                   │  └─────────────────┘    │  │
│                                   │                         │  │
│                                   └─────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Pourquoi cette architecture ?**

1. **Proxy des API keys** — Les clés Deepgram/Claude restent sur le backend, pas dans l'app mobile (sécurité)
2. **Better Auth** — Nécessite un serveur pour gérer les sessions
3. **Local-first** — Les données utilisateur restent sur le device (SQLite), le backend gère uniquement l'auth et les appels IA
4. **Scalable** — Tu pourras ajouter la sync cloud plus tard sans refonte

---

## Clés API et variables d'environnement

### Backend (Hono / Cloudflare Workers)

```env
# Neon Database
DATABASE_URL=postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/recall_people?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=https://api.recall-people.com

# Deepgram
DEEPGRAM_API_KEY=your-deepgram-api-key

# Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key

# Cloudflare (si besoin)
CLOUDFLARE_ACCOUNT_ID=xxx
```

### Mobile (Expo)

```env
# API Backend
EXPO_PUBLIC_API_URL=https://api.recall-people.com

# App scheme (pour Better Auth OAuth callbacks)
EXPO_PUBLIC_APP_SCHEME=recall-people
```

---

## Structure des projets

### Backend Hono

```
recall-people-api/
├── src/
│   ├── index.ts                 # Entry point Hono
│   ├── routes/
│   │   ├── auth.ts              # Routes Better Auth
│   │   ├── transcribe.ts        # Proxy Deepgram
│   │   └── extract.ts           # Proxy Claude
│   ├── lib/
│   │   ├── auth.ts              # Config Better Auth
│   │   ├── db.ts                # Client Prisma + Neon
│   │   ├── deepgram.ts          # Client Deepgram
│   │   └── claude.ts            # Client Claude
│   └── middleware/
│       └── auth.ts              # Middleware vérification session
├── prisma/
│   └── schema.prisma            # Schéma Prisma
├── package.json
├── tsconfig.json
└── wrangler.toml                # Config Cloudflare Workers
```

### Mobile Expo

```
recall-people/
├── app/                          # Expo Router pages
│   ├── (auth)/                   # Routes authentification
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Routes principales (tab navigation)
│   │   ├── index.tsx             # Home (capture)
│   │   ├── contacts.tsx          # Liste contacts
│   │   ├── search.tsx            # Recherche IA
│   │   └── _layout.tsx
│   ├── contact/
│   │   └── [id].tsx              # Fiche contact détaillée
│   ├── review.tsx                # Review des infos extraites
│   ├── disambiguation.tsx        # Sélection contact si plusieurs matchs
│   └── _layout.tsx
├── components/
│   ├── ui/                       # Composants UI réutilisables
│   ├── RecordButton.tsx          # Bouton d'enregistrement principal
│   ├── AudioWaveform.tsx         # Visualisation audio
│   ├── ContactCard.tsx           # Card contact dans les listes
│   ├── FactCard.tsx              # Card pour les facts extraits
│   ├── NoteTimeline.tsx          # Timeline des notes sur un contact
│   └── DisambiguationCard.tsx    # Card pour sélection contact
├── lib/
│   ├── auth.ts                   # Config Better Auth client
│   ├── db.ts                     # SQLite setup et queries
│   ├── api.ts                    # Client API backend
│   └── audio.ts                  # Helpers enregistrement audio
├── hooks/
│   ├── useAuth.ts                # Hook authentification
│   ├── useRecording.ts           # Hook enregistrement audio
│   ├── useContacts.ts            # Hook CRUD contacts
│   └── useNotes.ts               # Hook CRUD notes
├── stores/
│   └── app-store.ts              # Zustand store global
├── types/
│   └── index.ts                  # Types TypeScript
└── constants/
    └── theme.ts                  # Couleurs, spacing, etc.
```

---

## Backend Hono — Implémentation complète

### Entry point

```typescript
// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { transcribeRoutes } from './routes/transcribe';
import { extractRoutes } from './routes/extract';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['recall-people://', 'http://localhost:8081'], // Expo dev + app scheme
  credentials: true,
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'recall-people-api' }));

// Routes
app.route('/auth', authRoutes);
app.route('/api/transcribe', transcribeRoutes);
app.route('/api/extract', extractRoutes);

export default app;
```

### Configuration Better Auth

```typescript
// src/lib/auth.ts

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './db';

export const createAuth = (env: {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}) => {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 jours
      updateAge: 60 * 60 * 24, // Update session every 24h
    },
  });
};
```

### Routes Auth

```typescript
// src/routes/auth.ts

import { Hono } from 'hono';
import { createAuth } from '../lib/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.all('/*', async (c) => {
  const auth = createAuth({
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  });
  
  return auth.handler(c.req.raw);
});
```

### Route Transcription (Proxy Deepgram)

```typescript
// src/routes/transcribe.ts

import { Hono } from 'hono';
import { createClient } from '@deepgram/sdk';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DEEPGRAM_API_KEY: string;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export const transcribeRoutes = new Hono<{ Bindings: Bindings }>();

// Protéger la route avec auth
transcribeRoutes.use('/*', authMiddleware);

transcribeRoutes.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    const deepgram = createClient(c.env.DEEPGRAM_API_KEY);
    
    const audioBuffer = await audioFile.arrayBuffer();
    
    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      {
        model: 'nova-3',           // Dernier modèle Deepgram (meilleure accuracy)
        language: 'fr',
        smart_format: true,
        punctuate: true,
      }
    );

    const transcript = result.results.channels[0].alternatives[0].transcript;

    return c.json({ 
      success: true,
      transcript,
      confidence: result.results.channels[0].alternatives[0].confidence,
      duration: result.metadata.duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return c.json({ error: 'Transcription failed' }, 500);
  }
});
```

### Route Extraction IA (Proxy Claude)

```typescript
// src/routes/extract.ts

import { Hono } from 'hono';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  ANTHROPIC_API_KEY: string;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

type ExtractionRequest = {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    tags: string[];
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
  };
};

export const extractRoutes = new Hono<{ Bindings: Bindings }>();

extractRoutes.use('/*', authMiddleware);

extractRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json<ExtractionRequest>();
    const { transcription, existingContacts, currentContact } = body;

    if (!transcription) {
      return c.json({ error: 'No transcription provided' }, 400);
    }

    const anthropic = new Anthropic({
      apiKey: c.env.ANTHROPIC_API_KEY,
    });

    const prompt = buildExtractionPrompt(transcription, existingContacts, currentContact);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parser le JSON de la réponse
    const extraction = JSON.parse(content.text);

    return c.json({
      success: true,
      extraction,
    });
  } catch (error) {
    console.error('Extraction error:', error);
    return c.json({ error: 'Extraction failed' }, 500);
  }
});

const buildExtractionPrompt = (
  transcription: string,
  existingContacts: ExtractionRequest['existingContacts'],
  currentContact?: ExtractionRequest['currentContact']
): string => {
  const contactsContext = existingContacts
    .map(c => `- "${c.firstName}${c.lastName ? ' ' + c.lastName : ''}" (id: ${c.id}, tags: ${c.tags.join(', ') || 'aucun'})`)
    .join('\n');

  const currentContactContext = currentContact
    ? `
CONTACT ACTUELLEMENT SÉLECTIONNÉ:
- Nom: ${currentContact.firstName} ${currentContact.lastName || ''}
- ID: ${currentContact.id}
- Infos existantes:
${currentContact.facts.map(f => `  • ${f.factKey}: ${f.factValue}`).join('\n')}`
    : '';

  return `Tu es un assistant qui extrait des informations sur des personnes à partir de notes vocales transcrites en français.

CONTACTS EXISTANTS DE L'UTILISATEUR:
${contactsContext || '(aucun contact existant)'}
${currentContactContext}

TRANSCRIPTION DE LA NOTE VOCALE:
"${transcription}"

TÂCHE:
1. Identifie la personne mentionnée dans la note (compare avec les contacts existants)
2. Extrais les informations factuelles (job, entreprise, ville, relations familiales, anniversaire, centres d'intérêt, téléphone, email)
3. Génère un résumé court de la note

RÈGLES IMPORTANTES:
- Si le prénom mentionné correspond à PLUSIEURS contacts existants, mets needsDisambiguation: true et liste les IDs possibles dans suggestedMatches
- Si le prénom ne correspond à AUCUN contact existant, mets id: null (c'est un nouveau contact)
- Si le prénom correspond à UN SEUL contact, mets son ID et needsDisambiguation: false
- Pour les facts, utilise action: "add" si c'est une nouvelle info, "update" si ça modifie une info existante
- Sois CONSERVATEUR : n'extrais QUE ce qui est explicitement dit, pas d'inférences
- Les relations (femme, mari, fils, fille, frère, sœur, collègue, boss) ont le factType "relationship"
- Le factKey doit être en français et lisible (ex: "Poste", "Entreprise", "Fils", "Ville")

RÉPONDS UNIQUEMENT EN JSON VALIDE (pas de markdown, pas de commentaires):
{
  "contactIdentified": {
    "id": "string ou null si nouveau contact",
    "firstName": "Prénom extrait de la transcription",
    "lastName": "Nom de famille si mentionné, sinon null",
    "confidence": "high|medium|low",
    "needsDisambiguation": true|false,
    "suggestedMatches": ["id1", "id2"]
  },
  "facts": [
    {
      "factType": "job|company|city|relationship|birthday|interest|phone|email|custom",
      "factKey": "Label en français (ex: Poste, Entreprise, Fils)",
      "factValue": "La valeur extraite",
      "action": "add|update",
      "previousValue": "Ancienne valeur si update et connue, sinon null"
    }
  ],
  "note": {
    "summary": "Résumé en 1-2 phrases maximum",
    "keyPoints": ["Point clé 1", "Point clé 2"]
  }
}`;
};
```

### Middleware Auth

```typescript
// src/middleware/auth.ts

import { Context, Next } from 'hono';
import { createAuth } from '../lib/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export const authMiddleware = async (c: Context<{ Bindings: Bindings }>, next: Next) => {
  const auth = createAuth({
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  });

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);

  await next();
};
```

### Schéma Prisma (Neon/Postgres)

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]  // Requis pour Cloudflare Workers
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
}

// ============================================
// Tables Better Auth (requises)
// ============================================

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  sessions      Session[]
  accounts      Account[]
  contacts      Contact[]
  notes         Note[]

  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime @map("expires_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  userId    String   @map("user_id")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Account {
  id           String    @id @default(cuid())
  accountId    String    @map("account_id")
  providerId   String    @map("provider_id")
  userId       String    @map("user_id")
  accessToken  String?   @map("access_token")
  refreshToken String?   @map("refresh_token")
  idToken      String?   @map("id_token")
  expiresAt    DateTime? @map("expires_at")
  password     String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("accounts")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("verifications")
}

// ============================================
// Tables métier (pour sync future, optionnel)
// ============================================

// Note: Pour le MVP, les données contacts/notes/facts sont
// stockées localement sur le device (SQLite).
// Ces tables sont prêtes pour une future sync cloud.

model Contact {
  id            String    @id @default(cuid())
  userId        String    @map("user_id")
  firstName     String    @map("first_name")
  lastName      String?   @map("last_name")
  nickname      String?
  photoUrl      String?   @map("photo_url")
  tags          String    @default("[]")  // JSON array stocké en string
  lastContactAt DateTime? @map("last_contact_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  facts         Fact[]
  notes         Note[]

  @@map("contacts")
}

model Fact {
  id           String   @id @default(cuid())
  contactId    String   @map("contact_id")
  factType     String   @map("fact_type")
  factKey      String   @map("fact_key")
  factValue    String   @map("fact_value")
  sourceNoteId String?  @map("source_note_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  contact      Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@map("facts")
}

model Note {
  id              String   @id @default(cuid())
  contactId       String   @map("contact_id")
  userId          String   @map("user_id")
  audioUrl        String?  @map("audio_url")
  audioDurationMs Int?     @map("audio_duration_ms")
  transcription   String?
  summary         String?
  createdAt       DateTime @default(now()) @map("created_at")

  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notes")
}
```

### Client Prisma pour Cloudflare Workers

```typescript
// src/lib/db.ts

import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

// Créer le client Prisma avec l'adapter Neon pour edge
export const createPrismaClient = (databaseUrl: string) => {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(pool);
  
  return new PrismaClient({ adapter });
};

// Singleton pour réutiliser la connexion
let prismaInstance: PrismaClient | null = null;

export const getPrisma = (databaseUrl: string) => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient(databaseUrl);
  }
  return prismaInstance;
};
```

### Config Cloudflare Workers

```toml
# wrangler.toml

name = "recall-people-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
# Les secrets sont configurés via `wrangler secret put`

# Pour le dev local
[env.dev]
vars = { BETTER_AUTH_URL = "http://localhost:8787" }
```

### Package.json Backend

```json
{
  "name": "recall-people-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "hono": "^4.4.0",
    "@anthropic-ai/sdk": "^0.24.0",
    "@deepgram/sdk": "^3.5.0",
    "@neondatabase/serverless": "^0.9.0",
    "@prisma/client": "^7.0.0",
    "@prisma/adapter-neon": "^7.0.0",
    "better-auth": "^0.8.0"
  },
  "devDependencies": {
    "wrangler": "^3.60.0",
    "prisma": "^7.0.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0"
  }
}
```

### Config Drizzle

```typescript
// drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## Mobile Expo — Implémentation

### Schéma SQLite (Local)

```typescript
// lib/db.ts

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('recall_people.db');

export const initDatabase = () => {
  db.execSync(`
    -- Contacts
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      nickname TEXT,
      photo_uri TEXT,
      tags TEXT DEFAULT '[]',
      last_contact_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Facts
    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      fact_type TEXT NOT NULL,
      fact_key TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      source_note_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Notes
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      audio_uri TEXT,
      audio_duration_ms INTEGER,
      transcription TEXT,
      summary TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Pending facts (en attente de validation)
    CREATE TABLE IF NOT EXISTS pending_facts (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      fact_type TEXT NOT NULL,
      fact_key TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      action TEXT NOT NULL,
      previous_value TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Index
    CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at DESC);
    CREATE INDEX IF NOT EXISTS idx_facts_contact ON facts(contact_id);
    CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
  `);
};

export { db };
```

### Client API Backend

```typescript
// lib/api.ts

import * as FileSystem from 'expo-file-system';
import { getSession } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

const apiCall = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const session = await getSession();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token && { Authorization: `Bearer ${session.token}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
};

// Transcription (envoie un fichier audio)
export const transcribeAudio = async (audioUri: string): Promise<{
  transcript: string;
  confidence: number;
  duration: number;
}> => {
  const session = await getSession();
  
  const formData = new FormData();
  
  // Lire le fichier audio et l'ajouter au form
  const audioInfo = await FileSystem.getInfoAsync(audioUri);
  if (!audioInfo.exists) {
    throw new Error('Audio file not found');
  }

  formData.append('audio', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    headers: {
      ...(session?.token && { Authorization: `Bearer ${session.token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Transcription failed');
  }

  return response.json();
};

// Extraction IA
export const extractInfo = async (data: {
  transcription: string;
  existingContacts: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    tags: string[];
  }>;
  currentContact?: {
    id: string;
    firstName: string;
    lastName?: string;
    facts: Array<{
      factType: string;
      factKey: string;
      factValue: string;
    }>;
  };
}): Promise<{
  extraction: ExtractionResult;
}> => {
  return apiCall('/api/extract', {
    method: 'POST',
    body: data,
  });
};

export { apiCall };
```

### Configuration Better Auth Client

```typescript
// lib/auth.ts

import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'recall-people',
      storagePrefix: 'recall_auth',
      storage: SecureStore,
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

### Hook useAuth

```typescript
// hooks/useAuth.ts

import { useSession, signIn, signUp, signOut } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export const useAuth = () => {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        throw new Error(result.error.message);
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        throw new Error(result.error.message);
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return {
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: isPending || isLoading,
    error,
    login,
    register,
    logout,
  };
};
```

### Hook useRecording (mis à jour avec API)

```typescript
// hooks/useRecording.ts

import { useState, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/stores/app-store';
import { transcribeAudio, extractInfo } from '@/lib/api';
import { useContacts } from './useContacts';

export const useRecording = () => {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const { contacts } = useContacts();
  const {
    recordingState,
    setRecordingState,
    setCurrentAudioUri,
    setCurrentTranscription,
    setCurrentExtraction,
  } = useAppStore();

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Permission micro refusée');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setRecordingState('recording');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return null;

    try {
      setRecordingState('processing');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No audio URI');

      setCurrentAudioUri(uri);

      // 1. Transcription via API backend
      const transcriptionResult = await transcribeAudio(uri);
      setCurrentTranscription(transcriptionResult.transcript);

      // 2. Préparer les contacts pour l'extraction
      const contactsForExtraction = contacts.map(c => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        tags: c.tags,
      }));

      // 3. Extraction IA via API backend
      const { extraction } = await extractInfo({
        transcription: transcriptionResult.transcript,
        existingContacts: contactsForExtraction,
      });

      setCurrentExtraction(extraction);
      setRecordingState('reviewing');

      return {
        uri,
        transcription: transcriptionResult.transcript,
        extraction,
      };
    } catch (error) {
      console.error('Failed to process recording:', error);
      setRecordingState('idle');
      throw error;
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }
    setRecordingState('idle');
  };

  return {
    recordingState,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: recordingState === 'recording',
    isProcessing: recordingState === 'processing',
  };
};
```

---

## Types TypeScript (complet)

```typescript
// types/index.ts

// ============================================
// Enums et types de base
// ============================================

export type Tag = 'client' | 'prospect' | 'ami' | 'famille' | 'collegue' | 'autre';

export type FactType =
  | 'job'
  | 'company'
  | 'city'
  | 'relationship'
  | 'birthday'
  | 'interest'
  | 'phone'
  | 'email'
  | 'custom';

export type FactAction = 'add' | 'update';

export type PendingFactStatus = 'pending' | 'applied' | 'rejected';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'reviewing';

export type Confidence = 'high' | 'medium' | 'low';

// ============================================
// Entités principales
// ============================================

export type Contact = {
  id: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  photoUri?: string;
  tags: Tag[];
  lastContactAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Fact = {
  id: string;
  contactId: string;
  factType: FactType;
  factKey: string;
  factValue: string;
  sourceNoteId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  contactId: string;
  audioUri?: string;
  audioDurationMs?: number;
  transcription?: string;
  summary?: string;
  createdAt: string;
};

export type PendingFact = {
  id: string;
  noteId: string;
  contactId: string;
  factType: FactType;
  factKey: string;
  factValue: string;
  action: FactAction;
  previousValue?: string;
  status: PendingFactStatus;
  createdAt: string;
};

// ============================================
// Résultats d'extraction IA
// ============================================

export type ExtractedFact = {
  factType: FactType;
  factKey: string;
  factValue: string;
  action: FactAction;
  previousValue?: string;
};

export type ExtractionResult = {
  contactIdentified: {
    id: string | null;
    firstName: string;
    lastName?: string;
    confidence: Confidence;
    needsDisambiguation: boolean;
    suggestedMatches?: string[];
  };
  facts: ExtractedFact[];
  note: {
    summary: string;
    keyPoints: string[];
  };
};

// ============================================
// Pour les écrans
// ============================================

export type ContactWithDetails = Contact & {
  facts: Fact[];
  notes: Note[];
};

export type DisambiguationOption = {
  contact: Contact;
  isNew: boolean;
};

export type SearchResult = {
  contactId: string;
  contact: Contact;
  matchedNote?: Note;
  matchedFact?: Fact;
  relevanceScore: number;
  highlightedText: string;
};

// ============================================
// Navigation params
// ============================================

export type ReviewScreenParams = {
  contactId: string;
  audioUri: string;
  transcription: string;
  extraction: ExtractionResult;
};

export type DisambiguationScreenParams = {
  audioUri: string;
  transcription: string;
  extraction: ExtractionResult;
  possibleContacts: Contact[];
};

export type ContactDetailParams = {
  id: string;
};
```

---

## Flow utilisateur détaillé

### Flow 1 : Capture d'une note vocale (cas nominal)

```
1. USER ouvre l'app
   → Affiche HomeScreen avec gros bouton micro au centre

2. USER appuie sur le bouton micro
   → Le bouton devient rouge
   → Animation d'ondes audio
   → Enregistrement démarre (expo-av)

3. USER parle : "Je viens de voir Marie Dupont, elle m'a dit
   qu'elle avait changé de job, elle est directrice marketing
   maintenant chez L'Oréal. Son fils Lucas passe le bac cette année."

4. USER relâche le bouton (ou tap pour stopper)
   → Enregistrement s'arrête
   → Affiche loader "Transcription en cours..."
   → POST /api/transcribe avec le fichier audio
   → Backend appelle Deepgram

5. SYSTEM reçoit la transcription
   → Affiche loader "Analyse en cours..."
   → POST /api/extract avec transcription + contacts existants
   → Backend appelle Claude

6. SYSTEM analyse et identifie :
   - Contact : "Marie Dupont"
   - Recherche dans la liste des contacts envoyée

7a. SI un seul match trouvé (Marie Dupont existe) :
    → Passe directement à ReviewScreen

7b. SI plusieurs matchs (2 "Marie" dans les contacts) :
    → Affiche DisambiguationScreen
    → USER sélectionne le bon contact
    → Passe à ReviewScreen

7c. SI aucun match :
    → Propose de créer un nouveau contact
    → USER confirme
    → Crée le contact localement (SQLite)
    → Passe à ReviewScreen

8. ReviewScreen affiche :
   - Infos extraites avec checkboxes :
     ☑️ Poste : → Directrice Marketing
     ☑️ Entreprise : → L'Oréal
     ☑️ Relation ajoutée : Fils = Lucas (bac 2025)
   - Note résumée :
     ☑️ "A changé de job, son fils passe le bac"

9. USER peut :
   - Décocher des facts qu'il ne veut pas sauver
   - Modifier manuellement
   - Appuyer sur "Tout appliquer"

10. SYSTEM applique les changements (SQLite local) :
    - INSERT/UPDATE facts dans la table facts
    - INSERT note dans la table notes
    - UPDATE lastContactAt du contact

11. SuccessScreen :
    - Animation de confirmation
    - "Marie Dupont mise à jour !"
    - Boutons : [Voir la fiche] [Nouvelle note]
```

### Flow 2 : Disambiguation

```
┌─────────────────────────────────┐
│ ←                               │
│                                 │
│ Qui est "Marie" ?               │
│ Tu as mentionné Marie dans      │
│ ta note                         │
│                                 │
│ ┌─────────────────────────────┐│
│ │ ▶️ ════════════════ 0:12   ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─────────────────────────────┐│
│ │ 👩‍💼 Marie Dupont             ││
│ │    Cliente • L'Oréal        ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─────────────────────────────┐│
│ │ 👩 Marie                     ││
│ │    Famille • Sœur           ││
│ └─────────────────────────────┘│
│                                 │
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
│   + Nouvelle personne "Marie"  │
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│
│                                 │
└─────────────────────────────────┘
```

### Flow 3 : Review Screen

```
┌─────────────────────────────────┐
│ ←                               │
│                                 │
│ 👩‍💼  Marie Dupont                │
│     Mise à jour du contact      │
│                                 │
│ ┌─────────────────────────────┐│
│ │ ✨ IA — Infos extraites      ││
│ └─────────────────────────────┘│
│                                 │
│ ── Informations détectées ─────│
│                                 │
│ ┌─────────────────────────────┐│
│ │ ☑️ 💼 Poste                  ││
│ │    → Directrice Marketing   ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─────────────────────────────┐│
│ │ ☑️ 🏢 Entreprise             ││
│ │    + L'Oréal                ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─────────────────────────────┐│
│ │ ☑️ 👶 Fils                   ││
│ │    + Lucas (bac 2025)       ││
│ └─────────────────────────────┘│
│                                 │
│ ── Note ───────────────────────│
│                                 │
│ ┌─────────────────────────────┐│
│ │ ☑️ 💬 Aujourd'hui            ││
│ │ "A changé de job..."        ││
│ └─────────────────────────────┘│
│                                 │
│ ┌─────────────────────────────┐│
│ │      Tout appliquer         ││
│ └─────────────────────────────┘│
│       Modifier manuellement    │
└─────────────────────────────────┘
```

---

## Design System

### Couleurs (NativeWind)

```javascript
// tailwind.config.js

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        background: '#09090b',      // zinc-950
        surface: '#18181b',         // zinc-900
        surfaceHover: '#27272a',    // zinc-800

        // Text
        textPrimary: '#fafafa',     // zinc-50
        textSecondary: '#a1a1aa',   // zinc-400
        textMuted: '#71717a',       // zinc-500

        // Accent
        primary: '#8b5cf6',         // violet-500
        primaryDark: '#6366f1',     // indigo-500

        // Status
        success: '#22c55e',         // green-500
        warning: '#f59e0b',         // amber-500
        error: '#ef4444',           // red-500
      },
    },
  },
  plugins: [],
};
```

### Icônes par FactType

```typescript
// constants/factIcons.ts

import { Briefcase, Building2, MapPin, Heart, Cake, Star, Phone, Mail, Tag } from 'lucide-react-native';

export const factIcons: Record<FactType, typeof Briefcase> = {
  job: Briefcase,
  company: Building2,
  city: MapPin,
  relationship: Heart,
  birthday: Cake,
  interest: Star,
  phone: Phone,
  email: Mail,
  custom: Tag,
};
```

---

## Commandes de setup

### Backend

```bash
# Créer le projet
mkdir recall-people-api && cd recall-people-api
npm init -y

# Installer les dépendances
npm install hono @anthropic-ai/sdk @deepgram/sdk @neondatabase/serverless @prisma/client @prisma/adapter-neon better-auth

npm install -D wrangler prisma typescript @types/node

# Initialiser Prisma
npx prisma init

# Configurer les secrets Cloudflare
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put DEEPGRAM_API_KEY
wrangler secret put ANTHROPIC_API_KEY

# Générer le client Prisma et pousser le schéma
npm run db:generate
npm run db:push

# Dev local
npm run dev

# Déployer
npm run deploy
```

### Mobile

```bash
# Dans le projet Expo existant
cd recall-people

# Dépendances Expo
npx expo install expo-av expo-file-system expo-secure-store expo-haptics expo-linear-gradient expo-sqlite

# Navigation
npx expo install expo-router

# NativeWind
npm install nativewind tailwindcss
npx tailwindcss init

# State management
npm install zustand

# Better Auth client
npm install better-auth @better-auth/expo

# Icônes
npm install lucide-react-native react-native-svg

# Utils
npm install nanoid
```

---

## Checklist de développement

### Phase 1 : Backend (Jour 1-2)
- [ ] Setup projet Hono
- [ ] Configurer Prisma + Neon (avec adapter edge)
- [ ] Créer le schéma Prisma et pousser
- [ ] Implémenter routes auth avec Better Auth
- [ ] Implémenter route /api/transcribe (Deepgram Nova-3)
- [ ] Implémenter route /api/extract (Claude)
- [ ] Déployer sur Cloudflare Workers
- [ ] Tester avec curl/Postman

### Phase 2 : Mobile - Base (Jour 2-3)
- [ ] Configurer NativeWind
- [ ] Initialiser SQLite + tables
- [ ] Setup Better Auth client
- [ ] Créer écrans auth (login/register)
- [ ] Protection des routes
- [ ] Layout avec tab navigation

### Phase 3 : Mobile - Core (Jour 3-5)
- [ ] HomeScreen avec bouton record
- [ ] Hook useRecording
- [ ] Intégration API transcribe
- [ ] Intégration API extract
- [ ] DisambiguationScreen
- [ ] ReviewScreen
- [ ] SuccessScreen
- [ ] Sauvegarder en SQLite local

### Phase 4 : Mobile - Contacts (Jour 5-6)
- [ ] ContactsListScreen
- [ ] ContactDetailScreen
- [ ] Hook useContacts
- [ ] Affichage facts + timeline
- [ ] Indicateur contacts "stale"

### Phase 5 : Mobile - Search (Jour 6-7)
- [ ] SearchScreen
- [ ] Recherche full-text SQLite
- [ ] Suggestions de recherche
- [ ] Affichage résultats

### Phase 6 : Polish (Jour 7+)
- [ ] Animations (Reanimated)
- [ ] Haptic feedback partout
- [ ] Gestion erreurs/offline
- [ ] Loading states
- [ ] Empty states
- [ ] Onboarding premier lancement

---

## Points d'attention

### Sécurité
- Les clés API (Deepgram, Claude) sont UNIQUEMENT sur le backend
- L'app mobile ne contient aucune clé sensible
- Toutes les routes API sont protégées par auth

### Performance
- Limite 2 minutes par enregistrement audio
- Compression audio côté client avant upload
- SQLite avec index pour les queries fréquentes

### UX
- Feedback immédiat sur toutes les actions
- Haptic feedback sur record start/stop
- Loading states explicites
- Gestion gracieuse des erreurs réseau

### Offline
- L'app fonctionne offline pour la consultation (SQLite local)
- Les nouvelles notes nécessitent une connexion (API transcription/extraction)
- Queue les actions échouées pour retry
