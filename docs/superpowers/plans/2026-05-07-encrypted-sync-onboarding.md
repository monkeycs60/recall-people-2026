# Encrypted Sync and Onboarding Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cross-platform encrypted contact backup/restore with a generated recovery phrase, refresh onboarding around the app's core value, move detailed privacy content to Profile, and update the landing page.

**Architecture:** Store only encrypted backup snapshots on the backend, keyed by authenticated `userId`. The app exports local SQLite data into a versioned JSON payload, encrypts/decrypts it client-side with a recovery phrase, and restores into SQLite only when the user confirms. Onboarding becomes value-first and ends with a privacy-led backup prompt.

**Tech Stack:** Expo React Native, Expo SQLite, Expo SecureStore, Expo Crypto random bytes, `@noble/ciphers` AES-GCM, `@noble/hashes` PBKDF2-SHA256, Hono API, Prisma/Postgres, Next.js landing page.

**Multi-device behavior:** This release is encrypted backup/restore, not live multi-device merge sync. A user can log into the same account on several phones, restore the latest encrypted snapshot with the recovery phrase, and manually refresh the backup from a device. If two devices diverge, the latest uploaded snapshot becomes the restorable version. The UI must label this as encrypted backup/restore, show `updatedAt` and `deviceLabel`, and avoid silent background uploads that could overwrite another phone's backup without user intent.

---

## File Structure

Backend:

- Modify `backend/prisma/schema.prisma`: add `SyncSnapshot`.
- Create `backend/prisma/migrations/20260507000000_add_sync_snapshots/migration.sql`: SQL table and indexes.
- Create `backend/src/routes/sync.ts`: authenticated snapshot metadata, upload, download, delete.
- Modify `backend/src/index.ts`: mount `/api/sync`.
- Create `backend/test/sync-routes.test.mjs`: route validation tests.

Frontend domain:

- Modify `frontend/package.json` and `frontend/package-lock.json`: add crypto dependencies.
- Create `frontend/lib/recovery-phrase.ts`: generated English-word recovery phrases.
- Create `frontend/lib/backup-crypto.ts`: derive key, encrypt payload, decrypt payload.
- Create `frontend/lib/backup-payload.ts`: payload schema, export from SQLite rows, import into SQLite.
- Create `frontend/lib/backup-api.ts`: API client for `/api/sync`.
- Create `frontend/services/backup.service.ts`: orchestration for setup, upload, restore, status.
- Create `frontend/stores/backup-store.ts`: UI-facing backup state.
- Modify `frontend/lib/db.ts`: expose a safe `isLocalDatabaseEmpty` helper.

Frontend UI:

- Create `frontend/components/profile/EncryptedBackupSheet.tsx`: setup/restore/manage sheet.
- Modify `frontend/app/(tabs)/profile.tsx`: add backup row above export and privacy/AI row.
- Modify `frontend/components/Onboarding.tsx`: new slide sequence and final backup prompt.
- Modify `frontend/locales/en.json`, `frontend/locales/fr.json`, then mirror keys in `es/it/de`.
- Add generated assets under `frontend/assets/ai-assets/` with stable filenames.

Landing page:

- Modify `landing-page/src/components/Hero.tsx`, `FeatureSection.tsx` or `Features.tsx`, `Privacy.tsx`, and relevant mockup components to show encrypted backup and the new product value story.

Tests:

- Create `frontend/test/recovery-phrase.test.mjs`.
- Create `frontend/test/backup-crypto.test.mjs`.
- Create `frontend/test/backup-payload.test.mjs`.
- Create `frontend/test/backup-status.test.mjs`.
- Update onboarding tests or add `frontend/test/onboarding-flow.test.mjs`.

## Task 1: Backend Encrypted Snapshot Storage

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260507000000_add_sync_snapshots/migration.sql`
- Create: `backend/src/routes/sync.ts`
- Modify: `backend/src/index.ts`
- Create: `backend/test/sync-routes.test.mjs`

- [ ] **Step 1: Add failing backend route validation tests**

Create `backend/test/sync-routes.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

const snapshotUploadSchema = z.object({
  schemaVersion: z.literal(1),
  cipher: z.literal('aes-256-gcm'),
  kdf: z.literal('pbkdf2-sha256'),
  kdfIterations: z.number().int().min(300_000).max(1_000_000),
  salt: z.string().min(16),
  nonce: z.string().min(16),
  encryptedBlob: z.string().min(16),
  payloadHash: z.string().min(32),
  deviceLabel: z.string().max(120).optional(),
});

test('accepts a valid encrypted sync snapshot upload body', () => {
  const parsed = snapshotUploadSchema.safeParse({
    schemaVersion: 1,
    cipher: 'aes-256-gcm',
    kdf: 'pbkdf2-sha256',
    kdfIterations: 310000,
    salt: 'base64-salt-value',
    nonce: 'base64-nonce-value',
    encryptedBlob: 'base64-encrypted-payload',
    payloadHash: 'sha256:1234567890abcdef1234567890abcdef',
    deviceLabel: 'iPhone de Clement',
  });

  assert.equal(parsed.success, true);
});

test('rejects weak kdf iteration counts', () => {
  const parsed = snapshotUploadSchema.safeParse({
    schemaVersion: 1,
    cipher: 'aes-256-gcm',
    kdf: 'pbkdf2-sha256',
    kdfIterations: 1000,
    salt: 'base64-salt-value',
    nonce: 'base64-nonce-value',
    encryptedBlob: 'base64-encrypted-payload',
    payloadHash: 'sha256:1234567890abcdef1234567890abcdef',
  });

  assert.equal(parsed.success, false);
});
```

- [ ] **Step 2: Run test to verify current gap**

Run:

```bash
cd backend
npm test -- sync-routes.test.mjs
```

Expected: this file runs and validates the schema locally. The API route is not implemented yet.

- [ ] **Step 3: Add Prisma model**

In `backend/prisma/schema.prisma`, add this relation to `User`:

```prisma
  syncSnapshot  SyncSnapshot?
```

Add this model near the business tables:

```prisma
model SyncSnapshot {
  id             String   @id @default(cuid())
  userId         String   @unique @map("user_id")
  schemaVersion  Int      @map("schema_version")
  cipher         String
  kdf            String
  kdfIterations  Int      @map("kdf_iterations")
  salt           String
  nonce          String
  encryptedBlob  String   @map("encrypted_blob")
  payloadHash    String   @map("payload_hash")
  deviceLabel    String?  @map("device_label")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sync_snapshots")
  @@index([updatedAt])
}
```

- [ ] **Step 4: Add SQL migration**

Create `backend/prisma/migrations/20260507000000_add_sync_snapshots/migration.sql`:

```sql
CREATE TABLE "sync_snapshots" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "cipher" TEXT NOT NULL,
  "kdf" TEXT NOT NULL,
  "kdf_iterations" INTEGER NOT NULL,
  "salt" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "encrypted_blob" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "device_label" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sync_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sync_snapshots_user_id_key" ON "sync_snapshots"("user_id");
