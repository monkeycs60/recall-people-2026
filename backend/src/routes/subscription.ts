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

// Get free trials status (for non-Premium users)
subscriptionRoutes.get('/trials', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { freeNoteTrials: true, freeAskTrials: true },
  });

  const rawWhitelist = c.env.PRO_WHITELIST;
  const whitelist = parseWhitelist(rawWhitelist);
  const userEmail = user.email?.toLowerCase().trim() || '';
  const isPremium = userEmail ? whitelist.has(userEmail) : false;

  return c.json({
    success: true,
    freeNoteTrials: userData?.freeNoteTrials ?? 10,
    freeAskTrials: userData?.freeAskTrials ?? 10,
    isPremium,
  });
});

// Check and decrement note trial (for non-Premium users)
subscriptionRoutes.post('/use-note-trial', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const rawWhitelist = c.env.PRO_WHITELIST;
  const whitelist = parseWhitelist(rawWhitelist);
  const userEmail = user.email?.toLowerCase().trim() || '';
  const isPremium = userEmail ? whitelist.has(userEmail) : false;

  if (isPremium) {
    return c.json({ success: true, isPremium: true, remaining: -1 });
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { freeNoteTrials: true },
  });

  const currentTrials = userData?.freeNoteTrials ?? 10;

  if (currentTrials <= 0) {
    return c.json(
      { success: false, error: 'no_trials_left', type: 'notes', remaining: 0 },
      403
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { freeNoteTrials: { decrement: 1 } },
    select: { freeNoteTrials: true },
  });

  return c.json({
    success: true,
    isPremium: false,
    remaining: updated.freeNoteTrials,
  });
});

// Check and decrement ask trial (for non-Premium users)
subscriptionRoutes.post('/use-ask-trial', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const rawWhitelist = c.env.PRO_WHITELIST;
  const whitelist = parseWhitelist(rawWhitelist);
  const userEmail = user.email?.toLowerCase().trim() || '';
  const isPremium = userEmail ? whitelist.has(userEmail) : false;

  if (isPremium) {
    return c.json({ success: true, isPremium: true, remaining: -1 });
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { freeAskTrials: true },
  });

  const currentTrials = userData?.freeAskTrials ?? 10;

  if (currentTrials <= 0) {
    return c.json(
      { success: false, error: 'no_trials_left', type: 'ask', remaining: 0 },
      403
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { freeAskTrials: { decrement: 1 } },
    select: { freeAskTrials: true },
  });

  return c.json({
    success: true,
    isPremium: false,
    remaining: updated.freeAskTrials,
  });
});
