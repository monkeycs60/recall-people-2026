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

// ============================================
// Constants
// ============================================

const FREE_AVATARS_PER_MONTH = 5;
const FREE_ASK_PER_MONTH = 10;

// ============================================
// Helpers
// ============================================

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

const checkIsPremium = (email: string | undefined, rawWhitelist: string | undefined): boolean => {
  const whitelist = parseWhitelist(rawWhitelist);
  const userEmail = email?.toLowerCase().trim() || '';
  return userEmail ? whitelist.has(userEmail) : false;
};

// ============================================
// Routes
// ============================================

export const subscriptionRoutes = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

subscriptionRoutes.use('/*', authMiddleware);

// ============================================
// Existing endpoints (kept as-is)
// ============================================

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

  return c.json({
    success: true,
    used: notesCount,
    limit: -1,
    remaining: -1,
    canCreate: true,
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

  return c.json({
    success: true,
    used: usage.notesCount,
    remaining: -1,
    canCreate: true,
  });
});

// ============================================
// NEW: Monthly quotas endpoint
// ============================================

// GET /quotas — Returns monthly quota status with auto-reset on month change
subscriptionRoutes.get('/quotas', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);
  const currentMonthKey = getCurrentMonthKey();

  if (isPremium) {
    return c.json({
      success: true,
      avatarUsed: 0,
      avatarLimit: -1,
      askUsed: 0,
      askLimit: -1,
      isPremium: true,
    });
  }

  let userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      avatarMonthlyUsed: true,
      avatarMonthKey: true,
      askMonthlyUsed: true,
      askMonthKey: true,
    },
  });

  if (!userData) {
    return c.json({ success: false, error: 'user_not_found' }, 404);
  }

  // Auto-reset quotas if month has changed
  const needsAvatarReset = userData.avatarMonthKey !== currentMonthKey;
  const needsAskReset = userData.askMonthKey !== currentMonthKey;

  if (needsAvatarReset || needsAskReset) {
    const updateData: { avatarMonthlyUsed?: number; avatarMonthKey?: string; askMonthlyUsed?: number; askMonthKey?: string } = {};
    if (needsAvatarReset) {
      updateData.avatarMonthlyUsed = 0;
      updateData.avatarMonthKey = currentMonthKey;
    }
    if (needsAskReset) {
      updateData.askMonthlyUsed = 0;
      updateData.askMonthKey = currentMonthKey;
    }

    userData = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        avatarMonthlyUsed: true,
        avatarMonthKey: true,
        askMonthlyUsed: true,
        askMonthKey: true,
      },
    });
  }

  return c.json({
    success: true,
    avatarUsed: userData.avatarMonthlyUsed,
    avatarLimit: FREE_AVATARS_PER_MONTH,
    askUsed: userData.askMonthlyUsed,
    askLimit: FREE_ASK_PER_MONTH,
    isPremium: false,
  });
});

// ============================================
// NEW: Use avatar quota
// ============================================

// POST /use-avatar-quota — Decrement avatar monthly quota
subscriptionRoutes.post('/use-avatar-quota', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);
  const currentMonthKey = getCurrentMonthKey();

  if (isPremium) {
    return c.json({ success: true, isPremium: true, remaining: -1 });
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      avatarMonthlyUsed: true,
      avatarMonthKey: true,
    },
  });

  if (!userData) {
    return c.json({ success: false, error: 'user_not_found' }, 404);
  }

  // Auto-reset if month changed
  const needsReset = userData.avatarMonthKey !== currentMonthKey;
  const currentUsed = needsReset ? 0 : userData.avatarMonthlyUsed;

  const limit = FREE_AVATARS_PER_MONTH;

  if (currentUsed >= limit) {
    return c.json(
      {
        success: false,
        error: 'quota_exhausted',
        type: 'avatar',
        used: currentUsed,
        limit,
        remaining: 0,
      },
      403
    );
  }

  const newUsed = currentUsed + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      avatarMonthlyUsed: newUsed,
      avatarMonthKey: currentMonthKey,
    },
  });

  return c.json({
    success: true,
    isPremium: false,
    used: newUsed,
    limit,
    remaining: Math.max(0, limit - newUsed),
  });
});

// ============================================
// NEW: Use ask quota
// ============================================

// POST /use-ask-quota — Decrement ask monthly quota
subscriptionRoutes.post('/use-ask-quota', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);
  const currentMonthKey = getCurrentMonthKey();

  if (isPremium) {
    return c.json({ success: true, isPremium: true, remaining: -1 });
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      askMonthlyUsed: true,
      askMonthKey: true,
    },
  });

  if (!userData) {
    return c.json({ success: false, error: 'user_not_found' }, 404);
  }

  const needsReset = userData.askMonthKey !== currentMonthKey;
  const currentUsed = needsReset ? 0 : userData.askMonthlyUsed;

  if (currentUsed >= FREE_ASK_PER_MONTH) {
    return c.json(
      {
        success: false,
        error: 'quota_exhausted',
        type: 'ask',
        used: currentUsed,
        limit: FREE_ASK_PER_MONTH,
        remaining: 0,
      },
      403
    );
  }

  const newUsed = currentUsed + 1;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      askMonthlyUsed: newUsed,
      askMonthKey: currentMonthKey,
    },
  });

  return c.json({
    success: true,
    isPremium: false,
    used: newUsed,
    limit: FREE_ASK_PER_MONTH,
    remaining: Math.max(0, FREE_ASK_PER_MONTH - newUsed),
  });
});
