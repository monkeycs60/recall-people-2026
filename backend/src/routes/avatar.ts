import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import type { User } from '@prisma/client';

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  AVATARS_BUCKET: R2Bucket;
  AVATARS_PUBLIC_URL?: string;
  ADMIN_EMAIL?: string;
};

type Variables = {
  user: User;
};

type UploadRequest = {
  contactId: string;
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
};

type GenerateRequest = {
  contactId: string;
  prompt: string;
  language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

type AvatarHints = {
  physical: string | null;
  personality: string | null;
  interest: string | null;
  context: string | null;
};

type GenerateFromHintsRequest = {
  contactId: string;
  gender: 'male' | 'female' | 'unknown';
  avatarHints: AvatarHints;
};

const AVATAR_STYLE_PROMPT = `You are an avatar designer for a warm, sophisticated relationship management app.

DESIGN SYSTEM:
- Style: Modern, warm, friendly illustration
- Color palette: Warm terracotta (#C67C4E), soft beige (#E8D5C4), cream backgrounds (#FAF7F2)
- Art style: Semi-realistic illustrated portrait, similar to high-quality profile illustrations
- Mood: Approachable, professional yet warm
- Background: MUST be a single flat uniform color (#FAF7F2 cream or #E8D5C4 beige). NO gradients, NO shadows, NO textures, NO variations - completely monochrome and uniform.
- Composition: Head and shoulders portrait, perfectly centered, optimized for circular cropping. Keep the face centered with enough margin on all sides so nothing important gets cut off when displayed in a round frame.
- Shape: The final image will be displayed as a circle, so ensure the subject is well-centered and the composition works in a circular crop.

IMPORTANT RULES:
1. Create a portrait illustration, NOT a photograph
2. The person should look friendly and approachable
3. Use warm, soft lighting
4. CRITICAL: The background must be perfectly uniform - one single flat color with absolutely no gradient, shadow, or texture. Pure solid color only.
5. Focus on the face with a gentle, natural expression
6. The style should be consistent - like illustrations from a premium lifestyle app

USER'S DESCRIPTION:`;

export const avatarRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Placeholder prompts for default avatars
const PLACEHOLDER_PROMPTS = {
  male: `A friendly young man in his 30s with short brown hair, clean-shaven, warm smile.
Professional yet approachable appearance. Wearing a casual earth-toned shirt.
The portrait should feel welcoming and trustworthy.`,
  female: `A friendly young woman in her 30s with shoulder-length dark hair, warm smile.
Professional yet approachable appearance. Wearing a casual earth-toned top.
The portrait should feel welcoming and trustworthy.`,
  unknown: `A friendly person with a warm, welcoming smile. Gender-neutral appearance.
Short stylish hair, professional yet approachable look. Wearing a casual earth-toned shirt.
The portrait should feel welcoming and trustworthy.`,
};

// This endpoint is placed BEFORE the auth middleware - it's a one-shot admin endpoint
avatarRoutes.post('/generate-placeholders', async (c) => {
  try {
    const adminSecret = c.req.header('X-Admin-Secret');
    if (adminSecret !== 'generate-placeholders-2024') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    if (!c.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return c.json({ error: 'Google AI API key not configured' }, 500);
    }

    const googleAI = createGoogleGenerativeAI({
      apiKey: c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const results: Record<string, string> = {};

    for (const [gender, description] of Object.entries(PLACEHOLDER_PROMPTS)) {
      console.log(`[Placeholder] Starting generation for ${gender}...`);

      const fullPrompt = `${AVATAR_STYLE_PROMPT}
${description}

Generate a single portrait illustration following the design system above. The avatar should be warm, inviting, and professional. This will be used as a default placeholder avatar.`;

      try {
        const result = await generateText({
          model: googleAI('gemini-2.5-flash-image') as Parameters<typeof generateText>[0]['model'],
          prompt: fullPrompt,
          providerOptions: {
            google: {
              responseModalities: ['IMAGE', 'TEXT'],
            },
          },
        });

        console.log(`[Placeholder] Gemini response for ${gender}:`, JSON.stringify({
          text: result.text?.substring(0, 100),
          hasFiles: !!result.files,
          filesLength: (result.files as unknown[])?.length,
          fileKeys: result.files ? Object.keys((result.files as unknown[])[0] || {}) : [],
        }));

        type GeneratedFileWithMime = { base64Data?: string; mimeType?: string; data?: string };
        const imageFile = (result.files as GeneratedFileWithMime[] | undefined)?.[0];

        if (!imageFile) {
          console.error(`[Placeholder] ${gender}: No image file in response`);
          continue;
        }

        // Handle both possible key names
        const base64Data = imageFile.base64Data || imageFile.data;
        const mimeType = imageFile.mimeType || 'image/png';

        console.log(`[Placeholder] ${gender}: base64Data present: ${!!base64Data}, mimeType: ${mimeType}`);

        if (!base64Data) {
          console.error(`[Placeholder] ${gender}: No base64 data found. Keys: ${Object.keys(imageFile).join(', ')}`);
          continue;
        }

        const imageBuffer = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));
        const extension = mimeType.split('/')[1] || 'png';
        const filename = `placeholders/avatar-${gender}.${extension}`;

        console.log(`[Placeholder] Uploading ${filename}, buffer size: ${imageBuffer.length}, mimeType: ${mimeType}`);

        await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000',
          },
        });

        console.log(`[Placeholder] Successfully uploaded ${filename}`);
        results[gender] = filename;
      } catch (genError) {
        console.error(`[Placeholder] Error processing ${gender}:`, genError);
      }
    }

    return c.json({
      success: true,
      placeholders: results,
    });
  } catch (error) {
    console.error('Placeholder generation error:', error);
    return c.json({ error: 'Failed to generate placeholders' }, 500);
  }
});

