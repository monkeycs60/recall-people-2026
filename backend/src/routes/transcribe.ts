import { Hono } from 'hono';
import { createClient } from '@deepgram/sdk';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DEEPGRAM_API_KEY: string;
  ANTHROPIC_API_KEY: string;
};

export const transcribeRoutes = new Hono<{ Bindings: Bindings }>();

transcribeRoutes.use('/*', authMiddleware);

transcribeRoutes.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    const deepgram = createClient(c.env.DEEPGRAM_API_KEY);

    const audioBuffer = await audioFile.arrayBuffer();

    const language = (formData.get('language') as string) || 'fr';
    const validLanguages = ['fr', 'en', 'es', 'it', 'de'];
    const transcriptionLanguage = validLanguages.includes(language) ? language : 'fr';

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      {
        model: 'nova-3',
        language: transcriptionLanguage,
        smart_format: true,
        punctuate: true,
      }
    );

    const transcript = result.results.channels[0].alternatives[0].transcript;

    return c.json({
      success: true,
      transcript,
      confidence: result.results.channels[0].alternatives[0].confidence,
      duration: result.metadata.duration,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return c.json({ error: 'Transcription failed' }, 500);
  }
});