CREATE INDEX "sync_snapshots_updated_at_idx" ON "sync_snapshots"("updated_at");

ALTER TABLE "sync_snapshots"
ADD CONSTRAINT "sync_snapshots_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Implement authenticated sync routes**

Create `backend/src/routes/sync.ts`:

```ts
import { Hono } from 'hono';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import { getPrisma } from '../lib/db';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

type AuthContext = {
  user: User;
};

const snapshotUploadSchema = z.object({
  schemaVersion: z.literal(1),
  cipher: z.literal('aes-256-gcm'),
  kdf: z.literal('pbkdf2-sha256'),
  kdfIterations: z.number().int().min(300_000).max(1_000_000),
  salt: z.string().min(16),
  nonce: z.string().min(16),
  encryptedBlob: z.string().min(16),
  payloadHash: z.string().min(32),
  deviceLabel: z.string().trim().max(120).optional(),
});

export const syncRoutes = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

syncRoutes.use('/*', authMiddleware);

syncRoutes.get('/snapshot', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const snapshot = await prisma.syncSnapshot.findUnique({
    where: { userId: user.id },
  });

  if (!snapshot) {
    return c.json({ exists: false });
  }

  return c.json({
    exists: true,
    snapshot: {
      schemaVersion: snapshot.schemaVersion,
      cipher: snapshot.cipher,
      kdf: snapshot.kdf,
      kdfIterations: snapshot.kdfIterations,
      salt: snapshot.salt,
      nonce: snapshot.nonce,
      encryptedBlob: snapshot.encryptedBlob,
      payloadHash: snapshot.payloadHash,
      deviceLabel: snapshot.deviceLabel,
      updatedAt: snapshot.updatedAt.toISOString(),
      createdAt: snapshot.createdAt.toISOString(),
    },
  });
});

syncRoutes.get('/snapshot/meta', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const snapshot = await prisma.syncSnapshot.findUnique({
    where: { userId: user.id },
    select: {
      schemaVersion: true,
      cipher: true,
      kdf: true,
      kdfIterations: true,
      payloadHash: true,
      deviceLabel: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!snapshot) {
    return c.json({ exists: false });
  }

  return c.json({
    exists: true,
    snapshot: {
      ...snapshot,
      createdAt: snapshot.createdAt.toISOString(),
      updatedAt: snapshot.updatedAt.toISOString(),
    },
  });
});

syncRoutes.put('/snapshot', async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  const parsed = snapshotUploadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid sync snapshot', details: parsed.error.issues }, 400);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  const snapshot = await prisma.syncSnapshot.upsert({
    where: { userId: user.id },
    update: parsed.data,
    create: {
      userId: user.id,
      ...parsed.data,
    },
  });

  return c.json({
    success: true,
    snapshot: {
      updatedAt: snapshot.updatedAt.toISOString(),
      payloadHash: snapshot.payloadHash,
    },
  });
});

syncRoutes.delete('/snapshot', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  await prisma.syncSnapshot.deleteMany({ where: { userId: user.id } });
  return c.json({ success: true });
});
```

- [ ] **Step 6: Mount route**

In `backend/src/index.ts`, add:

```ts
import { syncRoutes } from './routes/sync';
```

Then mount after settings:

```ts
app.route('/api/sync', syncRoutes);
```

- [ ] **Step 7: Verify backend**

Run:

```bash
cd backend
npm test
npm run db:generate
```

Expected: all backend tests pass and Prisma client generation succeeds.

- [ ] **Step 8: Commit backend sync storage**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20260507000000_add_sync_snapshots/migration.sql backend/src/routes/sync.ts backend/src/index.ts backend/test/sync-routes.test.mjs
git commit -m "feat: add encrypted sync snapshot api"
```

## Task 2: Frontend Recovery Phrase and Crypto

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/lib/recovery-phrase.ts`
- Create: `frontend/lib/backup-crypto.ts`
- Create: `frontend/test/recovery-phrase.test.mjs`
- Create: `frontend/test/backup-crypto.test.mjs`

- [ ] **Step 1: Install deterministic crypto dependencies**

Run:

```bash
cd frontend
npm install @noble/ciphers @noble/hashes @scure/base @scure/bip39
```

Expected: `package.json` and `package-lock.json` update.

- [ ] **Step 2: Write recovery phrase tests**

Create `frontend/test/recovery-phrase.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'recovery-phrase';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/recovery-phrase.ts',
    suiteName,
  });
}

test('formats generated recovery phrases as four english words and two digits', async () => {
  const { buildRecoveryPhrase } = await loadModule();
  assert.match(buildRecoveryPhrase([0, 1, 2, 3], 47), /^[a-z]+-[a-z]+-[a-z]+-[a-z]+-47$/);
});

test('normalizes recovery phrases before key derivation', async () => {
  const { normalizeRecoveryPhrase } = await loadModule();
  assert.equal(normalizeRecoveryPhrase('  Sun - River - Cobalt - Velvet - 47  '), 'sun-river-cobalt-velvet-47');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

- [ ] **Step 3: Implement recovery phrase generation**

Create `frontend/lib/recovery-phrase.ts`:

```ts
import * as Crypto from 'expo-crypto';
import { wordlist as ENGLISH_WORDS } from '@scure/bip39/wordlists/english';

export const RECOVERY_PHRASE_WORD_COUNT = 4;

export function normalizeRecoveryPhrase(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '').replace(/-+/g, '-');
}

export function buildRecoveryPhrase(wordIndexes: number[], suffixNumber: number): string {
  const words = wordIndexes.map((index) => ENGLISH_WORDS[index % ENGLISH_WORDS.length]);
  const suffix = String(suffixNumber % 100).padStart(2, '0');
  return `${words.join('-')}-${suffix}`;
}

export function generateRecoveryPhrase(): string {
  const random = Crypto.getRandomBytes(RECOVERY_PHRASE_WORD_COUNT * 2 + 1);
  const wordIndexes = Array.from({ length: RECOVERY_PHRASE_WORD_COUNT }, (_, index) => {
    const offset = index * 2;
    return (random[offset] << 8) + random[offset + 1];
  });
  const suffixNumber = random[random.length - 1];
  return buildRecoveryPhrase(wordIndexes, suffixNumber);
}
```

- [ ] **Step 4: Write crypto roundtrip tests**

Create `frontend/test/backup-crypto.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'backup-crypto';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/backup-crypto.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
    },
  });
}

