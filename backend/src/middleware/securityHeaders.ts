/**
 * Security headers middleware
 * Implements CSP, HSTS, X-Frame-Options, and other security headers
 */

import { Context, Next } from 'hono';

/**
 * Add comprehensive security headers to all responses
 */
export const securityHeaders = async (c: Context, next: Next) => {
  await next();

  // Content Security Policy (CSP)
  // Restricts resources that can be loaded to prevent XSS attacks
  c.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for API responses
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://oauth2.googleapis.com https://deepgram.com https://api.anthropic.com https://api.x.ai",
      "frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
  );

  // HTTP Strict Transport Security (HSTS)
  // Forces HTTPS connections for 1 year
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // X-Frame-Options
  // Prevents clickjacking attacks by disallowing the page to be embedded in iframes
  c.header('X-Frame-Options', 'DENY');

  // X-Content-Type-Options
  // Prevents MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff');

  // X-XSS-Protection
  // Enables browser's XSS filter (legacy but still useful)
  c.header('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  // Controls how much referrer information is sent with requests
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy (formerly Feature-Policy)
  // Restricts browser features that can be used
  c.header(
    'Permissions-Policy',
    [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', ')
  );

  // X-Permitted-Cross-Domain-Policies
  // Restricts Adobe Flash and PDF cross-domain requests
  c.header('X-Permitted-Cross-Domain-Policies', 'none');

  // X-DNS-Prefetch-Control
  // Controls DNS prefetching
  c.header('X-DNS-Prefetch-Control', 'off');

  // X-Download-Options
  // Prevents IE from executing downloads in the site's context
  c.header('X-Download-Options', 'noopen');
};
