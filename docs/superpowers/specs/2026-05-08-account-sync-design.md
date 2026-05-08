# Account-Based Secure Sync Design

## Context

Recall People currently stores the user's relationship data in local SQLite. That gives a strong local-first story, but it has a critical product weakness: if the user deletes the app, loses a phone, or signs in on another phone, their contacts are not restored automatically.

An encrypted backup design with a recovery phrase was explored, but it adds too much user friction for the product goal. That implementation has not shipped to production, so it can be removed instead of migrated. The new direction is account-based automatic sync: the user signs in, and their contacts follow them across devices.

## Product Goal

Make sync feel automatic and boring:

- No recovery phrase.
- No PIN.
- No OTP.
- No manual restore flow in normal use.
- A user can use several phones on the same account.
- Existing local-only users are upgraded without losing local data.

The privacy promise must stay strong but technically accurate. Recall can say that sensitive data is encrypted in the database and synced securely. Recall must not claim zero-knowledge encryption or say that the backend cannot decrypt data.

## Non-Goals

- Zero-knowledge encryption.
- User-managed keys.
- Recovery phrases or backup codes.
- A conflict resolution UI in the first version.
- Reusing the snapshot backup product surface.
- Migrating the unshipped recovery-phrase implementation as a user-facing feature.

## Architecture

The backend becomes the source of truth for synced relationship data. SQLite remains a local cache for fast screens, offline reads, and optimistic writes.

The sync system is entity-based rather than snapshot-based. Each synced record has a stable ID, `updatedAt`, and `deletedAt`. Devices push local mutations and pull server changes since their last sync cursor.

Core synced entities:

- Contacts.
- Notes.
- Groups and contact-group memberships.
- Hot topics / events.
- AI-generated fields already shown in the app, including summaries, conversation ideas, meeting context, and highlights.
- Per-contact reminder settings where applicable.

The previous `SyncSnapshot` approach should be removed from product code. If the table/migration exists only in an unshipped branch, delete it. If it has already reached any shared environment, replace it with a safe follow-up migration that leaves no user-facing dependency on snapshot backups.

## Privacy And Encryption

Sensitive fields are encrypted before being stored in Postgres, using AES-256-GCM with a server-managed encryption key. For the first implementation, the key lives in the platform secret store as an environment secret. KMS envelope encryption can replace this later without changing the product behavior.

This means:

- A raw database dump should not expose contact names, notes, meeting context, summaries, or personal events in plaintext.
- The backend application can decrypt data when serving authenticated requests.
- The app can truthfully say data is encrypted in the database.
- The app must not say Recall is unable to decrypt user data.

Recommended wording:

- "Your contacts are encrypted in our database."
- "Your data syncs securely across your devices."
- "We don't sell your data."
- "We don't use your personal contacts to train AI models."

Avoid:

- "Zero-knowledge."
- "Only you can decrypt your data."
- "We cannot read or decrypt your data."

## Sync Flow

### Initial Login On A New Or Empty Device

1. User signs in.
2. App checks whether local SQLite has user data.
3. App checks whether the server has synced data for this account.
4. If local is empty and server has data, app pulls from server and hydrates SQLite.
5. If local is empty and server is empty, app starts normally.

### Existing Local-Only User Migration

This is the important production migration path.

On first app launch after the sync release, for an authenticated user:

1. App checks local SQLite.
2. App checks whether the server already has synced data for the account.
3. If local has contacts/notes and server is empty, the app uploads the local database content as the initial server state.
4. After the upload succeeds, the app stores a local sync cursor and marks the device as synced.
5. The user does not see a migration wizard unless something fails.

If both local and server have data, the app should not blindly overwrite either side. The MVP behavior should be:

- Pull server data.
- Merge append-only entities by ID.
- For same-ID scalar conflicts, prefer the record with the newest `updatedAt`.
- Preserve local-only records by uploading them after pull if their IDs are not present server-side.
- Log conflicts for debugging rather than showing a conflict UI.

This handles the likely cases without making users think about sync.

### Normal Mutation Flow

When a user creates or edits data:

1. App writes to SQLite immediately.
2. App marks the record as dirty in a local sync queue.
3. App pushes the mutation to the server in the background.
4. Server validates ownership, encrypts sensitive fields, writes the record, and returns the canonical version.
5. App updates SQLite with canonical timestamps and clears the dirty flag.

If the device is offline, dirty mutations remain queued and retry later.

### Pull Flow

The app pulls changes:

- On app launch after auth is ready.
- When the app returns to foreground.
- After a successful mutation if the local cursor is stale.
- From a manual "Sync now" action in Profile.