test('encrypts and decrypts backup payloads with the recovery phrase', async () => {
  const { encryptBackupPayload, decryptBackupPayload } = await loadModule();
  const phrase = 'sun-river-cobalt-velvet-47';
  const payload = JSON.stringify({ schemaVersion: 1, contacts: [{ id: 'c1', firstName: 'Alice' }] });

  const encrypted = await encryptBackupPayload(payload, phrase, {
    randomBytes: (length) => new Uint8Array(Array.from({ length }, (_, index) => index + 1)),
    kdfIterations: 300000,
  });

  assert.equal(encrypted.cipher, 'aes-256-gcm');
  assert.equal(encrypted.kdf, 'pbkdf2-sha256');

  const decrypted = await decryptBackupPayload(encrypted, phrase);
  assert.equal(decrypted, payload);
});

test('fails to decrypt with a different recovery phrase', async () => {
  const { encryptBackupPayload, decryptBackupPayload } = await loadModule();
  const encrypted = await encryptBackupPayload('secret', 'sun-river-cobalt-velvet-47', {
    randomBytes: (length) => new Uint8Array(Array.from({ length }, (_, index) => index + 2)),
    kdfIterations: 300000,
  });

  await assert.rejects(() => decryptBackupPayload(encrypted, 'moon-river-cobalt-velvet-47'));
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

- [ ] **Step 5: Implement crypto helpers**

Create `frontend/lib/backup-crypto.ts`:

```ts
import * as Crypto from 'expo-crypto';
import { aesgcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils';
import { base64 } from '@scure/base';
import { normalizeRecoveryPhrase } from './recovery-phrase';

export type EncryptedBackupSnapshot = {
  schemaVersion: 1;
  cipher: 'aes-256-gcm';
  kdf: 'pbkdf2-sha256';
  kdfIterations: number;
  salt: string;
  nonce: string;
  encryptedBlob: string;
  payloadHash: string;
};

type EncryptOptions = {
  randomBytes?: (length: number) => Uint8Array;
  kdfIterations?: number;
};

const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;
const NONCE_LENGTH_BYTES = 12;
const DEFAULT_KDF_ITERATIONS = 310000;

const defaultRandomBytes = (length: number): Uint8Array => Crypto.getRandomBytes(length);

async function deriveKey(recoveryPhrase: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  return pbkdf2Async(sha256, normalizeRecoveryPhrase(recoveryPhrase), salt, {
    c: iterations,
    dkLen: KEY_LENGTH_BYTES,
  });
}

export async function encryptBackupPayload(
  payload: string,
  recoveryPhrase: string,
  options: EncryptOptions = {}
): Promise<EncryptedBackupSnapshot> {
  const randomBytes = options.randomBytes ?? defaultRandomBytes;
  const kdfIterations = options.kdfIterations ?? DEFAULT_KDF_ITERATIONS;
  const salt = randomBytes(SALT_LENGTH_BYTES);
  const nonce = randomBytes(NONCE_LENGTH_BYTES);
  const key = await deriveKey(recoveryPhrase, salt, kdfIterations);
  const encryptedBytes = aesgcm(key, nonce).encrypt(utf8ToBytes(payload));
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload
  );

  return {
    schemaVersion: 1,
    cipher: 'aes-256-gcm',
    kdf: 'pbkdf2-sha256',
    kdfIterations,
    salt: base64.encode(salt),
    nonce: base64.encode(nonce),
    encryptedBlob: base64.encode(encryptedBytes),
    payloadHash: `sha256:${hash}`,
  };
}

export async function decryptBackupPayload(
  snapshot: EncryptedBackupSnapshot,
  recoveryPhrase: string
): Promise<string> {
  const salt = base64.decode(snapshot.salt);
  const nonce = base64.decode(snapshot.nonce);
  const encryptedBytes = base64.decode(snapshot.encryptedBlob);
  const key = await deriveKey(recoveryPhrase, salt, snapshot.kdfIterations);
  const decrypted = aesgcm(key, nonce).decrypt(encryptedBytes);
  const payload = bytesToUtf8(decrypted);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payload
  );

  if (`sha256:${hash}` !== snapshot.payloadHash) {
    throw new Error('Backup payload hash mismatch');
  }

  return payload;
}
```

- [ ] **Step 6: Run frontend crypto tests**

Run:

```bash
cd frontend
npm test -- recovery-phrase.test.mjs backup-crypto.test.mjs
```

Expected: both tests pass.

- [ ] **Step 7: Commit frontend crypto foundation**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/recovery-phrase.ts frontend/lib/backup-crypto.ts frontend/test/recovery-phrase.test.mjs frontend/test/backup-crypto.test.mjs
git commit -m "feat: add backup recovery crypto"
```

## Task 3: Local Backup Export and Restore

**Files:**
- Create: `frontend/lib/backup-payload.ts`
- Modify: `frontend/lib/db.ts`
- Create: `frontend/test/backup-payload.test.mjs`

- [ ] **Step 1: Write payload shape tests**

Create `frontend/test/backup-payload.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'backup-payload';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/backup-payload.ts',
    suiteName,
  });
}

test('serializes rows into a versioned backup payload', async () => {
  const { buildBackupPayload } = await loadModule();
  const payload = buildBackupPayload({
    contacts: [{ id: 'c1', first_name: 'Alice', updated_at: '2026-01-01T00:00:00.000Z' }],
    notes: [{ id: 'n1', contact_id: 'c1', transcription: 'Met at Station F', updated_at: '2026-01-01T00:00:00.000Z' }],
    hotTopics: [],
    groups: [],
    contactGroups: [],
  });

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.contacts[0].first_name, 'Alice');
  assert.equal(payload.notes[0].contact_id, 'c1');
});

