/**
 * Migration V2 Logger
 * Logs migration status on app startup for development
 */

import { getDatabaseStatus } from './db-utils';

/**
 * Log migration status to console (dev mode only)
 */
export const logMigrationStatus = async () => {
  if (__DEV__) {
    try {
      const status = await getDatabaseStatus();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Database Status (V2 Migration)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (status.v2Migration.completed) {
        console.log('✅ V2 Migration: COMPLETED');
        console.log(`   Completed at: ${status.v2Migration.completedAt}`);
      } else {
        console.log('⏳ V2 Migration: PENDING');
        console.log('   Will run on next database initialization');
      }

      console.log('\n📊 Data counts:');
      console.log(`   Contacts: ${status.counts.contacts}`);
      console.log(`   Notes: ${status.counts.notes}`);
      console.log(`   Hot Topics: ${status.counts.hotTopics}`);

      console.log('\n📁 Tables:');
      console.log(`   Total: ${status.tables.length} tables`);

      if (
        status.deprecatedTables.facts ||
        status.deprecatedTables.memories ||
        status.deprecatedTables.pendingFacts ||
        status.deprecatedTables.similarityCache
      ) {
        console.log('\n⚠️  Deprecated tables still present:');
        if (status.deprecatedTables.facts) console.log('   - facts (will be removed)');
        if (status.deprecatedTables.memories) console.log('   - memories (will be removed)');
        if (status.deprecatedTables.pendingFacts) console.log('   - pending_facts (will be removed)');
        if (status.deprecatedTables.similarityCache) console.log('   - similarity_cache (will be removed)');
      } else {
        console.log('\n✅ All deprecated tables removed');
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
      console.error('❌ Failed to get database status:', error);
    }
  }
};