The pull endpoint returns all changes since the device cursor, including tombstones for deletions.

## Conflict Rules

MVP conflict handling should be deterministic and invisible unless there is a serious failure.

- Notes: merge by ID. Different notes are additive.
- Events / hot topics: merge by ID.
- Groups: merge by ID.
- Contact-group memberships: merge by composite key.
- Contact scalar fields: last-write-wins using server `updatedAt`.
- Deletions: use `deletedAt` tombstones. A deletion wins over older updates.
- AI fields: last-write-wins. They can be regenerated later if needed.

This is acceptable for the first version because the most common user behavior is adding notes, not concurrently editing the same scalar field on two phones.

## Backend API Shape

Suggested endpoints:

- `GET /api/sync/bootstrap`: returns whether the server has synced data and the latest cursor.
- `GET /api/sync/changes?cursor=...`: returns entity changes since cursor. The backend decrypts sensitive fields after auth and returns them to the app over TLS.
- `POST /api/sync/push`: accepts a batch of local mutations.
- `POST /api/sync/initialize`: uploads local data as the first server state when the server is empty.

The client API should use authenticated requests only. Every row must be scoped by `userId`.

Use entity-specific tables with encrypted columns for sensitive values. This keeps ownership, deletion, sync cursors, and future debugging clearer than one opaque JSON blob per entity.

## Frontend UX

### Onboarding

Keep the improved onboarding structure, but replace the recovery-phrase privacy slide.

Proposed final slide:

- Title: "Your contacts follow you"
- Body: "Sign in once. Recall keeps your contacts backed up and synced across your devices, with sensitive data encrypted in our database."
- CTA: "Continue"

No recovery phrase. No code. No extra decision.

### Profile

Replace "Encrypted backup" with "Secure sync".

Show:

- Status: enabled when authenticated.
- Last synced timestamp.
- Optional "Sync now" button.
- Short privacy line: "Sensitive data is encrypted in our database."

If the user is logged out, show that sync requires an account.

## Landing Page, Legal, And App Store

Landing page privacy content must be updated to remove any "local only" or "no cloud sync" promises.

Privacy page should say:

- Recall stores account data and relationship data to provide sync across devices.
- Sensitive relationship data is encrypted in the database.
- Personal contacts and notes are not sold.
- Personal contacts and notes are not used to train AI models.
- AI providers may process user-submitted notes when the user asks Recall to extract, summarize, transcribe, or answer questions, subject to provider terms and configured retention.

Terms should say:

- Users are responsible for the content they add.
- Recall processes and stores relationship data to provide the service.
- Sync is provided on a best-effort basis and can require network connectivity.
- Deleting an account deletes server-side synced data according to the deletion policy.

App Store Connect privacy labels need review. If current labels imply contact data is not collected or never leaves the device, they must be updated before the sync release.

## Testing

Backend tests:

- Authenticated user can initialize server state from local data.
- User cannot read or mutate another user's rows.
- Sensitive fields are not stored plaintext.
- Pull returns changes after a cursor.
- Push handles create, update, delete, and tombstones.
- Last-write-wins behaves deterministically.

Frontend tests:

- Existing local-only database uploads when server is empty.
- Empty device pulls server data.
- Offline mutation is queued and later pushed.
- Deletion syncs as tombstone.
- Profile sync status reflects last sync timestamp.
- Onboarding no longer references recovery phrase.

Manual QA:

- Install on phone A, create contacts and notes, verify phone B receives them after login.
- Add note on A, foreground B, verify update appears.
- Add different notes on A and B offline, reconnect both, verify both notes survive.
- Delete a contact on A, verify B removes it after sync.
- Verify raw DB values for sensitive fields are encrypted.

## Rollout

The first shipped version of this feature should be treated as a migration from local-only to account-sync.

Rollout sequence:

1. Remove recovery-phrase backup UI and snapshot product copy.
2. Add server entity models and encrypted field helpers.
3. Add sync endpoints.
4. Add client sync engine and local dirty queue.
5. Add first-run local-to-server initialization for existing local-only users.
6. Update onboarding, Profile, landing privacy page, Terms, Privacy Policy, and App Store privacy declarations.
7. QA with two devices before submission.

## Implementation Decisions

- Encryption: AES-256-GCM using a server-managed environment secret for MVP.
- Sync cursor: monotonic server sequence, not a timestamp cursor.
- Avatars: sync avatar metadata and URLs only; binary files stay in the existing avatar storage path.
- API transport: authenticated HTTPS/TLS. The app receives decrypted values after auth and stores them in local SQLite for offline use.
