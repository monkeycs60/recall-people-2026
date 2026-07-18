import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { User } from '@prisma/client';
import {
  buildAvatarGenerationPrompt,
  generateAvatarImage,
  OPENAI_IMAGE_MODEL,
  AVATAR_IMAGE_SIZE,
  AVATAR_IMAGE_QUALITY,
} from '../lib/avatar-image';
import { captureAiGeneration, captureServerException } from '../lib/posthog';
import { imageCostUsd } from '../lib/ai-pricing';
import { resolvePublicBaseUrl } from '../lib/public-url';
import type { AvatarObjectStore } from '../types/runtime';

/**
 * Run an avatar image generation while emitting a $ai_generation event to
 * PostHog (avatar generation is an OpenAI image-gen call made via raw fetch,
 * outside the Vercel AI SDK, so it is captured manually). Best-effort: tracing
 * never changes the generation behavior; on failure we capture and re-throw.
 */
async function generateAvatarImageTraced(
  args: Parameters<typeof generateAvatarImage>[0] & {
    distinctId?: string;
    surface: string;
  }
): Promise<Awaited<ReturnType<typeof generateAvatarImage>>> {
  const { distinctId, surface, ...genArgs } = args;
  const start = Date.now();
  try {
    const result = await generateAvatarImage(genArgs);
    captureAiGeneration({
      distinctId,
      model: OPENAI_IMAGE_MODEL,
      provider: 'openai',
      spanName: 'avatar-image',
      latencySeconds: (Date.now() - start) / 1000,
      costUsd: imageCostUsd(OPENAI_IMAGE_MODEL, AVATAR_IMAGE_SIZE, AVATAR_IMAGE_QUALITY),
      output: { bytes: result.imageBuffer.length, mimeType: result.mimeType },
      extra: { feature: 'avatar-generation', surface },
    });
    return result;
  } catch (error) {
    captureAiGeneration({
      distinctId,
      model: OPENAI_IMAGE_MODEL,
      provider: 'openai',
      spanName: 'avatar-image',
      latencySeconds: (Date.now() - start) / 1000,
      isError: true,
      error,
      extra: { feature: 'avatar-generation', surface },
    });
    throw error;
  }
}

type Bindings = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  OPENAI_API_KEY: string;
  AVATARS_BUCKET: AvatarObjectStore;
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

export const avatarRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Placeholder prompts for default avatars (Happy Humans style)
const PLACEHOLDER_PROMPTS = {
  male: `Simple cartoon portrait of a happy young man with short dark brown hair, small friendly eyes, and a BIG warm genuine smile.
Light blue collared shirt visible at shoulders.
Solid soft pink pastel background (#FFD6E0) filling entire image edge to edge.
Flat colors only, NO gradients. Black outlines on character only.
Square 1:1 format. Minimalist illustration style like Notion avatars. Warm and approachable.`,
  female: `Simple cartoon portrait of a happy young woman with medium-length wavy brown hair, small friendly eyes, and a BIG warm genuine smile.
Terracotta turtleneck (#C67C4E) visible at shoulders.
Solid soft peach pastel background (#FFECD2) filling entire image edge to edge.
Flat colors only, NO gradients. Black outlines on character only.
Square 1:1 format. Minimalist illustration style like Notion avatars. Warm and approachable.`,
  unknown: `Simple cartoon portrait of a happy gender-neutral person with short tousled auburn hair, small friendly eyes, and a BIG warm genuine smile.
Mint green crew neck sweater (#98D8C8) visible at shoulders.
Solid soft lavender pastel background (#E8D5F0) filling entire image edge to edge.
Flat colors only, NO gradients. Black outlines on character only.
Square 1:1 format. Minimalist illustration style like Notion avatars. Warm and approachable.`,
};