// Public endpoint for placeholder images (no auth required)
avatarRoutes.get('/placeholders/:filename', async (c) => {
  try {
    const filename = c.req.param('filename');
    if (!filename) {
      return c.json({ error: 'Missing filename' }, 400);
    }

    const key = `placeholders/${filename}`;
    const object = await c.env.AVATARS_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Placeholder not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Placeholder fetch error:', error);
    return c.json({ error: 'Failed to fetch placeholder' }, 500);
  }
});

// Public endpoint for user avatars (no auth required for viewing)
// Format: /api/avatar/:contactId/:filename
avatarRoutes.get('/:contactId/:filename', async (c) => {
  try {
    const contactId = c.req.param('contactId');
    const filename = c.req.param('filename');

    if (!contactId || !filename) {
      return c.json({ error: 'Missing parameters' }, 400);
    }

    const key = `${contactId}/${filename}`;
    const object = await c.env.AVATARS_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Avatar not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Avatar fetch error:', error);
    return c.json({ error: 'Failed to fetch avatar' }, 500);
  }
});

// Auth middleware for all other routes
avatarRoutes.use('/*', authMiddleware);

avatarRoutes.post('/upload', async (c) => {
  try {
    const body = await c.req.json<UploadRequest>();
    const { contactId, imageBase64, mimeType } = body;

    if (!contactId || !imageBase64 || !mimeType) {
      return c.json({ error: 'Missing required fields: contactId, imageBase64, mimeType' }, 400);
    }

    const validMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validMimeTypes.includes(mimeType)) {
      return c.json({ error: 'Invalid mime type. Allowed: image/png, image/jpeg, image/webp' }, 400);
    }

    const imageBuffer = Uint8Array.from(atob(imageBase64), (char) => char.charCodeAt(0));

    const maxSize = 5 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      return c.json({ error: 'Image too large. Maximum size is 5MB' }, 400);
    }

    const extension = mimeType.split('/')[1];
    const filename = `${contactId}/avatar-${Date.now()}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Build avatar URL using the API endpoint that serves from R2
    const requestUrl = new URL(c.req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const avatarUrl = `${baseUrl}/api/avatar/${filename}`;

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

avatarRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json<GenerateRequest>();
    const { contactId, prompt, language = 'fr' } = body;

    if (!contactId || !prompt) {
      return c.json({ error: 'Missing required fields: contactId, prompt' }, 400);
    }

    if (prompt.length > 500) {
      return c.json({ error: 'Prompt too long. Maximum 500 characters' }, 400);
    }

    if (!c.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return c.json({ error: 'Google AI API key not configured' }, 500);
    }

    const fullPrompt = `${AVATAR_STYLE_PROMPT}
${prompt}

Generate a single portrait illustration following the design system above. The avatar should be warm, inviting, and professional.`;

    const googleAI = createGoogleGenerativeAI({
      apiKey: c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const result = await generateText({
      model: googleAI('gemini-2.5-flash-image') as Parameters<typeof generateText>[0]['model'],
      prompt: fullPrompt,
      providerOptions: {
        google: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      },
    });

    type GeneratedFileWithMime = { base64Data?: string; mimeType?: string; data?: string };
    const imageFile = (result.files as GeneratedFileWithMime[] | undefined)?.[0];

    if (!imageFile) {
      console.error('Avatar generation: No image file in response');
      return c.json({ error: 'Failed to generate avatar image' }, 500);
    }

    // Handle both possible key names from Gemini API
    const base64Data = imageFile.base64Data || imageFile.data;
    const mimeType = imageFile.mimeType || 'image/png';

    if (!base64Data) {
      console.error('Avatar generation: No base64 data. Keys:', Object.keys(imageFile));
      return c.json({ error: 'Failed to generate avatar image' }, 500);
    }

    const imageBuffer = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `${contactId}/avatar-generated-${Date.now()}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Build avatar URL using the API endpoint that serves from R2
    const requestUrl = new URL(c.req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const avatarUrl = `${baseUrl}/api/avatar/${filename}`;

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('Avatar generation error:', error);
    return c.json({ error: 'Failed to generate avatar' }, 500);
  }
});

