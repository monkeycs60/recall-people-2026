import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Postgres standard (driver `pg`) — l'API tourne sur un vrai runtime Node et la
// base est désormais le Postgres Coolify (VPS). Avant, on utilisait le driver
// Neon serverless (WebSocket) parce que la base était sur Neon.
export const getPrisma = (databaseUrl: string) => {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};
