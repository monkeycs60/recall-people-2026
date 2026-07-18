# Account Secure Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unshipped recovery-phrase backup feature with automatic account-based secure sync across iOS and Android, including existing local-user migration and legal/App Store copy updates.

**Architecture:** The backend becomes the source of truth for synced relationship data while SQLite remains the local cache and offline write queue. Sensitive server-side fields are encrypted before being stored in Postgres with AES-256-GCM and a server-managed key; the backend decrypts authenticated responses over TLS. Sync uses entity tables plus a monotonic `SyncChange` cursor, not a snapshot backup.

**Tech Stack:** Expo Router, React Native, Expo SQLite, Zustand, Hono, Prisma/Postgres, Node/Web Crypto-compatible AES-256-GCM, Next.js landing page, EAS/App Store Connect/Google Play release metadata.

---

## File Structure

Backend:

- Modify `backend/prisma/schema.prisma`: remove the unshipped `SyncSnapshot`; add `SyncedContact`, `SyncedNote`, `SyncedGroup`, `SyncedContactGroup`, `SyncedHotTopic`, and `SyncChange`.
- Delete `backend/prisma/migrations/20260507000000_add_sync_snapshots/migration.sql` if it remains unshipped locally.
- Create `backend/prisma/migrations/20260509000000_add_account_sync/migration.sql`: sync entity tables, indexes, and change log.
- Create `backend/src/lib/sync-encryption.ts`: AES-256-GCM encrypt/decrypt helpers using `SYNC_ENCRYPTION_KEY`.
- Replace `backend/src/routes/sync.ts`: bootstrap, initialize, push, changes endpoints.
- Modify `backend/src/index.ts`: keep `/api/sync` route mounted.
- Replace `backend/test/sync-routes.test.mjs`: account sync endpoint tests.
- Create `backend/test/sync-encryption.test.mjs`: encryption helper tests.
- Modify deployment/env docs if present; otherwise add a note in the plan final checklist for setting `SYNC_ENCRYPTION_KEY`.

Frontend:

- Delete unshipped backup files: `frontend/lib/backup-api.ts`, `frontend/lib/backup-crypto.ts`, `frontend/lib/backup-payload.ts`, `frontend/lib/recovery-phrase.ts`, `frontend/services/backup.service.ts`, `frontend/stores/backup-store.ts`, `frontend/components/profile/EncryptedBackupSheet.tsx`, and related `frontend/test/backup-*.test.mjs`, `frontend/test/recovery-phrase.test.mjs`.
- Modify `frontend/package.json` and `frontend/package-lock.json`: remove backup-only crypto dependencies if no longer used.
- Modify `frontend/lib/db.ts`: add local sync state, queue, `deleted_at`, and migration helpers.
- Create `frontend/lib/sync-types.ts`: shared client sync types.
- Create `frontend/lib/sync-api.ts`: authenticated API client for `/api/sync`.
- Create `frontend/services/sync-queue.service.ts`: local queue helpers.
- Create `frontend/services/sync.service.ts`: bootstrap, initialize from local, push, pull, apply changes.
- Modify `frontend/services/contact.service.ts`, `note.service.ts`, `group.service.ts`, `hot-topic.service.ts`: enqueue mutations and tombstone deletes.
- Modify `frontend/app/_layout.tsx`: run sync after DB/auth hydration and when app foregrounds.
- Modify `frontend/app/(tabs)/profile.tsx`: replace backup UI with secure sync status.
- Modify `frontend/components/Onboarding.tsx` and `frontend/lib/onboarding-flow.ts`: keep new onboarding but replace recovery-phrase privacy slide.
- Modify all locale files: `frontend/locales/en.json`, `fr.json`, `es.json`, `it.json`, `de.json`.
- Create tests: `frontend/test/sync-queue.test.mjs`, `frontend/test/sync-service.test.mjs`.

Landing/legal:

- Modify `landing-page/src/components/Privacy.tsx`: remove recovery phrase/local-only copy.
- Modify `landing-page/src/app/privacy/page.tsx`: account sync, encrypted DB, AI processing, retention.
- Modify `landing-page/src/app/terms/page.tsx`: server sync, user content, deletion, best-effort sync.
- Modify `landing-page/src/data/faqs.ts`: update privacy/sync FAQ.
- Run `landing-page` build and targeted lint.

Release/App Store/Google Play:

- Modify `frontend/app.config.js` and `frontend/app.json`: bump version/build numbers for the sync release, keep runtimeVersion aligned, remove duplicate Android permissions in `app.json`.
- Do not add new native permissions. Sync uses network access already covered by platform defaults.
- Update App Store Connect privacy answers before submitting: Contacts/User Content are collected, linked to the user, used for app functionality, not tracking, not third-party advertising.
- Update Google Play Data Safety with the same privacy classification: personal info/user content/contact data collected for app functionality, encrypted in transit, deletion available.
- Validate RevenueCat products remain unchanged.

---

### Task 1: Remove The Unshipped Recovery-Phrase Backup Surface

**Files:**
- Delete: `frontend/components/profile/EncryptedBackupSheet.tsx`
- Delete: `frontend/lib/backup-api.ts`
- Delete: `frontend/lib/backup-crypto.ts`
- Delete: `frontend/lib/backup-payload.ts`
- Delete: `frontend/lib/recovery-phrase.ts`
- Delete: `frontend/services/backup.service.ts`
- Delete: `frontend/stores/backup-store.ts`
- Delete: `frontend/test/backup-crypto.test.mjs`
- Delete: `frontend/test/backup-payload.test.mjs`
- Delete: `frontend/test/backup-status.test.mjs`
- Delete: `frontend/test/recovery-phrase.test.mjs`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/app/_layout.tsx`
- Modify: `frontend/app/(tabs)/profile.tsx`

- [ ] **Step 1: Verify backup references before deleting**

Run:

```bash
rg -n "backup|recoveryPhrase|EncryptedBackup|SyncSnapshot|syncSnapshot" frontend backend
```

Expected: references are limited to the unshipped backup feature, onboarding/privacy copy, tests, and backend snapshot route/model.

- [ ] **Step 2: Delete unshipped backup files**

Run:

```bash
rm frontend/components/profile/EncryptedBackupSheet.tsx \
  frontend/lib/backup-api.ts \
  frontend/lib/backup-crypto.ts \
  frontend/lib/backup-payload.ts \
  frontend/lib/recovery-phrase.ts \
  frontend/services/backup.service.ts \
  frontend/stores/backup-store.ts \
  frontend/test/backup-crypto.test.mjs \
  frontend/test/backup-payload.test.mjs \
  frontend/test/backup-status.test.mjs \
  frontend/test/recovery-phrase.test.mjs
