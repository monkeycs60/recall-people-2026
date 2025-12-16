import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth';
import { transcribeRoutes } from './routes/transcribe';
import { extractRoutes } from './routes/extract';
import { similarityRoutes } from './routes/similarity';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
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

app.route('/auth', authRoutes);
app.route('/api/transcribe', transcribeRoutes);
app.route('/api/extract', extractRoutes);
app.route('/api/similarity', similarityRoutes);

export default app;
