import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { hash, compare } from 'bcryptjs';
import { z } from 'zod';
import { getPrisma } from '../lib/db';
import { rateLimiters } from '../middleware/rateLimit';
import { generateTokenPair, refreshAccessToken, revokeRefreshToken, revokeAllUserTokens } from '../lib/tokens';
import { auditLog, getClientInfo } from '../lib/audit';

type Bindings = {
	DATABASE_URL: string;
	JWT_SECRET: string;
	GOOGLE_CLIENT_ID_WEB: string;
	GOOGLE_CLIENT_ID_IOS: string;
	GOOGLE_CLIENT_ID_ANDROID: string;
	RATE_LIMIT: KVNamespace;
};

// Validation schemas
const registerSchema = z.object({
	email: z.string().email('Invalid email format'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
	email: z.string().email('Invalid email format'),
	password: z.string().min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
	idToken: z.string().min(1, 'ID token is required'),
});

const refreshTokenSchema = z.object({
	refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const authRoutes = new Hono<{ Bindings: Bindings }>();

// Register
authRoutes.post('/register', rateLimiters.register, async (c) => {
	try {
		const body = await c.req.json();

		// Validate input
		const validation = registerSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				action: 'register',
				resource: 'auth',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { email, password, name } = validation.data;
		const prisma = getPrisma(c.env.DATABASE_URL);

		// Check if user exists
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			await auditLog(c, {
				action: 'register',
				resource: 'auth',
				success: false,
				details: { email, reason: 'User already exists' },
			});
			return c.json({ error: 'User already exists' }, 400);
		}

		// Hash password with bcrypt (cost factor 12)
		const hashedPassword = await hash(password, 12);

		const user = await prisma.user.create({
			data: {
				email,
				name,
				accounts: {
					create: {
						accountId: email,
						providerId: 'credentials',
						password: hashedPassword,
					},
				},
			},
		});

		// Generate token pair (1h access + 30d refresh)
		const clientInfo = getClientInfo(c);
		const tokens = await generateTokenPair(
			{
				id: user.id,
				email: user.email,
				name: user.name,
			},
			c.env.JWT_SECRET,
			c.env.DATABASE_URL,
			clientInfo.ipAddress,
			clientInfo.userAgent
		);

		await auditLog(c, {
			userId: user.id,
			action: 'register',
			resource: 'auth',
			success: true,
			details: { email, provider: 'credentials' },
		});

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider: 'credentials',
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresAt: tokens.accessTokenExpiresAt,
		});
	} catch (error) {
		console.error('Register error:', error);
		await auditLog(c, {
			action: 'register',
			resource: 'auth',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Registration failed' }, 500);
	}
});

// Login
authRoutes.post('/login', rateLimiters.login, async (c) => {
	try {
		const body = await c.req.json();

		// Validate input
		const validation = loginSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				action: 'login',
				resource: 'auth',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { email, password } = validation.data;
		const prisma = getPrisma(c.env.DATABASE_URL);

		// Find user with accounts
		const user = await prisma.user.findUnique({
			where: { email },
			include: { accounts: true },
		});

		if (!user) {
			await auditLog(c, {
				action: 'login',
				resource: 'auth',
				success: false,
				details: { email, reason: 'User not found' },
			});
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		// Find the credentials account and verify password
		const credentialsAccount = user.accounts.find(
			(account) => account.providerId === 'credentials'
		);

		if (!credentialsAccount?.password) {
			await auditLog(c, {
				userId: user.id,
				action: 'login',
				resource: 'auth',
				success: false,
				details: { email, reason: 'No credentials account' },
			});
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		const isPasswordValid = await compare(password, credentialsAccount.password);
		if (!isPasswordValid) {
			await auditLog(c, {
				userId: user.id,
				action: 'login',
				resource: 'auth',
				success: false,
				details: { email, reason: 'Invalid password' },
			});
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		// Get the provider from the first account (credentials or google)
		const provider = user.accounts[0]?.providerId || 'credentials';

		// Generate token pair (1h access + 30d refresh)
		const clientInfo = getClientInfo(c);
		const tokens = await generateTokenPair(
			{
				id: user.id,
				email: user.email,
				name: user.name,
			},
			c.env.JWT_SECRET,
			c.env.DATABASE_URL,
			clientInfo.ipAddress,
			clientInfo.userAgent
		);

		await auditLog(c, {
			userId: user.id,
			action: 'login',
			resource: 'auth',
			success: true,
			details: { email, provider },
		});

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider,
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresAt: tokens.accessTokenExpiresAt,
		});
	} catch (error) {
		console.error('Login error:', error);
		await auditLog(c, {
			action: 'login',
			resource: 'auth',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Login failed' }, 500);
	}
});

// Google OAuth
authRoutes.post('/google', async (c) => {
	try {
		const body = await c.req.json();

		// Validate input
		const validation = googleAuthSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				action: 'login',
				resource: 'auth',
				success: false,
				details: { error: 'Validation failed', provider: 'google', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { idToken } = validation.data;

		// Verify Google ID token
		const googleResponse = await fetch(
			`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
		);

		if (!googleResponse.ok) {
			return c.json({ error: 'Invalid Google token' }, 401);
		}

		const googlePayload = (await googleResponse.json()) as {
			aud: string;
			email: string;
			name?: string;
			picture?: string;
		};

		// Verify the token is for our app
		const validClientIds = [
			c.env.GOOGLE_CLIENT_ID_WEB,
			c.env.GOOGLE_CLIENT_ID_IOS,
			c.env.GOOGLE_CLIENT_ID_ANDROID,
		].filter(Boolean);

		if (!validClientIds.includes(googlePayload.aud)) {
			return c.json({ error: 'Token not issued for this app' }, 401);
		}

		const { email, name, picture } = googlePayload;

		if (!email) {
			return c.json({ error: 'Email not provided by Google' }, 400);
		}

		const prisma = getPrisma(c.env.DATABASE_URL);

		// Find or create user
		let user = await prisma.user.findUnique({
			where: { email },
			include: { accounts: true },
		});

		if (!user) {
			user = await prisma.user.create({
				data: {
					email,
					name: name || email.split('@')[0],
					image: picture || null,
					emailVerified: true,
					accounts: {
						create: {
							accountId: email,
							providerId: 'google',
						},
					},
				},
				include: { accounts: true },
			});
		} else {
			// Check if user has a google account, if not create one
			const hasGoogleAccount = user.accounts.some((account) => account.providerId === 'google');
			if (!hasGoogleAccount) {
				await prisma.account.create({
					data: {
						accountId: email,
						providerId: 'google',
						userId: user.id,
					},
				});
			}

			// Update image if user doesn't have one
			if (picture && !user.image) {
				user = await prisma.user.update({
					where: { id: user.id },
					data: { image: picture },
					include: { accounts: true },
				});
			}
		}

		// Generate token pair (1h access + 30d refresh)
		const clientInfo = getClientInfo(c);
		const tokens = await generateTokenPair(
			{
				id: user.id,
				email: user.email,
				name: user.name,
			},
			c.env.JWT_SECRET,
			c.env.DATABASE_URL,
			clientInfo.ipAddress,
			clientInfo.userAgent
		);

		await auditLog(c, {
			userId: user.id,
			action: 'login',
			resource: 'auth',
			success: true,
			details: { email, provider: 'google' },
		});

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider: 'google',
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresAt: tokens.accessTokenExpiresAt,
		});
	} catch (error) {
		console.error('Google auth error:', error);
		await auditLog(c, {
			action: 'login',
			resource: 'auth',
			success: false,
			details: { error: String(error), provider: 'google' },
		});
		return c.json({ error: 'Google authentication failed' }, 500);
	}
});

// Verify token
authRoutes.get('/verify', async (c) => {
	try {
		const authHeader = c.req.header('Authorization');
		if (!authHeader?.startsWith('Bearer ')) {
			return c.json({ error: 'No token provided' }, 401);
		}

		const token = authHeader.substring(7);
		const payload = await verify(token, c.env.JWT_SECRET);

		const prisma = getPrisma(c.env.DATABASE_URL);
		const user = await prisma.user.findUnique({
			where: { id: payload.sub as string },
			include: { accounts: true },
		});

		if (!user) {
			return c.json({ error: 'User not found' }, 401);
		}

		// Get the provider - prioritize google if user has both
		const hasGoogle = user.accounts.some((account) => account.providerId === 'google');
		const provider = hasGoogle ? 'google' : (user.accounts[0]?.providerId || 'credentials');

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider,
			},
		});
	} catch (error) {
		console.error('Verify error:', error);
		return c.json({ error: 'Invalid token' }, 401);
	}
});

// Refresh access token
authRoutes.post('/refresh', rateLimiters.login, async (c) => {
	try {
		const body = await c.req.json();

		// Validate input
		const validation = refreshTokenSchema.safeParse(body);
		if (!validation.success) {
			await auditLog(c, {
				action: 'token_refresh',
				resource: 'auth',
				success: false,
				details: { error: 'Validation failed', issues: validation.error.issues },
			});
			return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
		}

		const { refreshToken } = validation.data;
		const clientInfo = getClientInfo(c);

		// Generate new token pair
		const tokens = await refreshAccessToken(
			refreshToken,
			c.env.JWT_SECRET,
			c.env.DATABASE_URL,
			clientInfo.ipAddress,
			clientInfo.userAgent
		);

		if (!tokens) {
			await auditLog(c, {
				action: 'token_refresh',
				resource: 'auth',
				success: false,
				details: { reason: 'Invalid or expired refresh token' },
			});
			return c.json({ error: 'Invalid or expired refresh token' }, 401);
		}

		// Get user info for response
		const prisma = getPrisma(c.env.DATABASE_URL);
		const payload = await verify(tokens.accessToken, c.env.JWT_SECRET);
		const user = await prisma.user.findUnique({
			where: { id: payload.sub as string },
			include: { accounts: true },
		});

		if (!user) {
			return c.json({ error: 'User not found' }, 401);
		}

		const hasGoogle = user.accounts.some((account) => account.providerId === 'google');
		const provider = hasGoogle ? 'google' : (user.accounts[0]?.providerId || 'credentials');

		await auditLog(c, {
			userId: user.id,
			action: 'token_refresh',
			resource: 'auth',
			success: true,
			details: { email: user.email },
		});

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider,
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			expiresAt: tokens.accessTokenExpiresAt,
		});
	} catch (error) {
		console.error('Refresh token error:', error);
		await auditLog(c, {
			action: 'token_refresh',
			resource: 'auth',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Token refresh failed' }, 500);
	}
});

// Logout (revoke refresh token)
authRoutes.post('/logout', async (c) => {
	try {
		const body = await c.req.json();
		const { refreshToken } = body;

		if (!refreshToken) {
			return c.json({ error: 'Refresh token required' }, 400);
		}

		const revoked = await revokeRefreshToken(refreshToken, c.env.DATABASE_URL);

		// Get user ID from access token if available for audit log
		let userId: string | undefined;
		try {
			const authHeader = c.req.header('Authorization');
			if (authHeader?.startsWith('Bearer ')) {
				const token = authHeader.substring(7);
				const payload = await verify(token, c.env.JWT_SECRET);
				userId = payload.sub as string;
			}
		} catch {
			// Ignore token verification errors for logout
		}

		await auditLog(c, {
			userId,
			action: 'logout',
			resource: 'auth',
			success: revoked,
			details: { tokenRevoked: revoked },
		});

		return c.json({ success: revoked });
	} catch (error) {
		console.error('Logout error:', error);
		await auditLog(c, {
			action: 'logout',
			resource: 'auth',
			success: false,
			details: { error: String(error) },
		});
		return c.json({ error: 'Logout failed' }, 500);
	}
});