```

Expected: files are removed from the worktree.

- [ ] **Step 3: Remove backup imports and restore prompt from root layout**

In `frontend/app/_layout.tsx`, remove these imports if present:

```ts
import { initDatabase, isLocalDatabaseEmpty } from '@/lib/db';
import { useBackupStore } from '@/stores/backup-store';
```

Replace with:

```ts
import { initDatabase } from '@/lib/db';
import { syncService } from '@/services/sync.service';
```

Delete the recovery-phrase restore `Alert.alert(...)` effect. Add this effect after auth/subscription hydration effects:

```ts
useEffect(() => {
  if (!user?.id || !dbReady || !isHydrated) return;

  syncService.bootstrapAndSync().catch((error) => {
    console.warn('[_layout] Failed to run account sync:', error);
  });
}, [dbReady, isHydrated, user?.id]);
```

Expected: app startup triggers account sync instead of backup restore.

- [ ] **Step 4: Remove backup UI from Profile**

In `frontend/app/(tabs)/profile.tsx`, remove:

```ts
import { Cloud } from 'lucide-react-native';
import { EncryptedBackupSheet } from '@/components/profile/EncryptedBackupSheet';
import { useBackupStore } from '@/stores/backup-store';
```

Add:

```ts
import { Cloud, RefreshCcw } from 'lucide-react-native';
import { useSyncStore } from '@/stores/sync-store';
```

Replace the backup row with:

```tsx
<SettingsRow
  icon={<Cloud size={20} color={Colors.primary} />}
  label={t('profile.sync.title')}
  description={t('profile.sync.description')}
  value={lastSyncedAt ? t('profile.sync.lastSynced', { date: formatLocalizedDate(lastSyncedAt) }) : t('profile.sync.pending')}
  onPress={handleSyncNow}
/>
```

Add:

```ts
const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
const syncNow = useSyncStore((state) => state.syncNow);

const handleSyncNow = useCallback(() => {
  syncNow().catch((error) => {
    Alert.alert(t('common.error'), error instanceof Error ? error.message : t('profile.sync.error'));
  });
}, [syncNow, t]);
```

Expected: Profile exposes "Secure sync", not backup/recovery phrase.

- [ ] **Step 5: Remove backup-only dependencies**

Run:

```bash
cd frontend
npm uninstall @noble/ciphers @noble/hashes @scure/base @scure/bip39
```

Expected: `package.json` and `package-lock.json` no longer include backup-only crypto libraries unless another file still imports them.

- [ ] **Step 6: Run tests to expose expected missing sync modules**

Run:

```bash
cd frontend
npm test
```

Expected: tests fail because `sync.service` and `sync-store` do not exist yet. Do not fix by reintroducing backup code.

- [ ] **Step 7: Commit cleanup after sync modules compile in later tasks**

Do not commit this task until Task 6 introduces the missing sync modules and tests pass.

---

### Task 2: Add Backend Sync Schema And Remove Snapshot Schema

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Delete: `backend/prisma/migrations/20260507000000_add_sync_snapshots/migration.sql`
- Create: `backend/prisma/migrations/20260509000000_add_account_sync/migration.sql`

- [ ] **Step 1: Remove `SyncSnapshot` from Prisma**

In `backend/prisma/schema.prisma`, remove:

```prisma
  syncSnapshot  SyncSnapshot?
```

Delete the full `model SyncSnapshot { ... }` block.

Expected: no `SyncSnapshot` model remains.

- [ ] **Step 2: Add sync relations to `User`**

In `model User`, add:

```prisma
  syncedContacts       SyncedContact[]
  syncedGroups         SyncedGroup[]
  syncedHotTopics      SyncedHotTopic[]
  syncedContactGroups  SyncedContactGroup[]
  syncChanges          SyncChange[]
```

Expected: user owns every synced entity.

- [ ] **Step 3: Add synced entity models**

Append these models to `backend/prisma/schema.prisma`:

```prisma
enum SyncEntityType {
  contact
  note
  group
  contact_group
  hot_topic
}

enum SyncOperation {
  upsert
  delete
}

model SyncedContact {
  id                    String    @id
  userId                String    @map("user_id")
  encryptedFirstName     String    @map("encrypted_first_name")
  encryptedLastName      String?   @map("encrypted_last_name")
  encryptedNickname      String?   @map("encrypted_nickname")
  encryptedPhone         String?   @map("encrypted_phone")
  encryptedEmail         String?   @map("encrypted_email")
  encryptedAiSummary     String?   @map("encrypted_ai_summary")
  encryptedSuggestedQuestions String? @map("encrypted_suggested_questions")
  encryptedMeetingContext String? @map("encrypted_meeting_context")
  avatarUrl             String?   @map("avatar_url")
  gender                String    @default("unknown")
  birthdayDay           Int?      @map("birthday_day")
  birthdayMonth         Int?      @map("birthday_month")
  birthdayYear          Int?      @map("birthday_year")
  reminderFrequencyDays Int?      @map("reminder_frequency_days")
  lastContactAt         DateTime? @map("last_contact_at")
  createdAt             DateTime  @map("created_at")
  updatedAt             DateTime  @map("updated_at")
  deletedAt             DateTime? @map("deleted_at")

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  notes SyncedNote[]

  @@map("synced_contacts")
  @@index([userId, updatedAt])
  @@index([userId, deletedAt])
}

model SyncedNote {
  id                   String    @id
  userId               String    @map("user_id")
  contactId            String    @map("contact_id")
  encryptedTitle       String?   @map("encrypted_title")
  encryptedTranscription String? @map("encrypted_transcription")
  audioDurationMs      Int?      @map("audio_duration_ms")
  createdAt            DateTime  @map("created_at")
  updatedAt            DateTime  @map("updated_at")
  deletedAt            DateTime? @map("deleted_at")

  contact SyncedContact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@map("synced_notes")
  @@index([userId, contactId])
  @@index([userId, updatedAt])
}

model SyncedGroup {
  id            String    @id
  userId        String    @map("user_id")
  encryptedName String    @map("encrypted_name")
  createdAt     DateTime  @map("created_at")
  updatedAt     DateTime  @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("synced_groups")
  @@index([userId, updatedAt])
}

model SyncedContactGroup {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  contactId String    @map("contact_id")
  groupId   String    @map("group_id")
  createdAt DateTime  @map("created_at")
  updatedAt DateTime  @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("synced_contact_groups")
  @@unique([userId, contactId, groupId])
  @@index([userId, updatedAt])
}