test('rejects unsupported backup schema versions', async () => {
  const { parseBackupPayload } = await loadModule();
  assert.throws(() => parseBackupPayload(JSON.stringify({ schemaVersion: 999 })));
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

- [ ] **Step 2: Implement payload helpers**

Create `frontend/lib/backup-payload.ts`:

```ts
import { z } from 'zod';
import { getDatabase } from './db';

const contactRowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));
const genericRowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

const TABLE_COLUMNS = {
  contacts: [
    'id',
    'first_name',
    'last_name',
    'nickname',
    'gender',
    'email',
    'phone',
    'birthday_day',
    'birthday_month',
    'birthday_year',
    'relationship_type',
    'photo_uri',
    'avatar_url',
    'ai_summary',
    'suggested_questions',
    'meeting_context',
    'last_contact_at',
    'created_at',
    'updated_at',
  ],
  groups: ['id', 'name', 'created_at', 'updated_at'],
  notes: [
    'id',
    'contact_id',
    'title',
    'transcription',
    'audio_uri',
    'audio_duration_ms',
    'created_at',
    'updated_at',
  ],
  hot_topics: [
    'id',
    'contact_id',
    'title',
    'context',
    'event_date',
    'status',
    'resolution',
    'resolved_at',
    'source_note_id',
    'notified_at',
    'birthday_contact_id',
    'created_at',
    'updated_at',
  ],
  contact_groups: ['contact_id', 'group_id', 'created_at'],
} as const;

type BackupTableName = keyof typeof TABLE_COLUMNS;

export const backupPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  contacts: z.array(contactRowSchema),
  notes: z.array(genericRowSchema),
  hotTopics: z.array(genericRowSchema),
  groups: z.array(genericRowSchema),
  contactGroups: z.array(genericRowSchema),
});

export type BackupPayload = z.infer<typeof backupPayloadSchema>;

export function buildBackupPayload(rows: Omit<BackupPayload, 'schemaVersion' | 'exportedAt'>): BackupPayload {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    ...rows,
  };
}

export function parseBackupPayload(json: string): BackupPayload {
  return backupPayloadSchema.parse(JSON.parse(json));
}

export async function exportLocalBackupPayload(): Promise<BackupPayload> {
  const db = await getDatabase();
  const [contacts, notes, hotTopics, groups, contactGroups] = await Promise.all([
    db.getAllAsync<Record<string, string | number | null>>('SELECT * FROM contacts'),
    db.getAllAsync<Record<string, string | number | null>>('SELECT * FROM notes'),
    db.getAllAsync<Record<string, string | number | null>>('SELECT * FROM hot_topics'),
    db.getAllAsync<Record<string, string | number | null>>('SELECT * FROM groups'),
    db.getAllAsync<Record<string, string | number | null>>('SELECT * FROM contact_groups'),
  ]);

  return buildBackupPayload({ contacts, notes, hotTopics, groups, contactGroups });
}

export async function importLocalBackupPayload(payload: BackupPayload): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('BEGIN TRANSACTION');

  try {
    await db.runAsync('DELETE FROM contact_groups');
    await db.runAsync('DELETE FROM hot_topics');
    await db.runAsync('DELETE FROM notes');
    await db.runAsync('DELETE FROM groups');
    await db.runAsync('DELETE FROM contacts');

    for (const contact of payload.contacts) {
      await insertRow(db, 'contacts', contact);
    }
    for (const group of payload.groups) {
      await insertRow(db, 'groups', group);
    }
    for (const note of payload.notes) {
      await insertRow(db, 'notes', note);
    }
    for (const topic of payload.hotTopics) {
      await insertRow(db, 'hot_topics', topic);
    }
    for (const contactGroup of payload.contactGroups) {
      await insertRow(db, 'contact_groups', contactGroup);
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}

async function insertRow(
  db: Awaited<ReturnType<typeof getDatabase>>,
  table: BackupTableName,
  row: Record<string, string | number | null>
) {
  const allowedColumns = TABLE_COLUMNS[table];
  const columns = allowedColumns.filter((column) => Object.prototype.hasOwnProperty.call(row, column));
  if (columns.length === 0) {
    return;
  }
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((column) => row[column]);
  await db.runAsync(
    `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
}
```

- [ ] **Step 3: Add database empty helper**

In `frontend/lib/db.ts`, add:

```ts
export const isLocalDatabaseEmpty = async (): Promise<boolean> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM contacts'
  );
  return (result?.count ?? 0) === 0;
};
```

- [ ] **Step 4: Run payload tests**

Run:

```bash
cd frontend
npm test -- backup-payload.test.mjs
```

Expected: tests pass.

- [ ] **Step 5: Commit backup payload import/export**

```bash
git add frontend/lib/backup-payload.ts frontend/lib/db.ts frontend/test/backup-payload.test.mjs
git commit -m "feat: add local backup payload import export"
```

## Task 4: Backup API, Service, and Store

**Files:**
- Create: `frontend/lib/backup-api.ts`
- Create: `frontend/services/backup.service.ts`
- Create: `frontend/stores/backup-store.ts`
- Create: `frontend/test/backup-status.test.mjs`

- [ ] **Step 1: Write backup status reducer tests**

Create `frontend/test/backup-status.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'backup-status';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'stores/backup-store.ts',
    suiteName,
    esbuildOptions: {
      external: ['zustand', 'zustand/middleware'],
    },
  });
}

test('formats backup status from metadata', async () => {
  const { getBackupStatusLabel } = await loadModule();
  assert.equal(getBackupStatusLabel(null), 'not_enabled');
  assert.equal(getBackupStatusLabel({ updatedAt: '2026-05-07T10:00:00.000Z' }), 'enabled');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

- [ ] **Step 2: Implement backup API client**

Create `frontend/lib/backup-api.ts`:

```ts
import { getToken, refreshAccessToken } from './auth';
import { API_URL } from './config';
import type { EncryptedBackupSnapshot } from './backup-crypto';

export type BackupSnapshotResponse = {
  exists: boolean;
  snapshot?: EncryptedBackupSnapshot & {
    deviceLabel?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export async function getBackupSnapshot(): Promise<BackupSnapshotResponse> {
  return backupFetch('/api/sync/snapshot');
}

export async function getBackupSnapshotMeta(): Promise<BackupSnapshotResponse> {
  return backupFetch('/api/sync/snapshot/meta');
}

export async function uploadBackupSnapshot(
  snapshot: EncryptedBackupSnapshot & { deviceLabel?: string }
): Promise<{ success: true; snapshot: { updatedAt: string; payloadHash: string } }> {
  return backupFetch('/api/sync/snapshot', {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  });
}

export async function deleteBackupSnapshot(): Promise<{ success: true }> {
  return backupFetch('/api/sync/snapshot', { method: 'DELETE' });
}

async function backupFetch<T>(endpoint: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return backupFetch<T>(endpoint, init, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Backup API failed with ${response.status}`);
  }

  return response.json();
}
```

- [ ] **Step 3: Implement backup service**

Create `frontend/services/backup.service.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encryptBackupPayload, decryptBackupPayload } from '@/lib/backup-crypto';
import { exportLocalBackupPayload, importLocalBackupPayload, parseBackupPayload } from '@/lib/backup-payload';
import { uploadBackupSnapshot, getBackupSnapshot, getBackupSnapshotMeta, deleteBackupSnapshot } from '@/lib/backup-api';

const RECOVERY_PHRASE_KEY = 'backup_recovery_phrase';

