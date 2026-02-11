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

const FREE_NOTES_PER_MONTH = 10;
const TRIAL_DURATION_DAYS = 14;
const FREE_AVATARS_PER_MONTH = 5;
const FREE_ASK_PER_MONTH = 10;
const TRIAL_AVATARS_LIMIT = 20;

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

const isTrialActive = (trialEndDate: Date | null): boolean => {
  if (!trialEndDate) return false;
  return new Date() < trialEndDate;
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

// ============================================
// NEW: Trial status endpoint
// ============================================

// GET /trial-status — Returns trial state; starts trial on first call if trialStartDate is null
subscriptionRoutes.get('/trial-status', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);

  if (isPremium) {
    return c.json({
      success: true,
      isInTrial: false,
      trialStartDate: null,
      trialEndDate: null,
      daysRemaining: 0,
      isPremium: true,
    });
  }

  let userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { trialStartDate: true, trialEndDate: true },
  });

  // Auto-start trial on first call if trialStartDate is null
  if (!userData?.trialStartDate) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);

    userData = await prisma.user.update({
      where: { id: user.id },
      data: {
        trialStartDate: now,
        trialEndDate: endDate,
      },
      select: { trialStartDate: true, trialEndDate: true },
    });
  }

  const trialEndDate = userData.trialEndDate;
  const now = new Date();
  const inTrial = trialEndDate ? now < trialEndDate : false;

  let daysRemaining = 0;
  if (trialEndDate && inTrial) {
    const diffMs = trialEndDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return c.json({
    success: true,
    isInTrial: inTrial,
    trialStartDate: userData.trialStartDate?.toISOString() ?? null,
    trialEndDate: trialEndDate?.toISOString() ?? null,
    daysRemaining,
    isPremium: false,
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
      trialStartDate: true,
      trialEndDate: true,
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
        trialStartDate: true,
        trialEndDate: true,
        avatarMonthlyUsed: true,
        avatarMonthKey: true,
        askMonthlyUsed: true,
        askMonthKey: true,
      },
    });
  }

  const inTrial = isTrialActive(userData.trialEndDate);

  // During trial: avatar limit = TRIAL_AVATARS_LIMIT (20), ask = unlimited (-1)
  // After trial: avatar limit = FREE_AVATARS_PER_MONTH (5), ask = FREE_ASK_PER_MONTH (10)
  const avatarLimit = inTrial ? TRIAL_AVATARS_LIMIT : FREE_AVATARS_PER_MONTH;
  const askLimit = inTrial ? -1 : FREE_ASK_PER_MONTH;

  return c.json({
    success: true,
    avatarUsed: userData.avatarMonthlyUsed,
    avatarLimit,
    askUsed: userData.askMonthlyUsed,
    askLimit,
    isPremium: false,
    isInTrial: inTrial,
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
      trialEndDate: true,
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

  const inTrial = isTrialActive(userData.trialEndDate);
  const limit = inTrial ? TRIAL_AVATARS_LIMIT : FREE_AVATARS_PER_MONTH;

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

// POST /use-ask-quota — Decrement ask monthly quota; unlimited during trial
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
      trialEndDate: true,
      askMonthlyUsed: true,
      askMonthKey: true,
    },
  });

  if (!userData) {
    return c.json({ success: false, error: 'user_not_found' }, 404);
  }

  const inTrial = isTrialActive(userData.trialEndDate);

  // During trial, ask is unlimited — still track usage but don't block
  if (inTrial) {
    const needsReset = userData.askMonthKey !== currentMonthKey;
    const currentUsed = needsReset ? 0 : userData.askMonthlyUsed;
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
      limit: -1,
      remaining: -1,
    });
  }

  // After trial: enforce monthly limit
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

// ============================================
// DEPRECATED: Legacy trial endpoints (kept for backward compatibility)
// ============================================

// @deprecated — Use GET /trial-status and GET /quotas instead
subscriptionRoutes.get('/trials', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { freeNoteTrials: true, freeAskTrials: true, freeAvatarTrials: true },
  });

  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);

  return c.json({
    success: true,
    freeNoteTrials: userData?.freeNoteTrials ?? 10,
    freeAskTrials: userData?.freeAskTrials ?? 10,
    freeAvatarTrials: userData?.freeAvatarTrials ?? 5,
    isPremium,
  });
});

// @deprecated — Use POST /use-ask-quota instead
subscriptionRoutes.post('/use-note-trial', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);

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

// @deprecated — Use POST /use-ask-quota instead
subscriptionRoutes.post('/use-ask-trial', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);

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

// @deprecated — Use POST /use-avatar-quota instead
subscriptionRoutes.post('/use-avatar-trial', async (c) => {
  const user = c.get('user');
  const prisma = getPrisma(c.env.DATABASE_URL);
  const isPremium = checkIsPremium(user.email, c.env.PRO_WHITELIST);

  if (isPremium) {
    return c.json({ success: true, isPremium: true, remaining: -1 });
  }

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: { freeAvatarTrials: true },
  });

  const currentTrials = userData?.freeAvatarTrials ?? 5;

  if (currentTrials <= 0) {
    return c.json(
      { success: false, error: 'no_trials_left', type: 'avatar', remaining: 0 },
      403
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { freeAvatarTrials: { decrement: 1 } },
    select: { freeAvatarTrials: true },
  });

  return c.json({
    success: true,
    isPremium: false,
    remaining: updated.freeAvatarTrials,
  });
});