model SyncedHotTopic {
  id                 String    @id
  userId             String    @map("user_id")
  contactId          String    @map("contact_id")
  encryptedTitle      String    @map("encrypted_title")
  encryptedContext    String?   @map("encrypted_context")
  encryptedResolution String?   @map("encrypted_resolution")
  status             String    @default("active")
  sourceNoteId       String?   @map("source_note_id")
  eventDate          DateTime? @map("event_date")
  birthdayContactId  String?   @map("birthday_contact_id")
  notifiedAt         DateTime? @map("notified_at")
  resolvedAt         DateTime? @map("resolved_at")
  createdAt          DateTime  @map("created_at")
  updatedAt          DateTime  @map("updated_at")
  deletedAt          DateTime? @map("deleted_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("synced_hot_topics")
  @@index([userId, contactId])
  @@index([userId, updatedAt])
  @@index([userId, eventDate])
}

model SyncChange {
  sequence   BigInt         @id @default(autoincrement())
  userId     String         @map("user_id")
  entityType SyncEntityType @map("entity_type")
  entityId   String         @map("entity_id")
  operation  SyncOperation
  createdAt  DateTime       @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sync_changes")
  @@index([userId, sequence])
  @@index([userId, entityType, entityId])
}
```

Expected: Prisma schema has explicit sync tables and a monotonic cursor.

- [ ] **Step 4: Create SQL migration**

Run:

```bash
cd backend
npx prisma migrate dev --name add_account_sync --create-only
```

Expected: migration is generated. If Prisma refuses because of dirty existing unshipped migration, delete `backend/prisma/migrations/20260507000000_add_sync_snapshots` first and rerun.

- [ ] **Step 5: Verify Prisma generation**

Run:

```bash
cd backend
npx prisma generate
```

Expected: Prisma client generation succeeds.

---

### Task 3: Add Backend Encryption Helpers

**Files:**
- Create: `backend/src/lib/sync-encryption.ts`
- Create: `backend/test/sync-encryption.test.mjs`

- [ ] **Step 1: Write failing encryption tests**

Create `backend/test/sync-encryption.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-encryption';

async function loadModule() {
  process.env.SYNC_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  return loadTsModule({
    entryPoint: 'src/lib/sync-encryption.ts',
    suiteName,
    esbuildOptions: { platform: 'node' },
  });
}

test('encrypts without storing plaintext and decrypts back to the original value', async () => {
  const { encryptString, decryptString } = await loadModule();
  const encrypted = encryptString('Ada Lovelace');

  assert.notEqual(encrypted, 'Ada Lovelace');
  assert.match(encrypted, /^v1:/);
  assert.equal(decryptString(encrypted), 'Ada Lovelace');
});

test('returns null for nullable encryption helpers', async () => {
  const { encryptNullableString, decryptNullableString } = await loadModule();
  assert.equal(encryptNullableString(null), null);
  assert.equal(decryptNullableString(null), null);
});

test('rejects missing or invalid encryption key', async () => {
  delete process.env.SYNC_ENCRYPTION_KEY;
  await assert.rejects(
    () => loadTsModule({
      entryPoint: 'src/lib/sync-encryption.ts',
      suiteName: `${suiteName}-invalid`,
      esbuildOptions: { platform: 'node' },
    }),
    /SYNC_ENCRYPTION_KEY/
  );
});

test.after(async () => {
  await cleanTsModule(suiteName);
  await cleanTsModule(`${suiteName}-invalid`);
  delete process.env.SYNC_ENCRYPTION_KEY;
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd backend
node --test test/sync-encryption.test.mjs
```

Expected: FAIL because `src/lib/sync-encryption.ts` does not exist.

- [ ] **Step 3: Implement encryption helper**

Create `backend/src/lib/sync-encryption.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const VERSION_PREFIX = 'v1';

function getKey(): Buffer {
  const rawKey = process.env.SYNC_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('SYNC_ENCRYPTION_KEY is required');
  }

  const key = Buffer.from(rawKey, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error('SYNC_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }

  return key;
}

export function encryptString(value: string): string {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', getKey(), nonce);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION_PREFIX,
    nonce.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptString(value: string): string {
  const [version, nonceBase64, authTagBase64, ciphertextBase64] = value.split(':');
  if (version !== VERSION_PREFIX || !nonceBase64 || !authTagBase64 || !ciphertextBase64) {
    throw new Error('Unsupported encrypted sync value');
  }

  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(nonceBase64, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function encryptNullableString(value: string | null | undefined): string | null {
  return value == null ? null : encryptString(value);
}

export function decryptNullableString(value: string | null | undefined): string | null {
  return value == null ? null : decryptString(value);
}

export function encryptJson(value: unknown): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJson<T>(value: string): T {
  return JSON.parse(decryptString(value)) as T;
}
```

- [ ] **Step 4: Run encryption tests**

Run:

```bash
cd backend
node --test test/sync-encryption.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Add environment config note**

Generate a production key locally for deployment:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Expected: copy the output into backend production secrets as `SYNC_ENCRYPTION_KEY`. Do not commit the generated value.

---

### Task 4: Implement Backend Sync API

**Files:**
- Replace: `backend/src/routes/sync.ts`
- Modify: `backend/src/index.ts`
- Replace: `backend/test/sync-routes.test.mjs`

- [ ] **Step 1: Write route tests for bootstrap and auth isolation**

Replace `backend/test/sync-routes.test.mjs` with tests that mock Prisma and auth. Put these helpers at the top of the file:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { Hono } from 'hono';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-routes';
const testUser = { id: 'user-1', email: 'ada@example.com', name: 'Ada' };

function mockPrisma(overrides) {
  return overrides;
}

function validInitializeBody() {
  const now = '2026-05-09T10:00:00.000Z';
  return {
    mutations: [{
      id: 'mutation-1',
      entityType: 'contact',
      entityId: 'contact-1',
      operation: 'upsert',
      createdAt: now,
      payload: {
        id: 'contact-1',
        firstName: 'Ada',
        lastName: null,
        gender: 'unknown',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    }],
  };
}

async function loadSyncRoutes() {
  return loadTsModule({
    entryPoint: 'src/routes/sync.ts',
    suiteName,
    esbuildOptions: {
      platform: 'node',
      plugins: [{
        name: 'sync-route-test-deps',
        setup(build) {
          build.onResolve({ filter: /^\.\.\/middleware\/auth$/ }, () => ({ path: 'auth-mock', namespace: 'sync-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/db$/ }, () => ({ path: 'db-mock', namespace: 'sync-test' }));
          build.onResolve({ filter: /^\.\.\/lib\/sync-encryption$/ }, () => ({ path: 'encryption-mock', namespace: 'sync-test' }));
          build.onLoad({ filter: /^auth-mock$/, namespace: 'sync-test' }, () => ({
            loader: 'js',
            contents: 'export const authMiddleware = async (c, next) => { c.set("user", globalThis.__syncTestUser); await next(); };',
          }));
          build.onLoad({ filter: /^db-mock$/, namespace: 'sync-test' }, () => ({
            loader: 'js',
            contents: 'export const getPrisma = () => globalThis.__syncTestPrisma;',
          }));
          build.onLoad({ filter: /^encryption-mock$/, namespace: 'sync-test' }, () => ({
            loader: 'js',
            contents: `
              export const encryptString = (value) => "encrypted:" + value;
              export const decryptString = (value) => value.replace(/^encrypted:/, "");
              export const encryptNullableString = (value) => value == null ? null : "encrypted:" + value;
              export const decryptNullableString = (value) => value == null ? null : value.replace(/^encrypted:/, "");
              export const encryptJson = (value) => "encrypted:" + JSON.stringify(value);
              export const decryptJson = (value) => JSON.parse(value.replace(/^encrypted:/, ""));
            `,
          }));
        },
      }],
    },
  });
}

async function requestSync(path, prisma, options = {}) {
  globalThis.__syncTestUser = testUser;
  globalThis.__syncTestPrisma = prisma;
  const { syncRoutes } = await loadSyncRoutes();
  const app = new Hono();
  app.route('/api/sync', syncRoutes);
  return app.request(path, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }, {
    DATABASE_URL: 'postgres://test',
    JWT_SECRET: 'test-secret',
  });
}
```

Then add these tests:

```js
test('GET /bootstrap reports empty server state for a new account', async () => {
  const prisma = mockPrisma({
    syncChange: {
      findFirst: async () => null,
    },
  });

  const response = await requestSync('/api/sync/bootstrap', prisma);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    hasServerData: false,
    cursor: '0',
  });
});

test('POST /initialize rejects when server already has data', async () => {
  const prisma = mockPrisma({
    syncChange: {
      findFirst: async () => ({ sequence: 7n }),
    },
  });

  const response = await requestSync('/api/sync/initialize', prisma, {
    method: 'POST',
    body: validInitializeBody(),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'Server sync state already exists' });
});
```

Expected: tests fail until route is implemented.

- [ ] **Step 2: Define request/response schemas in route**

In `backend/src/routes/sync.ts`, define zod schemas:

```ts
const syncEntityTypeSchema = z.enum(['contact', 'note', 'group', 'contact_group', 'hot_topic']);
const syncOperationSchema = z.enum(['upsert', 'delete']);

const contactPayloadSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  gender: z.string().default('unknown'),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  birthdayDay: z.number().int().nullable().optional(),
  birthdayMonth: z.number().int().nullable().optional(),
  birthdayYear: z.number().int().nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  suggestedQuestions: z.array(z.string()).nullable().optional(),
  meetingContext: z.string().nullable().optional(),
  reminderFrequencyDays: z.number().int().nullable().optional(),
  lastContactAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const notePayloadSchema = z.object({
  id: z.string().min(1),
  contactId: z.string().min(1),
  title: z.string().nullable().optional(),
  transcription: z.string().nullable().optional(),
  audioDurationMs: z.number().int().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});
```

Add these remaining payload schemas in the same schema block:

```ts
const groupPayloadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const contactGroupPayloadSchema = z.object({
  contactId: z.string().min(1),
  groupId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const hotTopicPayloadSchema = z.object({
  id: z.string().min(1),
  contactId: z.string().min(1),
  title: z.string().min(1),
  context: z.string().nullable().optional(),
  resolution: z.string().nullable().optional(),
  status: z.enum(['active', 'resolved']).default('active'),
  sourceNoteId: z.string().nullable().optional(),
  eventDate: z.string().datetime().nullable().optional(),
  birthdayContactId: z.string().nullable().optional(),
  notifiedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

const syncMutationSchema = z.discriminatedUnion('entityType', [
  z.object({ id: z.string(), entityType: z.literal('contact'), entityId: z.string(), operation: syncOperationSchema, payload: contactPayloadSchema, createdAt: z.string().datetime() }),
  z.object({ id: z.string(), entityType: z.literal('note'), entityId: z.string(), operation: syncOperationSchema, payload: notePayloadSchema, createdAt: z.string().datetime() }),
  z.object({ id: z.string(), entityType: z.literal('group'), entityId: z.string(), operation: syncOperationSchema, payload: groupPayloadSchema, createdAt: z.string().datetime() }),
  z.object({ id: z.string(), entityType: z.literal('contact_group'), entityId: z.string(), operation: syncOperationSchema, payload: contactGroupPayloadSchema, createdAt: z.string().datetime() }),
  z.object({ id: z.string(), entityType: z.literal('hot_topic'), entityId: z.string(), operation: syncOperationSchema, payload: hotTopicPayloadSchema, createdAt: z.string().datetime() }),
]);
```

Expected: all incoming sync payloads are validated before database writes.

- [ ] **Step 3: Implement encryption mappers**

Add mapper functions in `backend/src/routes/sync.ts`:

```ts
function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function serializeDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function encryptContactPayload(userId: string, payload: ContactPayload) {
  return {
    id: payload.id,
    userId,
    encryptedFirstName: encryptString(payload.firstName),
    encryptedLastName: encryptNullableString(payload.lastName),
    encryptedNickname: encryptNullableString(payload.nickname),
    encryptedPhone: encryptNullableString(payload.phone),
    encryptedEmail: encryptNullableString(payload.email),
    encryptedAiSummary: encryptNullableString(payload.aiSummary),
    encryptedSuggestedQuestions: payload.suggestedQuestions ? encryptJson(payload.suggestedQuestions) : null,
    encryptedMeetingContext: encryptNullableString(payload.meetingContext),
    avatarUrl: payload.avatarUrl ?? null,
    gender: payload.gender ?? 'unknown',
    birthdayDay: payload.birthdayDay ?? null,
    birthdayMonth: payload.birthdayMonth ?? null,
    birthdayYear: payload.birthdayYear ?? null,
    reminderFrequencyDays: payload.reminderFrequencyDays ?? null,
    lastContactAt: toDate(payload.lastContactAt),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}
```

Expected: plaintext sensitive values never pass directly to Prisma data for encrypted columns.

- [ ] **Step 4: Implement endpoints**

Implement:

```ts
syncRoutes.get('/bootstrap', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const latestChange = await prisma.syncChange.findFirst({
    where: { userId: user.id },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  });

  return c.json({
    hasServerData: latestChange !== null,
    cursor: latestChange ? latestChange.sequence.toString() : '0',
  });
});
```

`POST /initialize` must:

- Reject if any `SyncChange` exists for the user.
- Write all entities in a transaction.
- Create one `SyncChange` per upserted entity.
- Return the latest cursor.

`POST /push` must:

- Accept `{ mutations: SyncMutation[] }`.
- Validate entity ownership by `userId`.
- Upsert or tombstone entities.
- Create `SyncChange` rows.
- Return `{ cursor, appliedMutationIds }`.

`GET /changes?cursor=...` must:

- Parse cursor as bigint string.
- Read `SyncChange` rows with `sequence > cursor`.
- Return current entity state for each changed entity, decrypted for the authenticated client.
- Return `{ cursor: latestSequence, changes }`.

Expected: API implements account sync without snapshots.

- [ ] **Step 5: Run backend tests**

Run:

```bash
cd backend
SYNC_ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")" npm test
```

Expected: all backend tests pass.

- [ ] **Step 6: Commit backend sync API**

Run:

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/src/lib/sync-encryption.ts backend/src/routes/sync.ts backend/src/index.ts backend/test/sync-encryption.test.mjs backend/test/sync-routes.test.mjs
git commit -m "feat: add account sync backend"
```

---

### Task 5: Add Local Sync Schema And Queue

**Files:**
- Modify: `frontend/lib/db.ts`
- Create: `frontend/lib/sync-types.ts`
- Create: `frontend/services/sync-queue.service.ts`
- Create: `frontend/test/sync-queue.test.mjs`

- [ ] **Step 1: Add sync types**

Create `frontend/lib/sync-types.ts`:

```ts
export type SyncEntityType = 'contact' | 'note' | 'group' | 'contact_group' | 'hot_topic';
export type SyncOperation = 'upsert' | 'delete';

export type SyncMutation = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SyncChange = Omit<SyncMutation, 'id'> & {
  sequence: string;
};

export type SyncBootstrapResponse = {
  hasServerData: boolean;
  cursor: string;
};

export type SyncPushResponse = {
  cursor: string;
  appliedMutationIds: string[];
};

export type SyncChangesResponse = {
  cursor: string;
  changes: SyncChange[];
};
```

- [ ] **Step 2: Add SQLite sync tables and columns**

In `frontend/lib/db.ts`, extend initial schema and migrations so these tables/columns always exist:

```sql
CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);
```

Add migrations:

```ts
await addColumnIfMissing(database, 'contacts', 'deleted_at', 'TEXT');
await addColumnIfMissing(database, 'notes', 'deleted_at', 'TEXT');
await addColumnIfMissing(database, 'groups', 'deleted_at', 'TEXT');
await addColumnIfMissing(database, 'hot_topics', 'deleted_at', 'TEXT');
await addColumnIfMissing(database, 'contact_groups', 'updated_at', 'TEXT');
await addColumnIfMissing(database, 'contact_groups', 'deleted_at', 'TEXT');
```

Expected: local DB can track tombstones and queued writes.

- [ ] **Step 3: Write queue tests**

Create `frontend/test/sync-queue.test.mjs` with a local module loader and tests:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanTsModule, loadTsModule } from './helpers/load-ts-module.mjs';

const suiteName = 'sync-queue';

async function loadServiceWithMockDb() {
  globalThis.__dbRunCalls = [];
  return loadTsModule({
    entryPoint: 'services/sync-queue.service.ts',
    suiteName,
    esbuildOptions: {
      plugins: [{
        name: 'sync-queue-test-deps',
        setup(build) {
          build.onResolve({ filter: /^@\/lib\/db$/ }, () => ({ namespace: 'sync-queue-test', path: 'db' }));
          build.onResolve({ filter: /^expo-crypto$/ }, () => ({ namespace: 'sync-queue-test', path: 'crypto' }));
          build.onLoad({ filter: /^db$/, namespace: 'sync-queue-test' }, () => ({
            loader: 'js',
            contents: `
              export async function getDatabase() {
                return {
                  runAsync: async (sql, params) => globalThis.__dbRunCalls.push({ sql, params }),
                  getAllAsync: async () => [],
                };
              }
            `,
          }));
          build.onLoad({ filter: /^crypto$/, namespace: 'sync-queue-test' }, () => ({
            loader: 'js',
            contents: 'export const randomUUID = () => "mutation-1";',
          }));
        },
      }],
    },
  });
}

test('enqueueMutation stores a serialized mutation in created order', async () => {
  const { syncQueueService } = await loadServiceWithMockDb();

  await syncQueueService.enqueueMutation({
    entityType: 'contact',
    entityId: 'contact-1',
    operation: 'upsert',
    payload: { id: 'contact-1', firstName: 'Ada' },
  });

  assert.equal(globalThis.__dbRunCalls[0].sql.includes('INSERT INTO sync_queue'), true);
  assert.equal(JSON.parse(globalThis.__dbRunCalls[0].params[4]).firstName, 'Ada');
});

test('deleteAppliedMutations removes only acknowledged mutation ids', async () => {
  const { syncQueueService } = await loadServiceWithMockDb();
  await syncQueueService.deleteAppliedMutations(['mutation-1', 'mutation-2']);
  assert.equal(globalThis.__dbRunCalls[0].sql, 'DELETE FROM sync_queue WHERE id IN (?, ?)');
});

test.after(async () => {
  await cleanTsModule(suiteName);
});
```

Expected: FAIL before queue service exists.

- [ ] **Step 4: Implement queue service**

Create `frontend/services/sync-queue.service.ts`:

```ts
import * as Crypto from 'expo-crypto';
import { getDatabase } from '@/lib/db';
import type { SyncEntityType, SyncMutation, SyncOperation } from '@/lib/sync-types';

export const syncQueueService = {
  enqueueMutation: async (input: {
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    payload: Record<string, unknown>;
  }): Promise<void> => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload_json, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        Crypto.randomUUID(),
        input.entityType,
        input.entityId,
        input.operation,
        JSON.stringify(input.payload),
        now,
        now,
      ]
    );
  },

  getPendingMutations: async (limit = 50): Promise<SyncMutation[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      entity_type: SyncEntityType;
      entity_id: string;
      operation: SyncOperation;
      payload_json: string;
      created_at: string;
    }>('SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT ?', [limit]);

    return rows.map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: JSON.parse(row.payload_json),
      createdAt: row.created_at,
    }));
  },

  deleteAppliedMutations: async (mutationIds: string[]): Promise<void> => {
    if (mutationIds.length === 0) return;
    const db = await getDatabase();
    await db.runAsync(
      `DELETE FROM sync_queue WHERE id IN (${mutationIds.map(() => '?').join(', ')})`,
      mutationIds
    );
  },
};
```

- [ ] **Step 5: Run queue tests**

Run:

```bash
cd frontend
node --test test/sync-queue.test.mjs
```

Expected: PASS.

---

### Task 6: Add Frontend Sync API And Sync Engine

**Files:**
- Create: `frontend/lib/sync-api.ts`
- Create: `frontend/services/sync.service.ts`
- Create: `frontend/stores/sync-store.ts`
- Create: `frontend/test/sync-service.test.mjs`

- [ ] **Step 1: Add sync API client**

Create `frontend/lib/sync-api.ts`:

```ts
import { getToken, refreshAccessToken } from './auth';
import { API_URL } from './config';
import type { SyncBootstrapResponse, SyncChangesResponse, SyncMutation, SyncPushResponse } from './sync-types';

async function syncRequest<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return syncRequest<T>(endpoint, options, true);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : `Sync request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const syncApi = {
  bootstrap: () => syncRequest<SyncBootstrapResponse>('/api/sync/bootstrap'),
  initialize: (mutations: SyncMutation[]) => syncRequest<SyncPushResponse>('/api/sync/initialize', {
    method: 'POST',
    body: JSON.stringify({ mutations }),
  }),
  push: (mutations: SyncMutation[]) => syncRequest<SyncPushResponse>('/api/sync/push', {
    method: 'POST',
    body: JSON.stringify({ mutations }),
  }),
  changes: (cursor: string) => syncRequest<SyncChangesResponse>(`/api/sync/changes?cursor=${encodeURIComponent(cursor)}`),
};
```

- [ ] **Step 2: Implement sync store**

Create `frontend/stores/sync-store.ts`:

```ts
import { create } from 'zustand';
import { syncService } from '@/services/sync.service';

type SyncState = {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
};

export const useSyncStore = create<SyncState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  syncNow: async () => {
    set({ isSyncing: true, error: null });
    try {
      const lastSyncedAt = await syncService.bootstrapAndSync();
      set({ isSyncing: false, lastSyncedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      set({ isSyncing: false, error: message });
      throw error;
    }
  },
}));
```

- [ ] **Step 3: Implement sync service orchestration**

Create `frontend/services/sync.service.ts` with:

```ts
import { getDatabase, isLocalDatabaseEmpty } from '@/lib/db';
import { syncApi } from '@/lib/sync-api';
import type { SyncChange, SyncMutation } from '@/lib/sync-types';
import { syncQueueService } from './sync-queue.service';

let syncPromise: Promise<string> | null = null;

async function getSyncState(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function setSyncState(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
}

async function exportLocalAsInitialMutations(): Promise<SyncMutation[]> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const contacts = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM contacts WHERE deleted_at IS NULL');
  const notes = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM notes WHERE deleted_at IS NULL');
  const groups = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM groups WHERE deleted_at IS NULL');
  const contactGroups = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM contact_groups WHERE deleted_at IS NULL');
  const hotTopics = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM hot_topics WHERE deleted_at IS NULL');

  return [
    ...contacts.map((payload) => ({ id: `init-contact-${payload.id}`, entityType: 'contact' as const, entityId: String(payload.id), operation: 'upsert' as const, payload, createdAt: now })),
    ...notes.map((payload) => ({ id: `init-note-${payload.id}`, entityType: 'note' as const, entityId: String(payload.id), operation: 'upsert' as const, payload, createdAt: now })),
    ...groups.map((payload) => ({ id: `init-group-${payload.id}`, entityType: 'group' as const, entityId: String(payload.id), operation: 'upsert' as const, payload, createdAt: now })),
    ...contactGroups.map((payload) => ({ id: `init-contact-group-${payload.contact_id}-${payload.group_id}`, entityType: 'contact_group' as const, entityId: `${payload.contact_id}:${payload.group_id}`, operation: 'upsert' as const, payload, createdAt: now })),
    ...hotTopics.map((payload) => ({ id: `init-hot-topic-${payload.id}`, entityType: 'hot_topic' as const, entityId: String(payload.id), operation: 'upsert' as const, payload, createdAt: now })),
  ];
}

async function upsertContact(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO contacts (
      id, first_name, last_name, nickname, avatar_url, gender, phone, email,
      birthday_day, birthday_month, birthday_year, ai_summary, suggested_questions,
      meeting_context, reminder_frequency_days, last_contact_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      nickname = excluded.nickname,
      avatar_url = excluded.avatar_url,
      gender = excluded.gender,
      phone = excluded.phone,
      email = excluded.email,
      birthday_day = excluded.birthday_day,
      birthday_month = excluded.birthday_month,
      birthday_year = excluded.birthday_year,
      ai_summary = excluded.ai_summary,
      suggested_questions = excluded.suggested_questions,
      meeting_context = excluded.meeting_context,
      reminder_frequency_days = excluded.reminder_frequency_days,
      last_contact_at = excluded.last_contact_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at`,
    [
      payload.id,
      payload.firstName,
      payload.lastName ?? null,
      payload.nickname ?? null,
      payload.avatarUrl ?? null,
      payload.gender ?? 'unknown',
      payload.phone ?? null,
      payload.email ?? null,
      payload.birthdayDay ?? null,
      payload.birthdayMonth ?? null,
      payload.birthdayYear ?? null,
      payload.aiSummary ?? null,
      payload.suggestedQuestions ? JSON.stringify(payload.suggestedQuestions) : null,
      payload.meetingContext ?? null,
      payload.reminderFrequencyDays ?? null,
      payload.lastContactAt ?? null,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ]
  );
}

async function upsertNote(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO notes (id, contact_id, title, audio_duration_ms, transcription, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       contact_id = excluded.contact_id,
       title = excluded.title,
       audio_duration_ms = excluded.audio_duration_ms,
       transcription = excluded.transcription,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [
      payload.id,
      payload.contactId,
      payload.title ?? null,
      payload.audioDurationMs ?? null,
      payload.transcription ?? null,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ]
  );
}

async function upsertGroup(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO groups (id, name, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [payload.id, payload.name, payload.createdAt, payload.updatedAt, payload.deletedAt ?? null]
  );
}

async function upsertContactGroup(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO contact_groups (contact_id, group_id, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(contact_id, group_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [payload.contactId, payload.groupId, payload.createdAt, payload.updatedAt, payload.deletedAt ?? null]
  );
}

async function upsertHotTopic(payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO hot_topics (
      id, contact_id, title, context, resolution, status, source_note_id,
      event_date, birthday_contact_id, notified_at, resolved_at, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      contact_id = excluded.contact_id,
      title = excluded.title,
      context = excluded.context,
      resolution = excluded.resolution,
      status = excluded.status,
      source_note_id = excluded.source_note_id,
      event_date = excluded.event_date,
      birthday_contact_id = excluded.birthday_contact_id,
      notified_at = excluded.notified_at,
      resolved_at = excluded.resolved_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at`,
    [
      payload.id,
      payload.contactId,
      payload.title,
      payload.context ?? null,
      payload.resolution ?? null,
      payload.status ?? 'active',
      payload.sourceNoteId ?? null,
      payload.eventDate ?? null,
      payload.birthdayContactId ?? null,
      payload.notifiedAt ?? null,
      payload.resolvedAt ?? null,
      payload.createdAt,
      payload.updatedAt,
      payload.deletedAt ?? null,
    ]
  );
}

async function applyChange(change: SyncChange): Promise<void> {
  const db = await getDatabase();
  if (change.operation === 'delete') {
    const tableByType = {
      contact: 'contacts',
      note: 'notes',
      group: 'groups',
      hot_topic: 'hot_topics',
      contact_group: 'contact_groups',
    } as const;
    const table = tableByType[change.entityType];
    await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [
      change.payload.deletedAt ?? new Date().toISOString(),
      change.payload.updatedAt ?? new Date().toISOString(),
      change.entityId,
    ]);
    return;
  }

  if (change.entityType === 'contact') await upsertContact(change.payload);
  if (change.entityType === 'note') await upsertNote(change.payload);
  if (change.entityType === 'group') await upsertGroup(change.payload);
  if (change.entityType === 'contact_group') await upsertContactGroup(change.payload);
  if (change.entityType === 'hot_topic') await upsertHotTopic(change.payload);
}

export const syncService = {
  bootstrapAndSync: async (): Promise<string> => {
    if (syncPromise) return syncPromise;

    syncPromise = (async () => {
      const bootstrap = await syncApi.bootstrap();
      const localEmpty = await isLocalDatabaseEmpty();

      if (!bootstrap.hasServerData && !localEmpty && await getSyncState('initialized') !== 'true') {
        const initialMutations = await exportLocalAsInitialMutations();
        const response = await syncApi.initialize(initialMutations);
        await setSyncState('cursor', response.cursor);
        await setSyncState('initialized', 'true');
      }

      const pending = await syncQueueService.getPendingMutations();
      if (pending.length > 0) {
        const response = await syncApi.push(pending);
        await syncQueueService.deleteAppliedMutations(response.appliedMutationIds);
        await setSyncState('cursor', response.cursor);
      }

      const cursor = await getSyncState('cursor') ?? '0';
      const changes = await syncApi.changes(cursor);
      for (const change of changes.changes) {
        await applyChange(change);
      }
      await setSyncState('cursor', changes.cursor);

      const now = new Date().toISOString();
      await setSyncState('lastSyncedAt', now);
      return now;
    })();

    try {
      return await syncPromise;
    } finally {
      syncPromise = null;
    }
  },
};
```

- [ ] **Step 4: Write service tests**

Create `frontend/test/sync-service.test.mjs` with these three tests after adding local esbuild mocks for `@/lib/db`, `@/lib/sync-api`, and `@/services/sync-queue.service`:

```js
test('bootstrapAndSync initializes server from non-empty local DB when server is empty', async () => {
  globalThis.__isLocalDatabaseEmpty = false;
  globalThis.__syncApiMock.bootstrap = async () => ({ hasServerData: false, cursor: '0' });
  const { syncService } = await loadSyncService();

  await syncService.bootstrapAndSync();

  assert.deepEqual(globalThis.__syncApiCalls.map((call) => call.name), [
    'bootstrap',
    'initialize',
    'changes',
  ]);
});

test('bootstrapAndSync pulls server changes into an empty local DB', async () => {
  globalThis.__isLocalDatabaseEmpty = true;
  globalThis.__syncApiMock.bootstrap = async () => ({ hasServerData: true, cursor: '3' });
  globalThis.__syncApiMock.changes = async () => ({
    cursor: '4',
    changes: [{
      sequence: '4',
      entityType: 'contact',
      entityId: 'contact-1',
      operation: 'upsert',
      createdAt: '2026-05-09T10:00:00.000Z',
      payload: {
        id: 'contact-1',
        firstName: 'Ada',
        gender: 'unknown',
        createdAt: '2026-05-09T10:00:00.000Z',
        updatedAt: '2026-05-09T10:00:00.000Z',
      },
    }],
  });
  const { syncService } = await loadSyncService();

  await syncService.bootstrapAndSync();

  assert.equal(globalThis.__dbRunCalls.some((call) => call.sql.includes('INSERT INTO contacts')), true);
});

test('bootstrapAndSync pushes pending mutations before pulling changes', async () => {
  globalThis.__pendingMutations = [{
    id: 'mutation-1',
    entityType: 'note',
    entityId: 'note-1',
    operation: 'upsert',
    payload: { id: 'note-1', contactId: 'contact-1', createdAt: '2026-05-09T10:00:00.000Z', updatedAt: '2026-05-09T10:00:00.000Z' },
    createdAt: '2026-05-09T10:00:00.000Z',
  }];
  const { syncService } = await loadSyncService();

  await syncService.bootstrapAndSync();

  assert.equal(globalThis.__syncApiCalls.findIndex((call) => call.name === 'push') < globalThis.__syncApiCalls.findIndex((call) => call.name === 'changes'), true);
  assert.deepEqual(globalThis.__deletedAppliedMutationIds, ['mutation-1']);
});
```

Expected: tests pass and document initial migration behavior.

- [ ] **Step 5: Run frontend sync tests**

Run:

```bash
cd frontend
node --test test/sync-queue.test.mjs test/sync-service.test.mjs
```

Expected: PASS.

---

### Task 7: Wire Local Services To Queue Mutations

**Files:**
- Modify: `frontend/services/contact.service.ts`
- Modify: `frontend/services/note.service.ts`
- Modify: `frontend/services/group.service.ts`
- Modify: `frontend/services/hot-topic.service.ts`
- Modify: `frontend/hooks/useContactQuery.ts`
- Modify: `frontend/hooks/useContactsQuery.ts`

- [ ] **Step 1: Add payload builders**

For each service, add private helpers next to row mappers:

```ts
const contactToSyncPayload = (contact: Contact): Record<string, unknown> => ({
  id: contact.id,
  firstName: contact.firstName,
  lastName: contact.lastName ?? null,
  nickname: contact.nickname ?? null,
  avatarUrl: contact.avatarUrl ?? null,
  gender: contact.gender ?? 'unknown',
  phone: contact.phone ?? null,
  email: contact.email ?? null,
  birthdayDay: contact.birthdayDay ?? null,
  birthdayMonth: contact.birthdayMonth ?? null,
  birthdayYear: contact.birthdayYear ?? null,
  aiSummary: contact.aiSummary ?? null,
  suggestedQuestions: contact.suggestedQuestions ?? null,
  meetingContext: contact.meetingContext ?? null,
  reminderFrequencyDays: contact.reminderFrequencyDays ?? null,
  lastContactAt: contact.lastContactAt ?? null,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
  deletedAt: null,
});
```

Expected: every mutation queues the same shape that backend expects.

- [ ] **Step 2: Enqueue creates and updates**

After local insert/update succeeds, call:

```ts
await syncQueueService.enqueueMutation({
  entityType: 'contact',
  entityId: id,
  operation: 'upsert',
  payload: contactToSyncPayload(updatedContact),
});
```

Do the same for note, group, hot topic, and contact group membership changes.

Expected: local UX remains immediate; sync is queued in the background.

- [ ] **Step 3: Convert deletes to tombstones**

Replace physical deletes for synced entities with tombstones. Example for notes:

```ts
const now = new Date().toISOString();
await db.runAsync('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
await syncQueueService.enqueueMutation({
  entityType: 'note',
  entityId: id,
  operation: 'delete',
  payload: { id, updatedAt: now, deletedAt: now },
});
```

Update read queries to filter:

```sql
WHERE deleted_at IS NULL
```

Expected: deletions can sync to other devices.

- [ ] **Step 4: Trigger background sync after mutations**

In React Query mutation `onSuccess` handlers, after invalidating queries, call:

```ts
syncService.bootstrapAndSync().catch((error) => {
  console.warn('[sync] Background sync after mutation failed:', error);
});
```

Expected: changes push soon after local mutations when online.

- [ ] **Step 5: Run app tests**

Run:

```bash
cd frontend
npm test
```

Expected: all tests pass; update tests that assumed physical deletes.

---

### Task 8: Replace Onboarding And Profile Copy

**Files:**
- Modify: `frontend/lib/onboarding-flow.ts`
- Modify: `frontend/components/Onboarding.tsx`
- Modify: `frontend/app/(tabs)/profile.tsx`
- Modify: `frontend/locales/en.json`
- Modify: `frontend/locales/fr.json`
- Modify: `frontend/locales/es.json`
- Modify: `frontend/locales/it.json`
- Modify: `frontend/locales/de.json`
- Modify: `frontend/test/onboarding-flow.test.mjs`

- [ ] **Step 1: Update onboarding flow test**

In `frontend/test/onboarding-flow.test.mjs`, replace encrypted backup assertions with:

```js
test('places secure account sync as the final onboarding slide', async () => {
  const { ONBOARDING_SLIDES } = await loadOnboardingFlowModule();
  const finalSlide = ONBOARDING_SLIDES.at(-1);

  assert.equal(finalSlide.titleKey, 'onboarding.slides.sync.title');
  assert.equal(finalSlide.bodyKey, 'onboarding.slides.sync.body');
  assert.equal(JSON.stringify(finalSlide).includes('recovery'), false);
});
```

Expected: FAIL until copy is updated.

- [ ] **Step 2: Update onboarding data**

In `frontend/lib/onboarding-flow.ts`, replace the privacy backup final slide:

```ts
{
  id: 'sync',
  titleKey: 'onboarding.slides.sync.title',
  bodyKey: 'onboarding.slides.sync.body',
  image: PRIVACY_BACKUP_ILLUSTRATION,
}
```

The final body copy in locales:

```json
"sync": {
  "title": "Your contacts follow you",
  "body": "Sign in once. Recall keeps your contacts backed up and synced across your devices, with sensitive data encrypted in our database."
}
```

Translate accurately in `fr`, `es`, `it`, `de` without claiming zero-knowledge.

- [ ] **Step 3: Update Profile locale copy**

Add:

```json
"sync": {
  "title": "Secure sync",
  "description": "Backed up with your account and encrypted in our database.",
  "lastSynced": "Last synced {{date}}",
  "pending": "Sync pending",
  "error": "Sync failed"
}
```

Expected: all locales have equivalent keys.

- [ ] **Step 4: Run onboarding and locale tests**

Run:

```bash
cd frontend
node --test test/onboarding-flow.test.mjs
npm test
```

Expected: PASS.

---

### Task 9: Update Landing Privacy, Terms, FAQ, And Store Disclosure Copy

**Files:**
- Modify: `landing-page/src/components/Privacy.tsx`
- Modify: `landing-page/src/app/privacy/page.tsx`
- Modify: `landing-page/src/app/terms/page.tsx`
- Modify: `landing-page/src/data/faqs.ts`
- Create: `docs/release/app-store-privacy-sync-checklist.md`

- [ ] **Step 1: Replace landing privacy component copy**

In `landing-page/src/components/Privacy.tsx`, replace the three privacy points with:

```ts
const privacyPoints = [
  {
    icon: Database,
    title: 'Encrypted in our database',
    description: 'Sensitive contact details and notes are encrypted before they are stored server-side.',
  },
  {
    icon: WifiOff,
    title: 'Works offline',
    description: 'SQLite keeps the app fast and usable when your phone has no connection.',
  },
  {
    icon: ShieldCheck,
    title: 'No training on your contacts',
    description: 'Your personal contacts and notes are not sold or used to train AI models.',
  },
];
```

Change the heading/body to:

```tsx
<h2>Private by design, synced for real life.</h2>
<p>
  Recall keeps your relationship notes available across your devices while protecting sensitive data in our database.
</p>
```

Remove any mention of recovery phrase, encrypted backup, or "cannot read".

- [ ] **Step 2: Update Privacy Policy**

In `landing-page/src/app/privacy/page.tsx`:

- Replace "Your personal data stays on your device" with account sync language.
- State that contacts, notes, groups, events, summaries, and conversation ideas are stored server-side to provide sync.
- State sensitive relationship data is encrypted in the database.
- Keep AI provider processing disclosure.
- State account deletion deletes server-side synced data according to deletion policy.

Use this exact key paragraph in Overview:

```tsx
<strong className="text-text-primary">Key principle:</strong> Recall syncs your relationship data through your account so it is available across your devices. Sensitive relationship data is encrypted in our database, and we do not sell your data or use your personal contacts and notes to train AI models.
```

- [ ] **Step 3: Update Terms**

In `landing-page/src/app/terms/page.tsx`, replace local-only backup responsibility with:

```tsx
<li>Understanding that account sync stores and processes your relationship data to provide the service across devices</li>
```

In warranties, replace "Any data stored on your device will be preserved indefinitely" with:

```tsx
<li>Sync will be instantaneous, conflict-free, or available without network connectivity</li>
```

In termination, state:

```tsx
<li>Server-side synced data will be deleted according to our account deletion process and retention obligations</li>
```

- [ ] **Step 4: Add App Store / Google Play checklist**

Create `docs/release/app-store-privacy-sync-checklist.md`:

```md
# Store Privacy Checklist For Account Sync

## App Store Connect

- Data types collected:
  - Contact Info: name, email address, phone number if user adds it.
  - Contacts: user-created relationship/contact records.
  - User Content: notes, transcriptions, events, groups, AI summaries, conversation ideas.
  - Identifiers: user ID/account ID.
  - Usage Data/Diagnostics if already declared for analytics/debugging.
- Linked to user: yes for account and synced relationship data.
- Used for tracking: no.
- Third-party advertising: no.
- Purpose: App Functionality, Account Management, Developer Communications where applicable.
- User deletion: available through in-app delete account flow.
- Security wording: data encrypted in transit; sensitive relationship data encrypted in database.

## Google Play Data Safety

- Declare user-provided personal info/contact/user content collection for app functionality.
- Declare data is encrypted in transit.
- Declare users can request/delete account data.
- Do not claim data is processed only on device.

## Native Permissions

- No new iOS permission strings required for sync.
- No new Android dangerous permissions required for sync.
- Existing microphone/photo permissions remain unchanged.
```

- [ ] **Step 5: Run landing verification**

Run:

```bash
cd landing-page
npm run build
npx eslint src/components/Privacy.tsx src/app/privacy/page.tsx src/app/terms/page.tsx src/data/faqs.ts
```

Expected: build passes; targeted lint passes.

---

### Task 10: Update iOS, Android, EAS, And Runtime Config For Release

**Files:**
- Modify: `frontend/app.config.js`
- Modify: `frontend/app.json`
- Inspect: `frontend/eas.json`
- Modify: `frontend/android/app/build.gradle`
- Modify: `frontend/android/app/src/main/res/values/strings.xml` if version/name generated files require it
- Modify: `frontend/ios/RecallPeople.xcodeproj/project.pbxproj` only if local prebuild changes it

- [ ] **Step 1: Decide release version**

Use the next app version after `1.0.3`:

```txt
version: 1.0.4
iOS buildNumber: 26
Android versionCode: 8
runtimeVersion: 1.0.4
```

Expected: version increases because data behavior and legal disclosures change.

- [ ] **Step 2: Update Expo config**

In both `frontend/app.config.js` and `frontend/app.json`, set:

```json
"version": "1.0.4",
"ios": {
  "buildNumber": "26"
},
"android": {
  "versionCode": 8
},
"runtimeVersion": "1.0.4"
```

In `frontend/app.json`, remove duplicate Android permissions so the list is:

```json
"permissions": [
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS"
]
```

Expected: no new native permissions are added.

- [ ] **Step 3: Verify production API env still points to production**

In `frontend/eas.json`, confirm production env still includes:

```json
"EXPO_PUBLIC_API_URL": "https://api.recallpeople.com"
```

Do not add encryption secrets to frontend EAS env. `SYNC_ENCRYPTION_KEY` belongs only to backend runtime secrets.

- [ ] **Step 4: Verify native version files**

Run:

```bash
cd frontend
npx expo config --type public
```

Expected: printed config shows `1.0.4`, iOS build `26`, Android versionCode `8`, and no new permissions.

Run Android prebuild to refresh generated native version files, then inspect the diff:

```bash
cd frontend
npx expo prebuild --platform android --no-install
```

Then inspect and commit only intentional version/config changes.

- [ ] **Step 5: Commit release config**

Run:

```bash
git add frontend/app.config.js frontend/app.json frontend/eas.json frontend/android/app/build.gradle frontend/android/app/src/main/res/values/strings.xml
git commit -m "chore: prepare sync release config"
```

---

### Task 11: Full Verification And Two-Device QA

**Files:**
- No new source files unless tests reveal bugs.

- [ ] **Step 1: Run full automated tests**

Run:

```bash
cd backend
SYNC_ENCRYPTION_KEY="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")" npm test

cd ../frontend
npm test
npm run lint
npx tsc --noEmit --pretty false

cd ../landing-page
npm run build
```

Expected:

- Backend tests pass.
- Frontend tests pass.
- Frontend lint has no errors; existing warnings are acceptable only if unrelated.
- TypeScript errors must be reviewed. Existing unrelated errors can be listed in final output, but new sync files must type-check.
- Landing build passes.

- [ ] **Step 2: Backend local smoke test**

Run backend locally with a real `SYNC_ENCRYPTION_KEY`, then:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8787/api/sync/bootstrap
```

Expected:

```json
{"hasServerData":false,"cursor":"0"}
```

Use a real auth token from the app/dev login flow.

- [ ] **Step 3: Android emulator QA**

Use the Android emulator:

1. Install app build.
2. Login.
3. Create one contact with a note, group, and upcoming event.
4. Confirm sync status in Profile becomes recently synced.
5. Clear local app data.
6. Login again.
7. Confirm contact/note/group/event return from server.

Expected: no recovery phrase, no backup sheet, no data loss.

- [ ] **Step 4: Two-device QA**

Use two devices or emulator + physical phone:

1. Phone A logs in and creates contact "Ada Sync".
2. Phone B logs into same account and foregrounds app.
3. Phone B receives "Ada Sync".
4. Phone A adds a note.
5. Phone B foregrounds app and receives the note.
6. Phone B adds a different note offline, then reconnects.
7. Phone A foregrounds app and both notes are visible.
8. Phone A deletes the contact.
9. Phone B foregrounds app and the contact is hidden/deleted.

Expected: additive changes survive; deletion propagates.

- [ ] **Step 5: Raw DB encryption check**

Query production-like Postgres for a test user:

```sql
SELECT encrypted_first_name, encrypted_email, encrypted_ai_summary
FROM synced_contacts
LIMIT 1;
```

Expected: values look like `v1:<nonce>:<tag>:<ciphertext>`, not plaintext.

- [ ] **Step 6: Store submission checklist**

Before App Store submission:

- App Store Connect privacy labels updated.
- Google Play Data Safety updated.
- Landing Privacy Policy URL live and reflects sync.
- Terms URL live and reflects sync.
- No new permission prompts added.
- iOS build number increased to `26`.
- Android versionCode increased to `8`.
- Android build for Play uses local AAB build when possible to avoid EAS quota.
- iOS build can use EAS if local iOS signing is not configured.

---

### Task 12: Final Commit Strategy

**Files:**
- All files touched by implementation.

- [ ] **Step 1: Review dirty worktree**

Run:

```bash
git status --short
git diff --stat
```

Expected: no unrelated `.superpowers`, `.playwright-mcp`, local credentials, generated build artifacts, or service account JSON are staged.

- [ ] **Step 2: Commit in logical chunks**

Use these commits:

```bash
git commit -m "feat: add account sync backend"
git commit -m "feat: add account sync client"
git commit -m "refactor: remove recovery phrase backup"
git commit -m "copy: update sync privacy messaging"
git commit -m "chore: prepare sync release config"
```

Expected: each commit builds on the previous one and can be reviewed independently.

- [ ] **Step 3: Push only after verification**

Run:

```bash
git push origin codex/encrypted-sync-onboarding
```

Expected: branch pushed after tests and QA evidence are collected.
