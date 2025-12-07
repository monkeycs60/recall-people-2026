import { Hono } from 'hono';
import { createAuth } from '../lib/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

export const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.all('/*', async (c) => {
  const auth = createAuth({
    DATABASE_URL: c.env.DATABASE_URL,
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  });

  return auth.handler(c.req.raw);
});
