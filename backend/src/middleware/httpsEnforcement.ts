/**
 * HTTPS enforcement middleware
 * Ensures all requests in production use HTTPS
 */

import { Context, Next } from 'hono';

/**
 * Enforce HTTPS in production
 * Redirects HTTP requests to HTTPS or rejects them
 */
export const httpsEnforcement = async (c: Context, next: Next) => {
  // Get protocol from various headers
  const proto = c.req.header('X-Forwarded-Proto') || c.req.header('CF-Visitor') || 'https';

  // Cloudflare Workers typically use CF-Visitor header
  let isHttps = proto === 'https';
  if (proto && proto.includes('https')) {
    isHttps = true;
  }

  // Check if we're in production (Cloudflare Workers)
  // In development, we allow HTTP
  const url = new URL(c.req.url);
  const isDevelopment = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  // Only enforce HTTPS in production
  if (!isDevelopment && !isHttps) {
    return c.json(
      {
        error: 'HTTPS required',
        message: 'Please use HTTPS to access this API',
      },
      426 // Upgrade Required
    );
  }

  await next();
};
