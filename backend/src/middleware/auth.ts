import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { getPrisma } from '../lib/db';
import type { User } from '@prisma/client';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};

type Variables = {
  user: User;
};

export const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET);

    const prisma = getPrisma(c.env.DATABASE_URL);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub as string },
    });

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    c.set('user', user);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
};
