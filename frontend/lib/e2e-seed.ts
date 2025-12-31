import type { SQLiteDatabase } from 'expo-sqlite';

export const seedE2EData = async (db: SQLiteDatabase) => {
  console.log('[E2E] Seeding test data...');

  // Test contacts with known IDs for assertions
  // These match the audio fixtures: brenda, bucheron (nickname), juliana
  await db.runAsync(`
    INSERT OR REPLACE INTO contacts (id, first_name, last_name, ai_summary, created_at)
    VALUES
      ('e2e-brenda-001', 'Brenda', 'Dupont', 'Brenda travaille dans le marketing digital. Elle cherche actuellement un nouveau poste.', datetime('now')),
      ('e2e-bucheron-001', 'Pierre', 'Martin', 'Pierre est surnommé Bucheron. Il travaille dans la construction et vit à Lyon.', datetime('now')),
      ('e2e-juliana-001', 'Juliana', 'Silva', 'Juliana est développeuse et passionnée de voyages.', datetime('now'))
  `);

  // Existing facts for update scenarios
  await db.runAsync(`
    INSERT OR REPLACE INTO facts (id, contact_id, fact_type, fact_key, fact_value, created_at)
    VALUES
      ('e2e-fact-001', 'e2e-brenda-001', 'company', 'Entreprise', 'Startup ABC', datetime('now')),
      ('e2e-fact-002', 'e2e-brenda-001', 'work', 'Métier', 'Marketing Manager', datetime('now')),
      ('e2e-fact-003', 'e2e-bucheron-001', 'location', 'Ville', 'Lyon', datetime('now')),
      ('e2e-fact-004', 'e2e-bucheron-001', 'work', 'Métier', 'Chef de chantier', datetime('now')),
      ('e2e-fact-005', 'e2e-juliana-001', 'work', 'Métier', 'Développeuse', datetime('now'))
  `);

  // Active hot topic for resolution scenario
  await db.runAsync(`
    INSERT OR REPLACE INTO hot_topics (id, contact_id, title, context, status, created_at)
    VALUES
      ('e2e-topic-001', 'e2e-brenda-001', 'Recherche emploi', 'Elle cherche un nouveau poste dans le marketing', 'active', datetime('now')),
      ('e2e-topic-002', 'e2e-bucheron-001', 'Projet maison', 'Il construit une maison pour sa famille', 'active', datetime('now'))
  `);

  console.log('[E2E] Test data seeded successfully');
};
