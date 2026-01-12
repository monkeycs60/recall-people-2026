import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { User } from '@prisma/client';

type Bindings = {
  PRO_WHITELIST?: string;
};

type AuthContext = {
  user: User;
};

const parseWhitelist = (whitelist: string | undefined): Set<string> => {
  if (!whitelist?.trim()) {
    return new Set();
  }

  const emails = whitelist
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  return new Set(emails);
};

export const subscriptionRoutes = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

subscriptionRoutes.use('/*', authMiddleware);

subscriptionRoutes.get('/check-whitelist', async (c) => {
  const user = c.get('user');
  const rawWhitelist = c.env.PRO_WHITELIST;
  const whitelist = parseWhitelist(rawWhitelist);

  const userEmail = user.email?.toLowerCase().trim() || '';
  const isWhitelisted = userEmail ? whitelist.has(userEmail) : false;

  return c.json({
    success: true,
    isWhitelisted,
  });
});
