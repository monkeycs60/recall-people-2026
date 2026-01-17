/**
 * Database utility functions for V2 migration and development
 */

import { getDatabase } from './db';

/**
 * Get the current database version and migration status
 */
export const getDatabaseStatus = async () => {
  const database = await getDatabase();

  // Check migration markers
  const v2MigrationMarker = await database.getFirstAsync<{ value: string; created_at: string }>(
    "SELECT value, created_at FROM migration_markers WHERE key = 'v2_migration_completed'"
  ).catch(() => null);

  // Get table list
  const tables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );

  // Get contacts count
  const contactsCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM contacts"
  );

  // Get notes count
  const notesCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM notes"
  );

  // Get hot topics count
  const hotTopicsCount = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM hot_topics"
  );

  // Check if deprecated tables exist
  const hasFactsTable = tables.some(t => t.name === 'facts');
  const hasMemoriesTable = tables.some(t => t.name === 'memories');
  const hasPendingFactsTable = tables.some(t => t.name === 'pending_facts');
  const hasSimilarityCacheTable = tables.some(t => t.name === 'similarity_cache');

  return {
    v2Migration: {
      completed: !!v2MigrationMarker,
      completedAt: v2MigrationMarker?.created_at,
    },
    tables: tables.map(t => t.name),
    deprecatedTables: {
      facts: hasFactsTable,
      memories: hasMemoriesTable,
      pendingFacts: hasPendingFactsTable,
      similarityCache: hasSimilarityCacheTable,
    },
    counts: {
      contacts: contactsCount?.count ?? 0,
      notes: notesCount?.count ?? 0,
      hotTopics: hotTopicsCount?.count ?? 0,
    },
  };
};

/**
 * Export database to JSON for backup or debugging
 */
export const exportDatabase = async () => {
  const database = await getDatabase();

  const contacts = await database.getAllAsync("SELECT * FROM contacts");
  const notes = await database.getAllAsync("SELECT * FROM notes");
  const hotTopics = await database.getAllAsync("SELECT * FROM hot_topics");
  const groups = await database.getAllAsync("SELECT * FROM groups").catch(() => []);
  const contactGroups = await database.getAllAsync("SELECT * FROM contact_groups").catch(() => []);

  return {
    version: 'v2',
    exportedAt: new Date().toISOString(),
    data: {
      contacts,
      notes,
      hotTopics,
      groups,
      contactGroups,
    },
  };
};

/**
 * Force re-run V2 migration (for development only)
 * WARNING: This will delete and recreate tables
 */
export const forceRerunV2Migration = async () => {
  const database = await getDatabase();

  // Remove V2 migration marker
  await database.execAsync("DELETE FROM migration_markers WHERE key = 'v2_migration_completed'");

  console.log('[DB Utils] V2 migration marker removed. Migration will run on next app restart.');
};

/**
 * Get database schema for a specific table
 */
export const getTableSchema = async (tableName: string) => {
  const database = await getDatabase();

  const columns = await database.getAllAsync<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>(`PRAGMA table_info(${tableName})`);

  const indexes = await database.getAllAsync<{
    name: string;
    sql: string;
  }>(`SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${tableName}'`);

  return {
    tableName,
    columns,
    indexes,
  };
};

/**
 * Check if contacts have the new V2 fields
 */
export const checkV2Fields = async () => {
  const database = await getDatabase();

  const contactsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(contacts)"
  );

  const notesInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(notes)"
  );

  const hotTopicsInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(hot_topics)"
  );

  return {
    contacts: {
      hasRelationshipType: contactsInfo.some((col) => col.name === 'relationship_type'),
      hasSuggestedQuestions: contactsInfo.some((col) => col.name === 'suggested_questions'),
      hasTags: contactsInfo.some((col) => col.name === 'tags'),
      hasHighlights: contactsInfo.some((col) => col.name === 'highlights'),
      hasIceBreakers: contactsInfo.some((col) => col.name === 'ice_breakers'),
    },
    notes: {
      hasTitle: notesInfo.some((col) => col.name === 'title'),
      hasTranscription: notesInfo.some((col) => col.name === 'transcription'),
      hasSummary: notesInfo.some((col) => col.name === 'summary'),
      hasUpdatedAt: notesInfo.some((col) => col.name === 'updated_at'),
    },
    hotTopics: {
      hasEventDate: hotTopicsInfo.some((col) => col.name === 'event_date'),
      hasResolution: hotTopicsInfo.some((col) => col.name === 'resolution'),
      hasResolvedAt: hotTopicsInfo.some((col) => col.name === 'resolved_at'),
    },
  };
};
