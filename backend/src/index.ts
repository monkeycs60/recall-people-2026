import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { passwordResetRoutes } from './routes/password-reset';
import { transcribeRoutes } from './routes/transcribe';
import { extractRoutes } from './routes/extract';
import { extractionFeedbackRoutes } from './routes/extraction-feedback';
import { similarityRoutes } from './routes/similarity';
import { suggestedQuestionsRoutes } from './routes/suggested-questions';
import { searchRoutes } from './routes/search';
import { settingsRoutes } from './routes/settings';
import { adminRoutes } from './routes/admin';
import { detectContactRoutes } from './routes/detect-contact';
import { summaryRoutes } from './routes/summary';
import { avatarRoutes } from './routes/avatar';
import { subscriptionRoutes } from './routes/subscription';
import { seedRoutes } from './routes/seed';
import { askRoutes } from './routes/ask';
import { syncRoutes } from './routes/sync';
import { rateLimiters } from './middleware/rateLimit';
import { securityHeaders } from './middleware/securityHeaders';
import { httpsEnforcement } from './middleware/httpsEnforcement';
import { posthogMiddleware } from './middleware/posthog';
import {
  captureServerException,
  isPostHogEnabled,
  flushPostHog,
} from './lib/posthog';
import type { AvatarObjectStore, RateLimitStore } from './types/runtime';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  XAI_API_KEY: string;
  CEREBRAS_API_KEY?: string;
  AI_PROVIDER?: string;
  RATE_LIMIT: RateLimitStore;
  AVATARS_BUCKET: AvatarObjectStore;
  OPENAI_API_KEY?: string;
  AVATARS_PUBLIC_URL?: string;
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;
  PRO_WHITELIST?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Security middleware (first)
app.use('*', httpsEnforcement);
app.use('*', securityHeaders);

// Logger
app.use('*', logger());

// PostHog observability + error tracking (before routes)
app.use('*', posthogMiddleware);

// CORS
app.use(
  '*',
  cors({
    origin: [
      'recall-people://',
      'http://localhost:8081',
      'http://192.168.1.12:8081',
      'http://172.17.14.198:8081',
    ],
    credentials: true,
  })
);

app.get('/', (c) =>
  c.json({ status: 'ok', service: 'recall-people-api', version: '1.0.0' })
);

// Rate limiting for API routes (applied after auth middleware in each route)
app.use('/api/*', rateLimiters.api);

// AI-heavy routes get additional stricter limits
app.use('/api/extract/*', rateLimiters.aiExtract);
app.use('/api/search/*', rateLimiters.aiExtract);
app.use('/api/ask/*', rateLimiters.aiExtract);

app.route('/auth', authRoutes);
app.route('/auth', passwordResetRoutes);
app.route('/api/transcribe', transcribeRoutes);
app.route('/api/extract', extractRoutes);
app.route('/api/extraction-feedback', extractionFeedbackRoutes);
app.route('/api/similarity', similarityRoutes);
app.route('/api/suggested-questions', suggestedQuestionsRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/detect-contact', detectContactRoutes);
app.route('/api/summary', summaryRoutes);
app.route('/api/avatar', avatarRoutes);
app.route('/api/subscription', subscriptionRoutes);
app.route('/api/seed', seedRoutes);
app.route('/api/ask', askRoutes);
app.route('/api/sync', syncRoutes);
app.route('/admin', adminRoutes);

// Global error handler — capture unhandled server exceptions to PostHog
// (error tracking) before returning a generic 500. Best-effort: the capture
// never throws and never changes the response shape.
app.onError((err, c) => {
  // The base app has no typed `user` variable, but auth middleware sets one on
  // protected routes — read it defensively for attribution.
  const user = (c.get as (key: string) => unknown)('user') as
    | { id?: string }
    | undefined;
  captureServerException(err, user?.id, {
    route: c.req.path,
    method: c.req.method,
    handled: 'onError',
  });
  if (isPostHogEnabled() && c.executionCtx) {
    c.executionCtx.waitUntil(flushPostHog());
  }

  console.error('[onError]', c.req.method, c.req.path, err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
