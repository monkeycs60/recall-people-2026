import { Context, Next } from 'hono';

type RateLimitOptions = {
	limit: number;       // Max requests
	window: number;      // Time window in seconds
	keyPrefix: string;   // Prefix for the KV key
	keyType: 'ip' | 'user'; // What to base rate limiting on
};

type Bindings = {
	RATE_LIMIT: KVNamespace;
};

type Variables = {
	user?: { id: string };
};

/**
 * Get client IP from Cloudflare headers
 */
const getClientIP = (c: Context): string => {
	return (
		c.req.header('cf-connecting-ip') ||
		c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
		c.req.header('x-real-ip') ||
		'unknown'
	);
};

/**
 * Rate limiting middleware factory
 */
export const rateLimit = (options: RateLimitOptions) => {
	return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
		const { limit, window, keyPrefix, keyType } = options;

		// Build the rate limit key
		let identifier: string;
		if (keyType === 'user') {
			const user = c.get('user');
			identifier = user?.id || getClientIP(c);
		} else {
			identifier = getClientIP(c);
		}

		const key = `${keyPrefix}:${identifier}`;

		try {
			// Get current count from KV
			const current = await c.env.RATE_LIMIT.get(key);
			const count = current ? parseInt(current, 10) : 0;

			// Check if limit exceeded
			if (count >= limit) {
				return c.json(
					{
						error: 'Too many requests',
						retryAfter: window,
					},
					429
				);
			}

			// Increment counter
			await c.env.RATE_LIMIT.put(key, String(count + 1), {
				expirationTtl: window,
			});

			// Add rate limit headers
			c.header('X-RateLimit-Limit', String(limit));
			c.header('X-RateLimit-Remaining', String(limit - count - 1));

			await next();
		} catch (error) {
			// If KV fails, log but don't block the request
			console.error('Rate limit error:', error);
			await next();
		}
	};
};

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
	// Auth routes - generous limits (IP-based)
	login: rateLimit({
		limit: 10,
		window: 900, // 15 minutes
		keyPrefix: 'rl:login',
		keyType: 'ip',
	}),
	register: rateLimit({
		limit: 15,
		window: 3600, // 1 hour
		keyPrefix: 'rl:register',
		keyType: 'ip',
	}),
	// API routes - per user
	api: rateLimit({
		limit: 60,
		window: 60, // 1 minute
		keyPrefix: 'rl:api',
		keyType: 'user',
	}),
	// AI-heavy routes - more restrictive per user
	aiExtract: rateLimit({
		limit: 15,
		window: 60, // 1 minute
		keyPrefix: 'rl:extract',
		keyType: 'user',
	}),
};
