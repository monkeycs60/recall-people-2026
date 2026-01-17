import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { auditLog } from '../lib/audit';
import { transcribeAudio, getSTTProviderName, getSTTModelName } from '../lib/speech-to-text-provider';
import { measurePerformance } from '../lib/performance-logger';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  GROQ_API_KEY?: string;
  STT_PROVIDER?: 'deepgram' | 'groq-whisper-v3' | 'groq-whisper-v3-turbo';
  ENABLE_PERFORMANCE_LOGGING?: boolean;
  ANTHROPIC_API_KEY: string;
};

const languageSchema = z.enum(['fr', 'en', 'es', 'it', 'de']);

type Variables = {
  user: import('@prisma/client').User;
};

export const transcribeRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

transcribeRoutes.use('/*', authMiddleware);

transcribeRoutes.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || typeof audioFile === 'string') {
      await auditLog(c, {
        userId: c.get('user')?.id,
        action: 'transcribe',
        resource: 'transcribe',
        success: false,
        details: { error: 'No audio file provided' },
      });
      return c.json({ error: 'No audio file provided' }, 400);
    }

    // audioFile is Blob (File extends Blob in Workers)
    const audioBuffer = await (audioFile as Blob).arrayBuffer();

    // Validate language parameter
    const languageParam = formData.get('language');
    const languageValidation = languageSchema.safeParse(languageParam || 'fr');
    const transcriptionLanguage = languageValidation.success ? languageValidation.data : 'fr';

    // Provider config
    const providerConfig = {
      DEEPGRAM_API_KEY: c.env.DEEPGRAM_API_KEY,
      GROQ_API_KEY: c.env.GROQ_API_KEY,
      STT_PROVIDER: c.env.STT_PROVIDER,
      ENABLE_PERFORMANCE_LOGGING: c.env.ENABLE_PERFORMANCE_LOGGING,
    };

    // Use the speech-to-text provider wrapper with performance logging
    const result = await measurePerformance(
      () => transcribeAudio(providerConfig, audioBuffer, transcriptionLanguage),
      {
        route: '/transcribe',
        provider: getSTTProviderName(providerConfig),
        model: getSTTModelName(providerConfig),
        operationType: 'speech-to-text',
        inputSize: audioBuffer.byteLength,
        metadata: { language: transcriptionLanguage },
        enabled: String(c.env.ENABLE_PERFORMANCE_LOGGING) === 'true',
      }
    );

    const { transcript, confidence, duration } = result;

    await auditLog(c, {
      userId: c.get('user')?.id,
      action: 'transcribe',
      resource: 'transcribe',
      success: true,
      details: { language: transcriptionLanguage, confidence, duration },
    });

    return c.json({
      success: true,
      transcript,
      confidence,
      duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    await auditLog(c, {
      userId: c.get('user')?.id,
      action: 'transcribe',
      resource: 'transcribe',
      success: false,
      details: { error: String(error) },
    });
    return c.json({ error: 'Transcription failed' }, 500);
  }
});
