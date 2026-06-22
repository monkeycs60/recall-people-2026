// Point d'entrée Node (remplace le handler Workers `export default app`).
// On reconstruit l'objet `env` style Workers (process.env + shims KV/R2) et on
// l'injecte via app.fetch(request, env, executionCtx) : TOUT le code des routes
// (c.env.*, c.executionCtx.waitUntil) continue de marcher sans modification.

import { serve } from '@hono/node-server';
import app from './index';
import { InMemoryKV } from './lib/kv-shim';
import { R2OnS3 } from './lib/r2-shim';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
}

// Bindings injectés à chaque requête (équivalent des bindings Workers).
const env = {
  ...process.env,
  RATE_LIMIT: new InMemoryKV(),
  AVATARS_BUCKET: new R2OnS3({
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_BUCKET'),
  }),
} as unknown as Parameters<typeof app.fetch>[1];

// ExecutionContext minimal. waitUntil laisse tourner les tâches de fond
// (flush LangFuse, side-tasks IA) sans bloquer la réponse — sinon c.executionCtx
// throw sur Node et casserait search/summary/detect-contact/langfuse.
const executionCtx = {
  waitUntil: (promise: Promise<unknown>) => {
    Promise.resolve(promise).catch((err) =>
      console.error('waitUntil error:', err)
    );
  },
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

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
