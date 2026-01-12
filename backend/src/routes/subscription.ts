import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getPrisma } from '../lib/db';
import type { User } from '@prisma/client';

type Bindings = {
  PRO_WHITELIST?: string;
  DATABASE_URL: string;
};

type AuthContext = {
  user: User;
};

const FREE_NOTES_PER_MONTH = 10;

const getCurrentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

// Get notes usage status for the current month
subscriptionRoutes.get('/notes-status', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const monthKey = getCurrentMonthKey();

  const usage = await prisma.userNotesUsage.findUnique({
    where: {
      userId_monthKey: {
        userId: user.id,
        monthKey,
      },
    },
  });

  const notesCount = usage?.notesCount ?? 0;
  const canCreate = notesCount < FREE_NOTES_PER_MONTH;

  return c.json({
    success: true,
    used: notesCount,
    limit: FREE_NOTES_PER_MONTH,
    remaining: Math.max(0, FREE_NOTES_PER_MONTH - notesCount),
    canCreate,
    monthKey,
  });
});

// Increment notes count after a note is successfully created
subscriptionRoutes.post('/increment-note', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const monthKey = getCurrentMonthKey();

  const usage = await prisma.userNotesUsage.upsert({
    where: {
      userId_monthKey: {
        userId: user.id,
        monthKey,
      },
    },
    update: {
      notesCount: { increment: 1 },
    },
    create: {
      userId: user.id,
      monthKey,
      notesCount: 1,
    },
  });

  const remaining = Math.max(0, FREE_NOTES_PER_MONTH - usage.notesCount);

  return c.json({
    success: true,
    used: usage.notesCount,
    remaining,
    canCreate: usage.notesCount < FREE_NOTES_PER_MONTH,
  });
});
