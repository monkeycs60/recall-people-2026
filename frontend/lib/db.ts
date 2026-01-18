import * as SQLite from 'expo-sqlite';
import { documentDirectory, deleteAsync } from 'expo-file-system';
import { seedE2EData } from './e2e-seed';

const isE2ETest = process.env.EXPO_PUBLIC_E2E_TEST === 'true';

let db: SQLite.SQLiteDatabase | null = null;

const getDbName = () => (isE2ETest ? 'recall_people_test.db' : 'recall_people.db');

const resetTestDatabase = async (dbName: string) => {
  const dbPath = `${documentDirectory}SQLite/${dbName}`;
  try {
    await deleteAsync(dbPath, { idempotent: true });
    console.log('[E2E] Test database reset');
  } catch {
    // File doesn't exist, nothing to reset
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    const dbName = getDbName();

    // In E2E mode, reset database on each app launch
    if (isE2ETest) {
      await resetTestDatabase(dbName);
    }

    db = await SQLite.openDatabaseAsync(dbName);

    // Enable WAL mode for better performance
    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  return db;
};

export const initDatabase = async () => {
  const database = await getDatabase();

  await database.execAsync(`
    -- Contacts (V2 Schema - Simplified)
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      nickname TEXT,
      gender TEXT DEFAULT 'unknown',

      -- Contact info
      phone TEXT,
      email TEXT,
      birthday_day INTEGER,
      birthday_month INTEGER,
      birthday_year INTEGER,

      -- Relationship
      relationship_type TEXT DEFAULT 'connaissance',

      -- Avatar
      photo_uri TEXT,
      avatar_url TEXT,

      -- AI-generated (regenerated after each note)
      ai_summary TEXT,
      suggested_questions TEXT,

      -- Meta
      last_contact_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Notes (V2 Schema - Source of truth)
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,

      -- Content
      title TEXT,
      transcription TEXT NOT NULL,

      -- Audio (optional)
      audio_uri TEXT,
      audio_duration_ms INTEGER,

      -- Meta
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Hot Topics (V2 Schema - Events to follow)
    CREATE TABLE IF NOT EXISTS hot_topics (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,

      -- Content
      title TEXT NOT NULL,
      context TEXT,

      -- Event date (optional, for reminders)
      event_date TEXT,

      -- Status
      status TEXT DEFAULT 'active',
      resolution TEXT,
      resolved_at TEXT,

      -- Meta
      source_note_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),

      -- Legacy fields for birthday events
      notified_at TEXT,
      birthday_contact_id TEXT,

      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE SET NULL
    );

    -- Groups (optional, kept from V1)
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Contact-Group relationship
    CREATE TABLE IF NOT EXISTS contact_groups (
      contact_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (contact_id, group_id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    -- Migration markers (for tracking migrations)
    CREATE TABLE IF NOT EXISTS migration_markers (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_contact ON hot_topics(contact_id);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_event_date ON hot_topics(event_date);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_birthday ON hot_topics(birthday_contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_contact ON contact_groups(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_group ON contact_groups(group_id);
  `);

  // Run migrations for existing databases
  await runMigrations(database);

  // Seed test data in E2E mode
  if (isE2ETest) {
    await seedE2EData(database);
  }
};

const runMigrations = async (database: SQLite.SQLiteDatabase) => {
  // Get current schema information
  const contactsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(contacts)"
  );

  // V2 Migration: Add relationship_type and suggested_questions
  const hasRelationshipType = contactsInfo.some((col) => col.name === 'relationship_type');
  if (!hasRelationshipType) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN relationship_type TEXT DEFAULT 'connaissance'");
  }

  const hasSuggestedQuestions = contactsInfo.some((col) => col.name === 'suggested_questions');
  if (!hasSuggestedQuestions) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN suggested_questions TEXT");
  }

  // Legacy migrations
  const hasHighlights = contactsInfo.some((col) => col.name === 'highlights');
  if (!hasHighlights) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN highlights TEXT DEFAULT '[]'");
  }

  // Check if facts table exists before trying to migrate it
  // (V2 removes this table, and new installs won't have it)
  const factsTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='facts'"
  );

  if (factsTableExists) {
    // Check if previous_values column exists on facts
    const factsInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(facts)"
    );
    const hasPreviousValues = factsInfo.some((col) => col.name === 'previous_values');
    if (!hasPreviousValues) {
      await database.execAsync("ALTER TABLE facts ADD COLUMN previous_values TEXT DEFAULT '[]'");
    }

    // Check if title column exists on facts (for "other" fact types)
    const hasFactTitle = factsInfo.some((col) => col.name === 'title');
    if (!hasFactTitle) {
      await database.execAsync("ALTER TABLE facts ADD COLUMN title TEXT");
    }
  }

  // Check if title column exists on notes
  const notesInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(notes)"
  );
  const hasTitle = notesInfo.some((col) => col.name === 'title');
  if (!hasTitle) {
    await database.execAsync("ALTER TABLE notes ADD COLUMN title TEXT");
  }

  // Check if ai_summary column exists on contacts
  const hasAiSummary = contactsInfo.some((col) => col.name === 'ai_summary');
  if (!hasAiSummary) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN ai_summary TEXT");
  }

  // Check if ice_breakers column exists on contacts
  const hasIceBreakers = contactsInfo.some((col) => col.name === 'ice_breakers');
  if (!hasIceBreakers) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN ice_breakers TEXT");
  }

  // Create hot_topics table if not exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS hot_topics (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      title TEXT NOT NULL,
      context TEXT,
      resolution TEXT,
      status TEXT DEFAULT 'active',
      source_note_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_hot_topics_contact ON hot_topics(contact_id);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status);
  `);

  // Check if resolution column exists on hot_topics
  const hotTopicsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(hot_topics)"
  );
  const hasResolution = hotTopicsInfo.some((col) => col.name === 'resolution');
  if (!hasResolution) {
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN resolution TEXT");
  }

  // Migration: Add event_date, notified_at, birthday_contact_id to hot_topics
  const hasEventDate = hotTopicsInfo.some((col) => col.name === 'event_date');
  if (!hasEventDate) {
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN event_date TEXT");
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN notified_at TEXT");
    await database.execAsync("ALTER TABLE hot_topics ADD COLUMN birthday_contact_id TEXT");
    await database.execAsync("CREATE INDEX IF NOT EXISTS idx_hot_topics_event_date ON hot_topics(event_date)");
    await database.execAsync("CREATE INDEX IF NOT EXISTS idx_hot_topics_birthday ON hot_topics(birthday_contact_id)");
  }

  // Migration: Migrate events to hot_topics (one-time)
  const eventsTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
  );

  if (eventsTableExists) {
    // Copy events to hot_topics
    await database.execAsync(`
      INSERT INTO hot_topics (id, contact_id, title, context, status, event_date, source_note_id, created_at, updated_at)
      SELECT id, contact_id, title, NULL, 'active', event_date, source_note_id, created_at, created_at
      FROM events
    `);

    // Copy notified_at values
    await database.execAsync(`
      UPDATE hot_topics
      SET notified_at = (SELECT events.notified_at FROM events WHERE events.id = hot_topics.id)
      WHERE id IN (SELECT id FROM events)
    `);

    // Drop the events table and its indexes
    await database.execAsync("DROP INDEX IF EXISTS idx_events_contact");
    await database.execAsync("DROP INDEX IF EXISTS idx_events_date");
    await database.execAsync("DROP TABLE events");
  }

  // Create groups tables if not exist
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_groups (
      contact_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (contact_id, group_id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_groups_contact ON contact_groups(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_groups_group ON contact_groups(group_id);
  `);

  // Create memories table if not exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      description TEXT NOT NULL,
      event_date TEXT,
      is_shared INTEGER DEFAULT 0,
      source_note_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_memories_contact ON memories(contact_id);
    CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
  `);

  // Note: events table has been migrated to hot_topics (see migration above)
  // The events table is no longer created - events are now stored as hot_topics with event_date

  // Check if phone/email/birthday columns exist on contacts
  const hasPhone = contactsInfo.some((col) => col.name === 'phone');
  if (!hasPhone) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN phone TEXT");
  }

  const hasEmail = contactsInfo.some((col) => col.name === 'email');
  if (!hasEmail) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN email TEXT");
  }

  const hasBirthdayDay = contactsInfo.some((col) => col.name === 'birthday_day');
  if (!hasBirthdayDay) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN birthday_day INTEGER");
    await database.execAsync("ALTER TABLE contacts ADD COLUMN birthday_month INTEGER");
    await database.execAsync("ALTER TABLE contacts ADD COLUMN birthday_year INTEGER");
  }

  // Check if gender column exists on contacts
  const hasGender = contactsInfo.some((col) => col.name === 'gender');
  if (!hasGender) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN gender TEXT DEFAULT 'unknown'");
  }

  // Check if avatar_url column exists on contacts
  const hasAvatarUrl = contactsInfo.some((col) => col.name === 'avatar_url');
  if (!hasAvatarUrl) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN avatar_url TEXT");
  }

  // V2 Migration: Mark that we've completed V2 migration
  await runV2Migration(database);
};

/**
 * V2 Migration: Remove deprecated tables (facts, memories)
 * This migration is idempotent and safe to run multiple times
 */
const runV2Migration = async (database: SQLite.SQLiteDatabase) => {
  // Check if we've already run V2 migration by checking for a migration marker
  const hasV2MigrationMarker = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM migration_markers WHERE key = 'v2_migration_completed'"
  ).catch(() => null);

  if (hasV2MigrationMarker) {
    return; // Migration already completed
  }

  // Create migration markers table if it doesn't exist
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS migration_markers (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Drop deprecated tables: facts and memories
  // These are replaced by the notes-centric approach in V2
  const factsTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='facts'"
  );

  if (factsTableExists) {
    console.log('[Migration V2] Dropping facts table...');
    await database.execAsync("DROP INDEX IF EXISTS idx_facts_contact");
    await database.execAsync("DROP TABLE IF EXISTS facts");
  }

  const memoriesTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='memories'"
  );

  if (memoriesTableExists) {
    console.log('[Migration V2] Dropping memories table...');
    await database.execAsync("DROP INDEX IF EXISTS idx_memories_contact");
    await database.execAsync("DROP INDEX IF EXISTS idx_memories_created");
    await database.execAsync("DROP TABLE IF EXISTS memories");
  }

  // Drop pending_facts table as well (no longer needed)
  const pendingFactsTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pending_facts'"
  );

  if (pendingFactsTableExists) {
    console.log('[Migration V2] Dropping pending_facts table...');
    await database.execAsync("DROP TABLE IF EXISTS pending_facts");
  }

  // Drop similarity_cache table (no longer needed without facts)
  const similarityCacheTableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='similarity_cache'"
  );

  if (similarityCacheTableExists) {
    console.log('[Migration V2] Dropping similarity_cache table...');
    await database.execAsync("DROP INDEX IF EXISTS idx_similarity_lookup");
    await database.execAsync("DROP TABLE IF EXISTS similarity_cache");
  }

  // Remove deprecated columns from contacts table (tags, highlights, ice_breakers)
  // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
  const contactsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(contacts)"
  );

  const hasTags = contactsInfo.some((col) => col.name === 'tags');
  const hasHighlights = contactsInfo.some((col) => col.name === 'highlights');
  const hasIceBreakers = contactsInfo.some((col) => col.name === 'ice_breakers');

  if (hasTags || hasHighlights || hasIceBreakers) {
    console.log('[Migration V2] Removing deprecated columns from contacts table...');

    // Create new contacts table without deprecated columns
    await database.execAsync(`
      CREATE TABLE contacts_v2 (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        nickname TEXT,
        gender TEXT DEFAULT 'unknown',
        phone TEXT,
        email TEXT,
        birthday_day INTEGER,
        birthday_month INTEGER,
        birthday_year INTEGER,
        relationship_type TEXT DEFAULT 'connaissance',
        photo_uri TEXT,
        avatar_url TEXT,
        ai_summary TEXT,
        suggested_questions TEXT,
        last_contact_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Copy data from old table to new table
    await database.execAsync(`
      INSERT INTO contacts_v2 (
        id, first_name, last_name, nickname, gender,
        phone, email, birthday_day, birthday_month, birthday_year,
        relationship_type, photo_uri, avatar_url,
        ai_summary, suggested_questions,
        last_contact_at, created_at, updated_at
      )
      SELECT
        id, first_name, last_name, nickname, gender,
        phone, email, birthday_day, birthday_month, birthday_year,
        relationship_type, photo_uri, avatar_url,
        ai_summary, suggested_questions,
        last_contact_at, created_at, updated_at
      FROM contacts;
    `);

    // Drop old table and rename new table
    await database.execAsync("DROP INDEX IF EXISTS idx_contacts_last_contact");
    await database.execAsync("DROP TABLE contacts");
    await database.execAsync("ALTER TABLE contacts_v2 RENAME TO contacts");
    await database.execAsync("CREATE INDEX idx_contacts_last_contact ON contacts(last_contact_at DESC)");
  }

  // Remove deprecated columns from notes table (summary)
  const notesInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(notes)"
  );

  const hasSummary = notesInfo.some((col) => col.name === 'summary');

  if (hasSummary) {
    console.log('[Migration V2] Removing summary column from notes table...');

    // Create new notes table without summary column
    await database.execAsync(`
      CREATE TABLE notes_v2 (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        title TEXT,
        transcription TEXT NOT NULL,
        audio_uri TEXT,
        audio_duration_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);

    // Copy data from old table to new table
    await database.execAsync(`
      INSERT INTO notes_v2 (
        id, contact_id, title, transcription,
        audio_uri, audio_duration_ms, created_at
      )
      SELECT
        id, contact_id, title, transcription,
        audio_uri, audio_duration_ms, created_at
      FROM notes;
    `);

    // Drop old table and rename new table
    await database.execAsync("DROP INDEX IF EXISTS idx_notes_contact");
    await database.execAsync("DROP INDEX IF EXISTS idx_notes_created");
    await database.execAsync("DROP TABLE notes");
    await database.execAsync("ALTER TABLE notes_v2 RENAME TO notes");
    await database.execAsync("CREATE INDEX idx_notes_contact ON notes(contact_id)");
    await database.execAsync("CREATE INDEX idx_notes_created ON notes(created_at DESC)");
  }

  // Add updated_at column to notes if it doesn't exist
  const notesInfoUpdated = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(notes)"
  );
  const hasUpdatedAt = notesInfoUpdated.some((col) => col.name === 'updated_at');
  if (!hasUpdatedAt) {
    await database.execAsync("ALTER TABLE notes ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))");
  }

  // Mark V2 migration as completed
  await database.execAsync(`
    INSERT OR REPLACE INTO migration_markers (key, value)
    VALUES ('v2_migration_completed', 'true');
  `);

  console.log('[Migration V2] Migration completed successfully');
};