// This endpoint is placed BEFORE the auth middleware - it's a one-shot admin endpoint
avatarRoutes.post('/generate-placeholders', async (c) => {
  try {
    const adminSecret = c.req.header('X-Admin-Secret');
    if (adminSecret !== 'generate-placeholders-2024') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const results: Record<string, string> = {};

    for (const [gender, description] of Object.entries(PLACEHOLDER_PROMPTS)) {
      console.log(`[Placeholder] Starting generation for ${gender}...`);

      const fullPrompt = `${buildAvatarGenerationPrompt(description)} This will be used as a default placeholder avatar.`;

      try {
        const {
          imageBuffer,
          mimeType,
          extension,
        } = await generateAvatarImageTraced({
          apiKey: c.env.OPENAI_API_KEY,
          prompt: fullPrompt,
          surface: 'placeholder',
        });

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
// Format: /api/avatar/users/:userId/:filename
avatarRoutes.get('/users/:userId/:filename', async (c) => {
  try {
    const userId = c.req.param('userId');
    const filename = c.req.param('filename');

    if (!userId || !filename) {
      return c.json({ error: 'Missing parameters' }, 400);
    }

    const key = `users/${userId}/${filename}`;
    const object = await c.env.AVATARS_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'Avatar not found' }, 404);
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/png');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('User avatar fetch error:', error);
    return c.json({ error: 'Failed to fetch avatar' }, 500);
  }
});

// Public endpoint for contact avatars (no auth required for viewing)
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
    const baseUrl = resolvePublicBaseUrl({
      requestUrl: c.req.url,
      forwardedProto: c.req.header('X-Forwarded-Proto'),
      configuredBaseUrl: c.env.AVATARS_PUBLIC_URL,
    });
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

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const fullPrompt = buildAvatarGenerationPrompt(prompt);
    const {
      imageBuffer,
      mimeType,
      extension,
    } = await generateAvatarImageTraced({
      apiKey: c.env.OPENAI_API_KEY,
      prompt: fullPrompt,
      distinctId: c.get('user')?.id,
      surface: 'contact',
    });

    const filename = `${contactId}/avatar-generated-${Date.now()}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Build avatar URL using the API endpoint that serves from R2
    const baseUrl = resolvePublicBaseUrl({
      requestUrl: c.req.url,
      forwardedProto: c.req.header('X-Forwarded-Proto'),
      configuredBaseUrl: c.env.AVATARS_PUBLIC_URL,
    });
    const avatarUrl = `${baseUrl}/api/avatar/${filename}`;

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('Avatar generation error:', error);
    captureServerException(error, c.get('user')?.id, {
      feature: 'avatar-generation',
      route: '/api/avatar/generate',
      provider: 'openai',
      model: OPENAI_IMAGE_MODEL,
    });
    return c.json({ error: 'Failed to generate avatar' }, 500);
  }
});

// Pastel background colors for Micah style avatars
const PASTEL_BACKGROUNDS = [
  'soft pink',
  'light yellow',
  'pale blue',
  'lavender',
  'peach',
  'mint green',
  'light coral',
];

// Helper function to build avatar prompt from hints (Happy Humans style)
function buildPromptFromHints(gender: 'male' | 'female' | 'unknown', hints: AvatarHints): string {
  const parts: string[] = [];

  // Base: always happy and smiling
  const genderTerm = gender === 'male' ? 'man' : gender === 'female' ? 'woman' : 'person';
  parts.push(`A happy smiling ${genderTerm}`);

  // Physical description - key for distinctive traits
  if (hints.physical) {
    parts.push(hints.physical);
  }

  // Always emphasize the happy expression (signature of Happy Humans)
  parts.push('big friendly smile, joyful expression');

  // Context → clothing style (simple neckline only)
  if (hints.context) {
    const clothingMap: Record<string, string> = {
      'professional': 'collared shirt',
      'sport': 'crew neck t-shirt',
      'casual': 'simple t-shirt',
      'creative': 'turtleneck',
      'tech': 'hoodie',
    };
    const clothing = clothingMap[hints.context.toLowerCase()] || 'casual shirt';
    parts.push(`wearing a ${clothing}`);
  } else {
    parts.push('wearing a simple shirt');
  }

  // Random pastel background color
  const bgColor = PASTEL_BACKGROUNDS[Math.floor(Math.random() * PASTEL_BACKGROUNDS.length)];
  parts.push(`${bgColor} pastel background filling entire image`);

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

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Build prompt from hints
    const description = buildPromptFromHints(gender, avatarHints || {
      physical: null,
      personality: null,
      interest: null,
      context: null,
    });

    console.log('[Avatar Auto] Starting contact avatar generation');

    const fullPrompt = buildAvatarGenerationPrompt(description);
    const {
      imageBuffer,
      mimeType,
      extension,
    } = await generateAvatarImageTraced({
      apiKey: c.env.OPENAI_API_KEY,
      prompt: fullPrompt,
      distinctId: c.get('user')?.id,
      surface: 'contact-auto',
    });

    const filename = `${contactId}/avatar-auto-${Date.now()}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const baseUrl = resolvePublicBaseUrl({
      requestUrl: c.req.url,
      forwardedProto: c.req.header('X-Forwarded-Proto'),
      configuredBaseUrl: c.env.AVATARS_PUBLIC_URL,
    });
    const avatarUrl = `${baseUrl}/api/avatar/${filename}`;

    console.log('[Avatar Auto] Contact avatar generated successfully');

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('[Avatar Auto] Generation error:', error);
    captureServerException(error, c.get('user')?.id, {
      feature: 'avatar-generation',
      route: '/api/avatar/generate-from-hints',
      provider: 'openai',
      model: OPENAI_IMAGE_MODEL,
    });
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

// ============================================
// User Avatar Routes (for profile pictures)
// ============================================

type UserUploadRequest = {
  imageBase64: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
};

type UserGenerateRequest = {
  prompt: string;
  language?: 'fr' | 'en' | 'es' | 'it' | 'de';
};

// Upload user avatar from gallery
avatarRoutes.post('/user/upload', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<UserUploadRequest>();
    const { imageBase64, mimeType } = body;

    if (!imageBase64 || !mimeType) {
      return c.json({ error: 'Missing required fields: imageBase64, mimeType' }, 400);
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
    const timestamp = Date.now();
    const filename = `users/${user.id}/avatar-${timestamp}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const baseUrl = resolvePublicBaseUrl({
      requestUrl: c.req.url,
      forwardedProto: c.req.header('X-Forwarded-Proto'),
      configuredBaseUrl: c.env.AVATARS_PUBLIC_URL,
    });
    const avatarUrl = `${baseUrl}/api/avatar/users/${user.id}/avatar-${timestamp}.${extension}`;

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('User avatar upload error:', error);
    return c.json({ error: 'Failed to upload avatar' }, 500);
  }
});

// Generate user avatar with AI
avatarRoutes.post('/user/generate', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<UserGenerateRequest>();
    const { prompt } = body;

    if (!prompt) {
      return c.json({ error: 'Missing required field: prompt' }, 400);
    }

    if (prompt.length > 500) {
      return c.json({ error: 'Prompt too long. Maximum 500 characters' }, 400);
    }

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const fullPrompt = buildAvatarGenerationPrompt(prompt);
    const {
      imageBuffer,
      mimeType,
      extension,
    } = await generateAvatarImageTraced({
      apiKey: c.env.OPENAI_API_KEY,
      prompt: fullPrompt,
      distinctId: user.id,
      surface: 'user',
    });

    const timestamp = Date.now();
    const filename = `users/${user.id}/avatar-generated-${timestamp}.${extension}`;

    await c.env.AVATARS_BUCKET.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
    });

    const baseUrl = resolvePublicBaseUrl({
      requestUrl: c.req.url,
      forwardedProto: c.req.header('X-Forwarded-Proto'),
      configuredBaseUrl: c.env.AVATARS_PUBLIC_URL,
    });
    const avatarUrl = `${baseUrl}/api/avatar/users/${user.id}/avatar-generated-${timestamp}.${extension}`;

    return c.json({
      success: true,
      avatarUrl,
      filename,
    });
  } catch (error) {
    console.error('User avatar generation error:', error);
    captureServerException(error, c.get('user')?.id, {
      feature: 'avatar-generation',
      route: '/api/avatar/user/generate',
      provider: 'openai',
      model: OPENAI_IMAGE_MODEL,
    });
    return c.json({ error: 'Failed to generate avatar' }, 500);
  }
});

// Delete user avatar
avatarRoutes.delete('/user', async (c) => {
  try {
    const user = c.get('user');

    const objects = await c.env.AVATARS_BUCKET.list({ prefix: `users/${user.id}/` });

    for (const object of objects.objects) {
      await c.env.AVATARS_BUCKET.delete(object.key);
    }

    return c.json({
      success: true,
      deletedCount: objects.objects.length,
    });
  } catch (error) {
    console.error('User avatar delete error:', error);
    return c.json({ error: 'Failed to delete avatar' }, 500);
  }
});
