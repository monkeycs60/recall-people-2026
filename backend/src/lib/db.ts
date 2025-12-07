import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

export const createPrismaClient = (databaseUrl: string) => {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaNeon(pool);

  return new PrismaClient({ adapter });
};

let prismaInstance: PrismaClient | null = null;

export const getPrisma = (databaseUrl: string) => {
  if (!prismaInstance) {
    prismaInstance = createPrismaClient(databaseUrl);
  }
  return prismaInstance;
};