export const backupService = {
  saveRecoveryPhrase: async (phrase: string) => {
    await SecureStore.setItemAsync(RECOVERY_PHRASE_KEY, phrase);
  },

  getSavedRecoveryPhrase: async (): Promise<string | null> => {
    return SecureStore.getItemAsync(RECOVERY_PHRASE_KEY);
  },

  clearSavedRecoveryPhrase: async () => {
    await SecureStore.deleteItemAsync(RECOVERY_PHRASE_KEY);
  },

  fetchStatus: async () => {
    return getBackupSnapshotMeta();
  },

  createOrRefreshBackup: async (recoveryPhrase: string) => {
    const payload = await exportLocalBackupPayload();
    const encrypted = await encryptBackupPayload(JSON.stringify(payload), recoveryPhrase);
    const deviceLabel = Platform.OS === 'ios' ? 'iPhone' : 'Android device';
    return uploadBackupSnapshot({ ...encrypted, deviceLabel });
  },

  restoreBackup: async (recoveryPhrase: string) => {
    const response = await getBackupSnapshot();
    if (!response.exists || !response.snapshot) {
      throw new Error('No encrypted backup found');
    }
    const decrypted = await decryptBackupPayload(response.snapshot, recoveryPhrase);
    const payload = parseBackupPayload(decrypted);
    await importLocalBackupPayload(payload);
    await backupService.saveRecoveryPhrase(recoveryPhrase);
    return payload;
  },

  deleteBackup: async () => {
    await deleteBackupSnapshot();
    await backupService.clearSavedRecoveryPhrase();
  },
};
```

- [ ] **Step 4: Implement backup store**

Create `frontend/stores/backup-store.ts`:

```ts
import { create } from 'zustand';
import { backupService } from '@/services/backup.service';

export type BackupStatusLabel = 'not_enabled' | 'enabled' | 'sync_failed';

type BackupMeta = {
  updatedAt: string;
} | null;

type BackupState = {
  isLoading: boolean;
  isEnabled: boolean;
  updatedAt: string | null;
  error: string | null;
};

type BackupActions = {
  refreshStatus: () => Promise<void>;
  createBackup: (recoveryPhrase: string) => Promise<void>;
  restoreBackup: (recoveryPhrase: string) => Promise<void>;
  deleteBackup: () => Promise<void>;
};

export function getBackupStatusLabel(meta: BackupMeta): BackupStatusLabel {
  return meta?.updatedAt ? 'enabled' : 'not_enabled';
}

export const useBackupStore = create<BackupState & BackupActions>((set) => ({
  isLoading: false,
  isEnabled: false,
  updatedAt: null,
  error: null,

  refreshStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await backupService.fetchStatus();
      set({
        isLoading: false,
        isEnabled: response.exists,
        updatedAt: response.snapshot?.updatedAt ?? null,
      });
    } catch (error) {
      set({ isLoading: false, error: String(error) });
    }
  },

  createBackup: async (recoveryPhrase) => {
    set({ isLoading: true, error: null });
    try {
      const response = await backupService.createOrRefreshBackup(recoveryPhrase);
      await backupService.saveRecoveryPhrase(recoveryPhrase);
      set({ isLoading: false, isEnabled: true, updatedAt: response.snapshot.updatedAt });
    } catch (error) {
      set({ isLoading: false, error: String(error) });
      throw error;
    }
  },

  restoreBackup: async (recoveryPhrase) => {
    set({ isLoading: true, error: null });
    try {
      await backupService.restoreBackup(recoveryPhrase);
      await useBackupStore.getState().refreshStatus();
    } catch (error) {
      set({ isLoading: false, error: String(error) });
      throw error;
    }
  },

  deleteBackup: async () => {
    set({ isLoading: true, error: null });
    try {
      await backupService.deleteBackup();
      set({ isLoading: false, isEnabled: false, updatedAt: null });
    } catch (error) {
      set({ isLoading: false, error: String(error) });
      throw error;
    }
  },
}));
```

- [ ] **Step 5: Run service/store tests**

Run:

```bash
cd frontend
npm test -- backup-status.test.mjs
```

Expected: test passes.

- [ ] **Step 6: Commit backup service layer**

```bash
git add frontend/lib/backup-api.ts frontend/services/backup.service.ts frontend/stores/backup-store.ts frontend/test/backup-status.test.mjs
git commit -m "feat: add encrypted backup service layer"
```

## Task 5: Profile Backup UI and Restore UX

**Files:**
- Create: `frontend/components/profile/EncryptedBackupSheet.tsx`
- Modify: `frontend/app/(tabs)/profile.tsx`
- Modify: `frontend/locales/en.json`
- Modify: `frontend/locales/fr.json`
- Modify: `frontend/locales/es.json`
- Modify: `frontend/locales/it.json`
- Modify: `frontend/locales/de.json`

- [ ] **Step 1: Add locale keys**

Add these English keys under `profile.backup`:

```json
{
  "title": "Encrypted backup",
  "statusNotEnabled": "Not enabled",
  "statusEnabled": "Last backup {{date}}",
  "setupTitle": "Because privacy matters",
  "setupDescription": "Your contacts stay on your phone. We cannot read them. Enable encrypted backup to restore them on another device.",
  "enable": "Enable encrypted backup",
  "refresh": "Refresh backup",
  "restore": "Restore backup",
  "copyPhrase": "Copy phrase",
  "downloadPhrase": "Save phrase",
  "emailPhrase": "Email phrase",
  "skip": "Skip for now",
  "phraseWarning": "Keep this phrase. Without it, Recall cannot restore your backup.",
  "emailWarning": "Email is outside Recall's encryption. Only send this to an inbox you trust.",
  "enterPhrase": "Enter recovery phrase",
  "restoreConfirm": "Restore will replace local contacts on this device.",
  "success": "Backup updated",
  "restoreSuccess": "Contacts restored",
  "error": "Backup failed"
}
```

Add French equivalents and temporarily mirror the English strings into Spanish, Italian, and German if full translation is not completed in the same task.

- [ ] **Step 2: Create backup sheet component**

Create `frontend/components/profile/EncryptedBackupSheet.tsx` with states:

```tsx
import { forwardRef, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Download, Mail, Copy, RotateCcw } from 'lucide-react-native';
import { Colors, Spacing, Fonts } from '@/constants/theme';
import { generateRecoveryPhrase } from '@/lib/recovery-phrase';
import { useBackupStore } from '@/stores/backup-store';

