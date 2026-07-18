export const OPENAI_IMAGE_MODEL = 'gpt-image-2';
export const AVATAR_IMAGE_SIZE = '1024x1024';
export const AVATAR_IMAGE_QUALITY = 'low';

export const AVATAR_STYLE_PROMPT = `Create a character avatar in "Happy Humans" style - like Bored Apes NFT but the OPPOSITE: friendly smiling HUMANS instead of bored apes.

CONCEPT: Think Bored Ape Yacht Club meets DiceBear Micah - distinctive cartoon humans who are always HAPPY and SMILING.

IMAGE SIZE: Generate a SQUARE image (1:1 aspect ratio). The image must be perfectly square.

CRITICAL STYLE RULES:

BACKGROUND:
- Solid pastel color filling the ENTIRE image (soft pink, light yellow, pale blue, lavender, peach, mint)
- The pastel background must cover 100% of the image, edge to edge, no white space
- NO border, NO outline, NO white margins anywhere

CHARACTER STYLE:
- Simple cartoon illustration with black outlines ONLY on the character
- Flat colors, NO gradients, NO realistic shading
- Bold, distinctive, collectible-looking character design
- Each character should feel unique but part of the same "collection"

EXPRESSION (MOST IMPORTANT):
- ALWAYS happy, friendly, positive expression
- Big warm smile showing teeth, or cheerful closed-mouth smile
- Happy eyes: can be simple dots, half-circles (happy squint), or wide open with joy
- Overall vibe: optimistic, welcoming, joyful - the OPPOSITE of "bored"

FACE:
- Small simple eyes with happy expression
- Minimal nose: tiny curved line or small dot
- BIG FRIENDLY SMILE - this is the signature feature
- Optional: rosy cheeks, freckles for character
- Round or oval head shape

HAIR:
- Bold geometric silhouette
- Solid flat color (natural OR fun colors like pink, mint, white, orange)
- Simple distinctive shapes

BODY:
- Shoulders and neck visible
- Simple clothing: shirt collar, turtleneck, crew neck, hoodie
- Solid colors, can be bold/fun

COMPOSITION:
- SQUARE image where the pastel background fills the ENTIRE image (100%, edge to edge)
- NO white margins, NO empty space - the pastel color covers the whole canvas
- The background is a solid pastel color filling the entire square image
- Character centered within this pastel background
- Character slightly off-center or at a slight angle
- Head and shoulders only

DO NOT: Add any circular border/outline. DO NOT leave white margins around the background.

USER'S DESCRIPTION:`;

type OpenAIImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

type GenerateAvatarImageOptions = {
  apiKey: string;
  prompt: string;
  fetchFn?: typeof fetch;
};

export type GeneratedAvatarImage = {
  imageBuffer: Uint8Array;
  mimeType: 'image/png';
  extension: 'png';
};

export function buildAvatarGenerationPrompt(description: string): string {
  return `${AVATAR_STYLE_PROMPT}
${description}

Generate a single portrait illustration following the design system above. The avatar should be warm, inviting, and professional.`;
}

export async function generateAvatarImage({
  apiKey,
  prompt,
  fetchFn = fetch,
}: GenerateAvatarImageOptions): Promise<GeneratedAvatarImage> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for avatar image generation');
  }

  const response = await fetchFn('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: AVATAR_IMAGE_SIZE,
      quality: AVATAR_IMAGE_QUALITY,
    }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message = data.error?.message || response.statusText || 'Unknown error';
    throw new Error(`OpenAI image generation failed (${response.status}): ${message}`);
  }

  const imageBase64 = data.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error('OpenAI image generation returned no image data');
  }

  return {
    imageBuffer: decodeBase64(imageBase64),
    mimeType: 'image/png',
    extension: 'png',
  };
}

async function parseJsonResponse(response: Response): Promise<OpenAIImageGenerationResponse> {
  try {
    return await response.json() as OpenAIImageGenerationResponse;
  } catch {
    return {};
  }
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
