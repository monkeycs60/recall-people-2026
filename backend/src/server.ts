// Point d'entrée Node de l'API hébergée sur le VPS via Coolify.
// Les variables d'environnement et services runtime sont injectés dans Hono à
// chaque requête. Les tâches d'observabilité peuvent continuer en arrière-plan.

import { serve } from '@hono/node-server';
import app from './index';
import { InMemoryRateLimitStore } from './lib/in-memory-rate-limit-store';
import { R2ObjectStore } from './lib/r2-object-store';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

// Services runtime injectés à chaque requête.
const env = {
  ...process.env,
  RATE_LIMIT: new InMemoryRateLimitStore(),
  AVATARS_BUCKET: new R2ObjectStore({
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_BUCKET'),
  }),
} as unknown as Parameters<typeof app.fetch>[1];

// Contexte minimal pour laisser les flushs d'observabilité se terminer sans
// retarder la réponse HTTP.
const executionCtx = {
  waitUntil: (promise: Promise<unknown>) => {
    Promise.resolve(promise).catch((err) =>
      console.error('waitUntil error:', err)
    );
  },
  passThroughOnException: () => {},
} as Parameters<typeof app.fetch>[2];

const port = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: (request: Request) => app.fetch(request, env, executionCtx),
    port,
    hostname: '0.0.0.0',
  },
  (info) => {
    console.log(`recall-people-api en écoute sur http://0.0.0.0:${info.port}`);
  }
);
