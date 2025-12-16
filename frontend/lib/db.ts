import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('recall_people.db');

    // Enable WAL mode for better performance
    await db.execAsync('PRAGMA journal_mode = WAL');
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  return db;
};

export const initDatabase = async () => {
  const database = await getDatabase();

  await database.execAsync(`
    -- Contacts
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT,
      nickname TEXT,
      photo_uri TEXT,
      tags TEXT DEFAULT '[]',
      highlights TEXT DEFAULT '[]',
      ai_summary TEXT,
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
      previous_values TEXT DEFAULT '[]',
      source_note_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Notes
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      title TEXT,
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

    -- Similarity cache (for network graph)
    CREATE TABLE IF NOT EXISTS similarity_cache (
      id TEXT PRIMARY KEY,
      fact_value_1 TEXT NOT NULL,
      fact_value_2 TEXT NOT NULL,
      fact_type TEXT NOT NULL,
      similarity_score REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    -- Hot Topics (sujets chauds)
    CREATE TABLE IF NOT EXISTS hot_topics (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      title TEXT NOT NULL,
      context TEXT,
      status TEXT DEFAULT 'active',
      source_note_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    -- Index
    CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at DESC);
    CREATE INDEX IF NOT EXISTS idx_facts_contact ON facts(contact_id);
    CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
    CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_similarity_lookup ON similarity_cache(fact_type, fact_value_1, fact_value_2);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_contact ON hot_topics(contact_id);
    CREATE INDEX IF NOT EXISTS idx_hot_topics_status ON hot_topics(status);
  `);

  // Run migrations for existing databases
  await runMigrations(database);
};

const runMigrations = async (database: SQLite.SQLiteDatabase) => {
  // Check if highlights column exists on contacts
  const contactsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(contacts)"
  );
  const hasHighlights = contactsInfo.some((col) => col.name === 'highlights');
  if (!hasHighlights) {
    await database.execAsync("ALTER TABLE contacts ADD COLUMN highlights TEXT DEFAULT '[]'");
  }

  // Check if previous_values column exists on facts
  const factsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(facts)"
  );
  const hasPreviousValues = factsInfo.some((col) => col.name === 'previous_values');
  if (!hasPreviousValues) {
    await database.execAsync("ALTER TABLE facts ADD COLUMN previous_values TEXT DEFAULT '[]'");
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

  // Create hot_topics table if not exists
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS hot_topics (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      title TEXT NOT NULL,
      context TEXT,
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
};