export const EncryptedBackupSheet = forwardRef<BottomSheetModal>((_, ref) => {
  const { t } = useTranslation();
  const snapPoints = useMemo(() => ['82%'], []);
  const { isLoading, isEnabled, updatedAt, createBackup, restoreBackup } = useBackupStore();
  const [phrase, setPhrase] = useState(() => generateRecoveryPhrase());
  const [restorePhrase, setRestorePhrase] = useState('');

  const handleCopyPhrase = async () => {
    await Clipboard.setStringAsync(phrase);
  };

  const handleSavePhrase = async () => {
    const uri = `${FileSystem.cacheDirectory}recall-recovery-phrase.txt`;
    await FileSystem.writeAsStringAsync(uri, phrase);
    await Sharing.shareAsync(uri, { dialogTitle: t('profile.backup.downloadPhrase') });
  };

  const handleEmailPhrase = () => {
    Alert.alert(t('profile.backup.emailPhrase'), t('profile.backup.emailWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: () => Linking.openURL(`mailto:?subject=Recall recovery phrase&body=${encodeURIComponent(phrase)}`),
      },
    ]);
  };

  const handleEnable = async () => {
    await createBackup(phrase);
    Alert.alert(t('common.success'), t('profile.backup.success'));
  };

  const handleRestore = async () => {
    Alert.alert(t('profile.backup.restore'), t('profile.backup.restoreConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          await restoreBackup(restorePhrase);
          Alert.alert(t('common.success'), t('profile.backup.restoreSuccess'));
        },
      },
    ]);
  };

  return (
    <BottomSheetModal ref={ref} snapPoints={snapPoints} enablePanDownToClose>
      <BottomSheetView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconCircle}>
            <ShieldCheck size={30} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{t('profile.backup.setupTitle')}</Text>
          <Text style={styles.description}>{t('profile.backup.setupDescription')}</Text>
          <View style={styles.phraseBox}>
            <Text style={styles.phrase}>{phrase}</Text>
          </View>
          <Text style={styles.warning}>{t('profile.backup.phraseWarning')}</Text>
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={handleCopyPhrase}>
              <Copy size={16} color={Colors.primary} />
              <Text style={styles.secondaryText}>{t('profile.backup.copyPhrase')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleSavePhrase}>
              <Download size={16} color={Colors.primary} />
              <Text style={styles.secondaryText}>{t('profile.backup.downloadPhrase')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleEmailPhrase}>
              <Mail size={16} color={Colors.primary} />
              <Text style={styles.secondaryText}>{t('profile.backup.emailPhrase')}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.primaryButton} disabled={isLoading} onPress={handleEnable}>
            <Text style={styles.primaryText}>{isEnabled ? t('profile.backup.refresh') : t('profile.backup.enable')}</Text>
          </Pressable>
          {updatedAt && <Text style={styles.meta}>{t('profile.backup.statusEnabled', { date: new Date(updatedAt).toLocaleDateString() })}</Text>}
          <View style={styles.restoreBlock}>
            <Text style={styles.restoreTitle}>{t('profile.backup.restore')}</Text>
            <TextInput
              value={restorePhrase}
              onChangeText={setRestorePhrase}
              placeholder={t('profile.backup.enterPhrase')}
              autoCapitalize="none"
              style={styles.input}
            />
            <Pressable style={styles.secondaryButton} disabled={!restorePhrase || isLoading} onPress={handleRestore}>
              <RotateCcw size={16} color={Colors.primary} />
              <Text style={styles.secondaryText}>{t('profile.backup.restore')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 48 },
  iconCircle: { alignSelf: 'center', padding: 16, borderRadius: 999, backgroundColor: Colors.primaryLight, marginBottom: 16 },
  title: { fontFamily: Fonts.sans.bold, fontSize: 24, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  description: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 18 },
  phraseBox: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.hairline },
  phrase: { fontFamily: Fonts.sans.bold, fontSize: 20, color: Colors.textPrimary, textAlign: 'center' },
  warning: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: 'center' },
  actions: { gap: 10, marginTop: 16 },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  primaryText: { color: Colors.textInverse, fontWeight: '700', fontSize: 15 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: Colors.hairline },
  secondaryText: { color: Colors.primary, fontWeight: '700' },
  meta: { color: Colors.textMuted, textAlign: 'center', marginTop: 10 },
  restoreBlock: { marginTop: 28, gap: 12 },
  restoreTitle: { fontFamily: Fonts.sans.bold, color: Colors.textPrimary, fontSize: 17 },
  input: { backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md, borderWidth: 1, borderColor: Colors.hairline, color: Colors.textPrimary },
});
```

- [ ] **Step 3: Add Profile row**

In `frontend/app/(tabs)/profile.tsx`, import:

```ts
import { Cloud, ShieldCheck } from 'lucide-react-native';
import { EncryptedBackupSheet } from '@/components/profile/EncryptedBackupSheet';
import { useBackupStore } from '@/stores/backup-store';
```

Add ref and state:

```ts
const encryptedBackupSheetRef = useRef<BottomSheetModal>(null);
const backupEnabled = useBackupStore((state) => state.isEnabled);
const backupUpdatedAt = useBackupStore((state) => state.updatedAt);
const refreshBackupStatus = useBackupStore((state) => state.refreshStatus);
```

Call `refreshBackupStatus()` on authenticated profile mount with a normal `useEffect` or existing lifecycle pattern if available.

Add row above export:

```tsx
<SettingsRow
  icon={<Cloud size={20} color={Colors.primary} />}
  label={t('profile.backup.title')}
  value={backupEnabled && backupUpdatedAt
    ? t('profile.backup.statusEnabled', { date: new Date(backupUpdatedAt).toLocaleDateString() })
    : t('profile.backup.statusNotEnabled')}
  onPress={() => encryptedBackupSheetRef.current?.present()}
/>
```

Add privacy row in About before legal:

```tsx
<SettingsRow
  icon={<ShieldCheck size={20} color={Colors.primary} />}
  label={t('profile.about.privacyAi')}
  onPress={handleOpenLegal}
