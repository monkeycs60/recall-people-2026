import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '@deepgram/sdk';
import { authMiddleware } from '../middleware/auth';
import { auditLog } from '../lib/audit';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};

const languageSchema = z.enum(['fr', 'en', 'es', 'it', 'de']);

export const transcribeRoutes = new Hono<{ Bindings: Bindings }>();

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

    const deepgram = createClient(c.env.DEEPGRAM_API_KEY);

    // audioFile is Blob (File extends Blob in Workers)
    const audioBuffer = await (audioFile as Blob).arrayBuffer();

    // Validate language parameter
    const languageParam = formData.get('language');
    const languageValidation = languageSchema.safeParse(languageParam || 'fr');
    const transcriptionLanguage = languageValidation.success ? languageValidation.data : 'fr';

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      {
        model: 'nova-3',
        language: transcriptionLanguage,
        smart_format: true,
        punctuate: true,
      }
    );

    if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
      await auditLog(c, {
        userId: c.get('user')?.id,
        action: 'transcribe',
        resource: 'transcribe',
        success: false,
        details: { error: 'No transcription result' },
      });
      return c.json({ error: 'Transcription failed - no result' }, 500);
    }

    const transcript = result.results.channels[0].alternatives[0].transcript;
    const confidence = result.results.channels[0].alternatives[0].confidence;

    await auditLog(c, {
      userId: c.get('user')?.id,
      action: 'transcribe',
      resource: 'transcribe',
      success: true,
      details: { language: transcriptionLanguage, confidence, duration: result.metadata?.duration },
    });

    return c.json({
      success: true,
      transcript,
      confidence,
      duration: result.metadata?.duration,
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
