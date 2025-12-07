import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { expo } from '@better-auth/expo';
import { getPrisma } from './db';

type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export const createAuth = (env: AuthEnv) => {
  const prisma = getPrisma(env.DATABASE_URL);

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [expo()],
    trustedOrigins: [
      'recall-people://',
      'recall-people://*',
      // Development mode - Expo exp:// scheme
      'exp://*/*',
      'exp://10.0.0.*:*/*',
      'exp://192.168.*.*:*/*',
      'exp://172.*.*.*:*/*',
      'exp://localhost:*/*',
    ],
  });
};