/>
```

Render the sheet:

```tsx
<EncryptedBackupSheet ref={encryptedBackupSheetRef} />
```

- [ ] **Step 4: Run profile type/lint check**

Run:

```bash
cd frontend
npm test -- backup-status.test.mjs
npm run lint
```

Expected: test passes; lint has no new errors from backup files.

- [ ] **Step 5: Commit Profile backup UI**

```bash
git add frontend/components/profile/EncryptedBackupSheet.tsx 'frontend/app/(tabs)/profile.tsx' frontend/locales/en.json frontend/locales/fr.json frontend/locales/es.json frontend/locales/it.json frontend/locales/de.json
git commit -m "feat: add encrypted backup profile controls"
```

## Task 6: Onboarding Refresh and Generated Mockup Assets

**Files:**
- Modify: `frontend/components/Onboarding.tsx`
- Modify: `frontend/locales/en.json`
- Modify: `frontend/locales/fr.json`
- Modify: `frontend/locales/es.json`
- Modify: `frontend/locales/it.json`
- Modify: `frontend/locales/de.json`
- Add: `frontend/assets/ai-assets/onboarding-remember.png`
- Add: `frontend/assets/ai-assets/onboarding-profile-mockup.png`
- Add: `frontend/assets/ai-assets/onboarding-calendar-mockup.png`
- Add: `frontend/assets/ai-assets/onboarding-assistant-mockup.png`
- Add: `frontend/assets/ai-assets/onboarding-privacy-backup.png`
- Create: `frontend/test/onboarding-flow.test.mjs`

- [ ] **Step 1: Generate visual assets**

Use the project image generation skill/tool to create five square PNGs in the existing flat Recall style. Use these prompts:

```text
Square mobile app onboarding illustration in Recall People style: warm off-white background, vivid purple accents, flat editorial shapes, clean rounded cards. Show a person leaving a friendly meeting and recording a short voice note on a phone, with a small saved contact detail card. No text, no logos, no photorealism.
```

```text
Square polished in-app style mockup, not a real screenshot: a Recall People contact profile card with a rounded avatar, a summary card, meeting context row, upcoming event row, and next conversation idea row. Warm off-white background, purple accents, flat design, no readable text.
```

```text
Square polished in-app style mockup: upcoming contact moments calendar with three rounded event rows, small avatar circles, birthday and follow-up indicators, warm off-white background, purple accents, flat design, no readable text.
```

```text
Square polished in-app style mockup: AI assistant search bubble and answer cards listing contacts to follow up with, warm off-white background, purple accents, flat design, no readable text.
```

```text
Square mobile app onboarding illustration in Recall People style: phone with contact cards and a locked encrypted backup symbol, recovery phrase card with abstract blocks, warm off-white background, purple accents, privacy-friendly, no readable text.
```

Save the generated files under the exact asset names listed above.

- [ ] **Step 2: Write onboarding flow test**

Create `frontend/test/onboarding-flow.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'onboarding-flow';

async function loadModule() {
  return loadTsModule({
    entryPoint: 'lib/onboarding-flow.ts',
    suiteName,
  });
}

test('places encrypted backup as the final onboarding slide', async () => {
  const { ONBOARDING_SLIDES } = await loadModule();
  assert.equal(ONBOARDING_SLIDES.at(-1).type, 'privacyBackup');
});

