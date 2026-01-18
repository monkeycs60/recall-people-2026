import type { SQLiteDatabase } from 'expo-sqlite';

export const seedE2EData = async (db: SQLiteDatabase) => {
  console.log('[E2E] Seeding test data...');

  // Test contacts with known IDs for assertions
  // These match the audio fixtures: brenda, bucheron (nickname), juliana
  // V2: Using V2 schema (no facts table, relationship_type instead)
  await db.runAsync(`
    INSERT OR REPLACE INTO contacts (id, first_name, last_name, ai_summary, relationship_type, created_at, updated_at)
    VALUES
      ('e2e-brenda-001', 'Brenda', 'Dupont', 'Brenda travaille dans le marketing digital. Elle cherche actuellement un nouveau poste.', 'connaissance', datetime('now'), datetime('now')),
      ('e2e-bucheron-001', 'Pierre', 'Martin', 'Pierre est surnommé Bucheron. Il travaille dans la construction et vit à Lyon.', 'connaissance', datetime('now'), datetime('now')),
      ('e2e-juliana-001', 'Juliana', 'Silva', 'Juliana est développeuse et passionnée de voyages.', 'connaissance', datetime('now'), datetime('now'))
  `);

  // V2: facts table removed - info is now in notes and extracted on demand

  // Active hot topic for resolution scenario
  await db.runAsync(`
    INSERT OR REPLACE INTO hot_topics (id, contact_id, title, context, status, created_at, updated_at)
    VALUES
      ('e2e-topic-001', 'e2e-brenda-001', 'Recherche emploi', 'Elle cherche un nouveau poste dans le marketing', 'active', datetime('now'), datetime('now')),
      ('e2e-topic-002', 'e2e-bucheron-001', 'Projet maison', 'Il construit une maison pour sa famille', 'active', datetime('now'), datetime('now'))
  `);

  console.log('[E2E] Test data seeded successfully');
};
