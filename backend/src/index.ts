import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { transcribeRoutes } from './routes/transcribe';
import { extractRoutes } from './routes/extract';
import { similarityRoutes } from './routes/similarity';
import { iceBreakersRoutes } from './routes/ice-breakers';
import { searchRoutes } from './routes/search';
import { settingsRoutes } from './routes/settings';
import { adminRoutes } from './routes/admin';
import { detectContactRoutes } from './routes/detect-contact';
import { rateLimiters } from './middleware/rateLimit';
import { securityHeaders } from './middleware/securityHeaders';
import { httpsEnforcement } from './middleware/httpsEnforcement';
import { langfuseMiddleware } from './middleware/langfuse';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  DEEPGRAM_API_KEY: string;
  XAI_API_KEY: string;
  RATE_LIMIT: KVNamespace;
  LANGFUSE_SECRET_KEY?: string;
  LANGFUSE_PUBLIC_KEY?: string;
  LANGFUSE_BASE_URL?: string;
  ENABLE_LANGFUSE?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Security middleware (first)
app.use('*', httpsEnforcement);
app.use('*', securityHeaders);

// Logger
app.use('*', logger());

// LangFuse observability (before routes)
app.use('*', langfuseMiddleware);

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

app.route('/auth', authRoutes);
app.route('/api/transcribe', transcribeRoutes);
app.route('/api/extract', extractRoutes);
app.route('/api/similarity', similarityRoutes);
app.route('/api/ice-breakers', iceBreakersRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/detect-contact', detectContactRoutes);
app.route('/admin', adminRoutes);

export default app;