test('includes the upcoming calendar as product value', async () => {
  const { ONBOARDING_SLIDES } = await loadModule();
  assert.ok(ONBOARDING_SLIDES.some((slide) => slide.type === 'calendar'));
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

- [ ] **Step 3: Extract onboarding slide config**

Create `frontend/lib/onboarding-flow.ts`:

```ts
export const ONBOARDING_SLIDES = [
  { id: 0, key: 'language', type: 'language' },
  { id: 1, key: 'remember', type: 'remember' },
  { id: 2, key: 'profile', type: 'profile' },
  { id: 3, key: 'calendar', type: 'calendar' },
  { id: 4, key: 'assistant', type: 'assistant' },
  { id: 5, key: 'privacyBackup', type: 'privacyBackup' },
] as const;
```

- [ ] **Step 4: Update onboarding copy**

Add locale keys:

```json
{
  "remember": {
    "title": "Remember everyone you meet",
    "description": "Capture a quick note after a conversation. Recall keeps the details you would normally forget."
  },
  "profile": {
    "title": "A profile that remembers what matters",
    "description": "AI turns your notes into a clear summary, meeting context, upcoming moments, and ideas for your next conversation."
  },
  "calendar": {
    "title": "See what matters next",
    "description": "A calendar of upcoming moments for your contacts, with reminders you can customize."
  },
  "privacyBackup": {
    "title": "Because privacy matters",
    "description": "Your contacts stay on your phone. We cannot read them. Enable encrypted backup to sync or restore them on another device.",
    "primary": "Enable encrypted backup",
    "secondary": "Skip for now"
  }
}
```

Add French equivalents from the design spec. Mirror these keys to `es`, `it`, and `de` before shipping.

- [ ] **Step 5: Refactor `Onboarding.tsx` to use new slides**

In `frontend/components/Onboarding.tsx`:

- Replace old constants with the five new assets.
- Import `ONBOARDING_SLIDES`.
- Replace the old `slides` array with `ONBOARDING_SLIDES`.
- Remove the old `typing` and old `privacy` renderers.
- Add renderers for `remember`, `profile`, `calendar`, and `privacyBackup`.
- The final backup slide's primary button can call `onComplete()` for the first implementation if the setup sheet is not yet wired into onboarding. If wiring is included in this task, open `EncryptedBackupSheet` and call `onComplete()` after setup or skip.

The final slide must show two actions:

```tsx
<Pressable onPress={handleOpenBackupSetup} style={styles.nextButton}>
  <Text style={styles.nextButtonText}>{t('onboarding.privacyBackup.primary')}</Text>
</Pressable>
<Pressable onPress={handleSkip} style={styles.secondaryOnboardingButton}>
  <Text style={styles.secondaryOnboardingText}>{t('onboarding.privacyBackup.secondary')}</Text>
</Pressable>
```

- [ ] **Step 6: Run onboarding tests**

Run:

```bash
cd frontend
npm test -- onboarding-flow.test.mjs
npm run lint
```

Expected: tests pass and onboarding component has no new lint errors.

- [ ] **Step 7: Commit onboarding refresh**

```bash
git add frontend/lib/onboarding-flow.ts frontend/components/Onboarding.tsx frontend/locales/en.json frontend/locales/fr.json frontend/locales/es.json frontend/locales/it.json frontend/locales/de.json frontend/assets/ai-assets/onboarding-remember.png frontend/assets/ai-assets/onboarding-profile-mockup.png frontend/assets/ai-assets/onboarding-calendar-mockup.png frontend/assets/ai-assets/onboarding-assistant-mockup.png frontend/assets/ai-assets/onboarding-privacy-backup.png frontend/test/onboarding-flow.test.mjs
git commit -m "feat: refresh onboarding around backup and product value"
```

## Task 7: Restore Prompt After Login on Empty Database

**Files:**
- Modify: `frontend/app/_layout.tsx`
- Modify: `frontend/stores/backup-store.ts`
- Modify: `frontend/locales/en.json`
- Modify: `frontend/locales/fr.json`

- [ ] **Step 1: Add restore availability state**

Extend `BackupState` in `frontend/stores/backup-store.ts`:

```ts
hasRemoteBackup: boolean;
```

Initialize to `false`, and in `refreshStatus`, set:

```ts
hasRemoteBackup: response.exists,
```

- [ ] **Step 2: Add restore prompt locale keys**

Under `profile.backup`:

```json
{
  "restorePromptTitle": "Restore your contacts?",
  "restorePromptDescription": "We found an encrypted backup for this account. Enter your recovery phrase to restore it on this device.",
  "restoreNow": "Restore now",
  "notNow": "Not now"
}
```

Add French equivalents.

- [ ] **Step 3: Prompt after login when DB is empty**

In `frontend/app/_layout.tsx`, import:

```ts
import { Alert } from 'react-native';
import { isLocalDatabaseEmpty } from '@/lib/db';
import { useBackupStore } from '@/stores/backup-store';
```

Add an effect:

```ts
useEffect(() => {
  if (!user?.id || !dbReady || !isHydrated) return;

  let cancelled = false;

  const checkRestore = async () => {
    const empty = await isLocalDatabaseEmpty();
    if (!empty || cancelled) return;

    await useBackupStore.getState().refreshStatus();
    const hasRemoteBackup = useBackupStore.getState().hasRemoteBackup;
    if (!hasRemoteBackup || cancelled) return;

    Alert.alert(
      t('profile.backup.restorePromptTitle'),
      t('profile.backup.restorePromptDescription'),
      [
        { text: t('profile.backup.notNow'), style: 'cancel' },
        { text: t('profile.backup.restoreNow'), onPress: () => router.push('/(tabs)/profile') },
      ]
    );
  };

  checkRestore().catch((error) => {
    console.warn('[_layout] Failed to check backup restore availability:', error);
  });

  return () => {
    cancelled = true;
  };
}, [user?.id, dbReady, isHydrated, router, t]);
```

This first version sends the user to Profile to open backup restore manually. Opening the sheet directly across navigators is intentionally out of scope for this implementation pass.

- [ ] **Step 4: Run frontend tests**

Run:

```bash
cd frontend
npm test
npm run lint
```

Expected: tests pass; lint does not introduce new errors.

- [ ] **Step 5: Commit restore prompt**

```bash
git add frontend/app/_layout.tsx frontend/stores/backup-store.ts frontend/locales/en.json frontend/locales/fr.json
git commit -m "feat: prompt restore when encrypted backup exists"
```

## Task 8: Landing Page Refresh

**Files:**
- Modify: `landing-page/src/components/Hero.tsx`
- Modify: `landing-page/src/components/FeatureSection.tsx` or `landing-page/src/components/Features.tsx`
- Modify: `landing-page/src/components/Privacy.tsx`
- Modify: `landing-page/src/components/PhoneMockup.tsx` or relevant visual proof component.

- [ ] **Step 1: Update landing page message**

Add copy that mirrors the app:

```ts
const backupFeature = {
  title: 'Encrypted backup with your recovery phrase',
  description: 'Your contacts stay private. Backups are encrypted before they reach our servers, and only your recovery phrase can restore them.',
};
```

- [ ] **Step 2: Add visual proof of the product value**

Update the visual mockup sequence to include:

- Useful contact profile with summary, meeting context, upcoming event, next conversation idea.
- Upcoming calendar rows.
- Assistant query and answer.
- Encrypted backup card.

Use generated/mock UI, not literal app screenshots.

- [ ] **Step 3: Run landing page checks**

Run:

```bash
cd landing-page
npm run lint
npm run build
```

Expected: lint passes and Next build succeeds.

- [ ] **Step 4: Commit landing page refresh**

```bash
git add landing-page/src/components/Hero.tsx landing-page/src/components/FeatureSection.tsx landing-page/src/components/Features.tsx landing-page/src/components/Privacy.tsx landing-page/src/components/PhoneMockup.tsx
git commit -m "feat: update landing page for encrypted backup"
```

## Task 9: End-to-End QA and Release Prep

**Files:**
- Modify as needed based on QA findings.

- [ ] **Step 1: Run full automated checks**

```bash
cd backend && npm test
cd ../frontend && npm test && npm run lint
cd ../landing-page && npm run lint && npm run build
```

Expected: all checks pass.

- [ ] **Step 2: Manual app QA on emulator**

Use Android emulator QA:

- Fresh install, register/login.
- Complete onboarding.
- Enable encrypted backup.
- Add at least two contacts, notes, hot topics, and groups.
- Refresh backup from Profile.
- Clear local DB or reinstall app.
- Login again.
- Confirm restore prompt appears.
- Restore with wrong phrase: error is clear and data is not overwritten.
- Restore with correct phrase: contacts, notes, groups, and upcoming events appear.

- [ ] **Step 3: Manual iOS mental/review QA**

Verify wording:

- No claim that Recall stores readable cloud contacts.
- Privacy copy says encrypted backups are stored server-side but cannot be read by Recall.
- Email recovery phrase warning is clear.
- App Store privacy disclosures are still accurate.

- [ ] **Step 4: Build Android locally**

Use the Recall deployment skill. Bump Android `versionCode` before upload:

```bash
cd frontend
ANDROID_HOME=/home/clement/Android/Sdk \
ANDROID_SDK_ROOT=/home/clement/Android/Sdk \
ANDROID_NDK_HOME=/home/clement/Android/Sdk/ndk/27.1.12297006 \
npx eas-cli@latest build -p android --profile local-android-store --local --non-interactive
```

Expected: local `.aab` built without using EAS Build quota.

- [ ] **Step 5: Prepare iOS build**

Bump iOS build number and use production submit only after QA:

```bash
cd frontend
npx eas-cli@latest build -p ios --profile production --submit
```

- [ ] **Step 6: Final commit**

```bash
git status --short
git commit -m "feat: add encrypted backup and refreshed onboarding"
```

Only commit remaining files that belong to this feature. Do not include `.superpowers/`, `.playwright-mcp/`, or unrelated Android version-code artifacts unless intentionally part of the release branch.

## Self-Review

Spec coverage:

- Encrypted backup: Tasks 1-5 and 7.
- Recovery phrase generated with English words: Task 2.
- Cross-platform iOS/Android model: Tasks 2-5 use Expo/JS libraries and app account auth.
- Onboarding value story: Task 6.
- Upcoming events calendar: Task 6 screen 4.
- Profile privacy demotion: Task 5.
- Landing page update: Task 8.
- QA/release: Task 9.

Scope check:

- Real-time multi-device merge is intentionally out of scope.
- Server-side readable data is intentionally out of scope.
- Automatic restore without recovery phrase is intentionally out of scope.

Placeholder scan:

- No TBD/TODO placeholders are used.
- Asset generation prompts and filenames are explicit.
- Route names, table names, and API paths are explicit.
