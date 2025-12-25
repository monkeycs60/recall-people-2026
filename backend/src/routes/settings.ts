import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getPrisma } from '../lib/db';
import { z } from 'zod';
import type { User } from '@prisma/client';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

type AuthContext = {
  user: User;
};

const updateSettingsSchema = z.object({
  preferredLanguage: z.enum(['fr', 'en', 'es', 'it', 'de']).optional(),
});

export const settingsRoutes = new Hono<{ Bindings: Bindings; Variables: AuthContext }>();

settingsRoutes.use('/*', authMiddleware);

settingsRoutes.get('/', async (c) => {
  const user = c.get('user');

  return c.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredLanguage: user.preferredLanguage,
    },
  });
});

settingsRoutes.patch('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body' }, 400);
    }

    const prisma = getPrisma(c.env.DATABASE_URL);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        preferredLanguage: true,
      },
    });

    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Settings update error:', error);
    return c.json({ error: 'Failed to update settings' }, 500);
  }
});
