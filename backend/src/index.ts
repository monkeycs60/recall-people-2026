import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { transcribeRoutes } from './routes/transcribe';
import { extractRoutes } from './routes/extract';
import { similarityRoutes } from './routes/similarity';
import { summaryRoutes } from './routes/summary';
import { iceBreakersRoutes } from './routes/ice-breakers';
import { searchRoutes } from './routes/search';
import { settingsRoutes } from './routes/settings';
import { rateLimiters } from './middleware/rateLimit';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  DEEPGRAM_API_KEY: string;
  XAI_API_KEY: string;
  RATE_LIMIT: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', logger());
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
app.use('/api/summary/*', rateLimiters.aiExtract);
app.use('/api/search/*', rateLimiters.aiExtract);

app.route('/auth', authRoutes);
app.route('/api/transcribe', transcribeRoutes);
app.route('/api/extract', extractRoutes);
app.route('/api/similarity', similarityRoutes);
app.route('/api/summary', summaryRoutes);
app.route('/api/ice-breakers', iceBreakersRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/settings', settingsRoutes);

export default app;
