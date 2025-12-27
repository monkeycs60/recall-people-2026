import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { getPrisma } from '../lib/db';
import type { User } from '@prisma/client';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
};

type Variables = {
  user: User;
};

const logsQuerySchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  success: z.enum(['true', 'false']).optional(),
  limit: z.string().optional().default('100'),
  offset: z.string().optional().default('0'),
});

export const adminRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware pour vérifier que l'utilisateur est admin
const adminOnly = async (c: any, next: any) => {
  const user = c.get('user');

  // Email admin depuis les variables d'environnement
  const adminEmail = c.env.ADMIN_EMAIL || '';
  const isAdmin = adminEmail && user.email === adminEmail;

  // Option 2: Champ isAdmin dans la table User (à ajouter au schema Prisma)
  // const isAdmin = user.isAdmin === true;

  // Option 3: Vérifier dans une table admins séparée
  // const prisma = getPrisma(c.env.DATABASE_URL);
  // const adminRecord = await prisma.admin.findUnique({ where: { userId: user.id } });
  // const isAdmin = !!adminRecord;

  if (!isAdmin) {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
};

adminRoutes.use('/*', authMiddleware, adminOnly);

/**
 * GET /admin/logs
 * Récupère les logs d'audit avec filtres optionnels
 */
adminRoutes.get('/logs', async (c) => {
  try {
    const query = c.req.query();
    const validation = logsQuerySchema.safeParse(query);

    if (!validation.success) {
      return c.json({ error: 'Invalid query parameters', details: validation.error.issues }, 400);
    }

    const { action, userId, success, limit, offset } = validation.data;
    const prisma = getPrisma(c.env.DATABASE_URL);

    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (success !== undefined) where.success = success === 'true';

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.auditLog.count({ where }),
    ]);

    return c.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    return c.json({ error: 'Failed to fetch logs' }, 500);
  }
});

/**
 * GET /admin/stats
 * Statistiques globales de l'application
 */
adminRoutes.get('/stats', async (c) => {
  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Statistiques utilisateurs
    const [
      totalUsers,
      newUsersToday,
      activeUsersToday,
      activeUsersWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          createdAt: { gte: oneDayAgo },
        },
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          userId: { not: null },
          createdAt: { gte: oneWeekAgo },
        },
        _count: true,
      }),
    ]);

    // Statistiques d'activité
    const [
      totalActions,
      actionsToday,
      errorsToday,
      errorRate,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prisma.auditLog.count({
        where: {
          success: false,
          createdAt: { gte: oneDayAgo },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['success'],
        where: { createdAt: { gte: oneDayAgo } },
        _count: true,
      }),
    ]);

    const successCount = errorRate.find(r => r.success === true)?._count || 0;
    const failCount = errorRate.find(r => r.success === false)?._count || 0;
    const totalCount = successCount + failCount;
    const errorRatePercent = totalCount > 0 ? (failCount / totalCount) * 100 : 0;

    // Actions les plus utilisées
    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: oneWeekAgo },
        success: true,
      },
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    });

    return c.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        activeToday: activeUsersToday.length,
        activeThisWeek: activeUsersWeek.length,
      },
      activity: {
        totalActions,
        actionsToday,
        errorsToday,
        errorRatePercent: Math.round(errorRatePercent * 100) / 100,
      },
      topActions: topActions.map(a => ({
        action: a.action,
        count: a._count,
      })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

/**
 * GET /admin/security/suspicious-ips
 * Détecte les IPs suspectes (tentatives de login échouées répétées)
 */
adminRoutes.get('/security/suspicious-ips', async (c) => {
  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Requête SQL brute pour grouper par IP
    const suspiciousIPs = await prisma.$queryRaw<Array<{
      ipAddress: string;
      failed_attempts: bigint;
      last_attempt: Date;
    }>>`
      SELECT
        "ipAddress",
        COUNT(*) as failed_attempts,
        MAX("createdAt") as last_attempt
      FROM audit_logs
      WHERE action = 'login'
        AND success = false
        AND "createdAt" > ${oneHourAgo}
        AND "ipAddress" IS NOT NULL
      GROUP BY "ipAddress"
      HAVING COUNT(*) > 5
      ORDER BY failed_attempts DESC
    `;

    return c.json({
      suspiciousIPs: suspiciousIPs.map(ip => ({
        ipAddress: ip.ipAddress,
        failedAttempts: Number(ip.failed_attempts),
        lastAttempt: ip.last_attempt,
      })),
    });
  } catch (error) {
    console.error('Admin suspicious IPs error:', error);
    return c.json({ error: 'Failed to fetch suspicious IPs' }, 500);
  }
});

/**
 * GET /admin/users/active
 * Liste des utilisateurs les plus actifs
 */
adminRoutes.get('/users/active', async (c) => {
  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const limit = parseInt(c.req.query('limit') || '10');
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers = await prisma.$queryRaw<Array<{
      user_id: string;
      email: string;
      name: string;
      actions_count: bigint;
    }>>`
      SELECT
        u.id as user_id,
        u.email,
        u.name,
        COUNT(*) as actions_count
      FROM audit_logs al
      JOIN users u ON al."userId" = u.id
      WHERE al."createdAt" > ${oneWeekAgo}
      GROUP BY u.id, u.email, u.name
      ORDER BY actions_count DESC
      LIMIT ${limit}
    `;

    return c.json({
      activeUsers: activeUsers.map(user => ({
        userId: user.user_id,
        email: user.email,
        name: user.name,
        actionsCount: Number(user.actions_count),
      })),
    });
  } catch (error) {
    console.error('Admin active users error:', error);
    return c.json({ error: 'Failed to fetch active users' }, 500);
  }
});

/**
 * GET /admin/errors/recent
 * Erreurs récentes avec détails
 */
adminRoutes.get('/errors/recent', async (c) => {
  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const limit = parseInt(c.req.query('limit') || '50');

    const recentErrors = await prisma.auditLog.findMany({
      where: { success: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        action: true,
        resource: true,
        details: true,
        userId: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    return c.json({ errors: recentErrors });
  } catch (error) {
    console.error('Admin recent errors error:', error);
    return c.json({ error: 'Failed to fetch recent errors' }, 500);
  }
});

/**
 * GET /admin/analytics/usage
 * Analytics d'utilisation par feature
 */
adminRoutes.get('/analytics/usage', async (c) => {
  try {
    const prisma = getPrisma(c.env.DATABASE_URL);
    const days = parseInt(c.req.query('days') || '7');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usageByAction = await prisma.auditLog.groupBy({
      by: ['action', 'success'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Organiser les données par action
    const actionStats = usageByAction.reduce((acc, item) => {
      if (!acc[item.action]) {
        acc[item.action] = { success: 0, failed: 0 };
      }
      if (item.success) {
        acc[item.action].success = item._count;
      } else {
        acc[item.action].failed = item._count;
      }
      return acc;
    }, {} as Record<string, { success: number; failed: number }>);

    return c.json({
      period: `Last ${days} days`,
      usage: Object.entries(actionStats).map(([action, stats]) => ({
        action,
        successCount: stats.success,
        failedCount: stats.failed,
        totalCount: stats.success + stats.failed,
        successRate: stats.success + stats.failed > 0
          ? Math.round((stats.success / (stats.success + stats.failed)) * 100)
          : 0,
      })).sort((a, b) => b.totalCount - a.totalCount),
    });
  } catch (error) {
    console.error('Admin usage analytics error:', error);
    return c.json({ error: 'Failed to fetch usage analytics' }, 500);
  }
});