// Helper function to build avatar prompt from hints
function buildPromptFromHints(gender: 'male' | 'female' | 'unknown', hints: AvatarHints): string {
  const parts: string[] = [];

  // Base gender term
  const genderTerm = gender === 'male' ? 'man' : gender === 'female' ? 'woman' : 'person';
  parts.push(`A friendly ${genderTerm} in their 30s`);

  // Physical description (highest priority)
  if (hints.physical) {
    parts.push(hints.physical);
  }

  // Personality → facial expression
  if (hints.personality) {
    parts.push(`with a ${hints.personality} expression`);
  }

  // Interest → subtle lifestyle hint
  if (hints.interest) {
    parts.push(`subtle hint of ${hints.interest} lifestyle in their appearance`);
  }

  // Context → clothing style
  if (hints.context) {
    parts.push(`dressed in ${hints.context}-appropriate casual style`);
  }

  // Always end with warm, approachable
  parts.push('warm smile, approachable and friendly');

  return parts.join(', ') + '.';
}

// Generate avatar from transcript hints (auto-generation)
avatarRoutes.post('/generate-from-hints', async (c) => {
  try {
    const body = await c.req.json<GenerateFromHintsRequest>();
    const { contactId, gender, avatarHints } = body;

    if (!contactId || !gender) {
      return c.json({ error: 'Missing required fields: contactId, gender' }, 400);
    }

    if (!c.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return c.json({ error: 'Google AI API key not configured' }, 500);
    }

    // Build prompt from hints
    const description = buildPromptFromHints(gender, avatarHints || {
      physical: null,
      personality: null,
      interest: null,
      context: null,
    });

    console.log(`[Avatar Auto] Generating for ${contactId} with prompt: ${description}`);

    const fullPrompt = `${AVATAR_STYLE_PROMPT}
${description}

Generate a single portrait illustration following the design system above. The avatar should be warm, inviting, and professional.`;

    const googleAI = createGoogleGenerativeAI({
      apiKey: c.env.GOOGLE_GENERATIVE_AI_API_KEY,
    });

    const result = await generateText({
      model: googleAI('gemini-2.5-flash-image') as Parameters<typeof generateText>[0]['model'],
      prompt: fullPrompt,
      providerOptions: {
        google: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      },
    });

    type GeneratedFileWithMime = { base64Data?: string; mimeType?: string; data?: string };
    const imageFile = (result.files as GeneratedFileWithMime[] | undefined)?.[0];

    if (!imageFile) {
      console.error('[Avatar Auto] No image file in response');
      return c.json({ error: 'Failed to generate avatar image' }, 500);
    }

    const base64Data = imageFile.base64Data || imageFile.data;
    const mimeType = imageFile.mimeType || 'image/png';

    if (!base64Data) {
      console.error('[Avatar Auto] No base64 data. Keys:', Object.keys(imageFile));
      return c.json({ error: 'Failed to generate avatar image' }, 500);
    }

    const imageBuffer = Uint8Array.from(atob(base64Data), (char) => char.charCodeAt(0));
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `${contactId}/avatar-auto-${Date.now()}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const requestUrl = new URL(c.req.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const avatarUrl = `${baseUrl}/api/avatar/${filename}`;

    console.log(`[Avatar Auto] Successfully generated for ${contactId}: ${avatarUrl}`);

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('[Avatar Auto] Generation error:', error);
    return c.json({ error: 'Failed to generate avatar' }, 500);
  }
});

avatarRoutes.delete('/:contactId', async (c) => {
  try {
    const contactId = c.req.param('contactId');

    if (!contactId) {
      return c.json({ error: 'Missing contactId' }, 400);
    }

    const objects = await c.env.AVATARS_BUCKET.list({ prefix: `${contactId}/` });

    for (const object of objects.objects) {
      await c.env.AVATARS_BUCKET.delete(object.key);
    }

    return c.json({
      success: true,
      deletedCount: objects.objects.length,
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return c.json({ error: 'Failed to delete avatars' }, 500);
  }
});
