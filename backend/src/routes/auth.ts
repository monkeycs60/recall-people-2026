import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { getPrisma } from '../lib/db';

type Bindings = {
	DATABASE_URL: string;
	JWT_SECRET: string;
};

export const authRoutes = new Hono<{ Bindings: Bindings }>();

// Register
authRoutes.post('/register', async (c) => {
	try {
		const { email, password, name } = await c.req.json();

		if (!email || !password || !name) {
			return c.json({ error: 'Missing required fields' }, 400);
		}

		const prisma = getPrisma(c.env.DATABASE_URL);

		// Check if user exists
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return c.json({ error: 'User already exists' }, 400);
		}

		// Create user with account (in production, hash password with bcrypt!)
		const user = await prisma.user.create({
			data: {
				email,
				name,
				accounts: {
					create: {
						accountId: email,
						providerId: 'credentials',
						password,
					},
				},
			},
		});

		// Generate JWT token
		const token = await sign(
			{
				sub: user.id,
				email: user.email,
				name: user.name,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
			},
			c.env.JWT_SECRET
		);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider: 'credentials',
			},
			token,
		});
	} catch (error) {
		console.error('Register error:', error);
		return c.json({ error: 'Registration failed' }, 500);
	}
});

// Login
authRoutes.post('/login', async (c) => {
	try {
		const { email, password } = await c.req.json();

		if (!email || !password) {
			return c.json({ error: 'Missing required fields' }, 400);
		}

		const prisma = getPrisma(c.env.DATABASE_URL);

		// Find user with accounts
		const user = await prisma.user.findUnique({
			where: { email },
			include: { accounts: true },
		});

		if (!user) {
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		// In production, verify hashed password here!
		// For now, just check if user exists

		// Get the provider from the first account (credentials or google)
		const provider = user.accounts[0]?.providerId || 'credentials';

		// Generate JWT token
		const token = await sign(
			{
				sub: user.id,
				email: user.email,
				name: user.name,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
			},
			c.env.JWT_SECRET
		);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider,
			},
			token,
		});
	} catch (error) {
		console.error('Login error:', error);
		return c.json({ error: 'Login failed' }, 500);
	}
});

// Google OAuth
authRoutes.post('/google', async (c) => {
	try {
		const { idToken } = await c.req.json();

		if (!idToken) {
			return c.json({ error: 'Missing idToken' }, 400);
		}

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
			'546590152270-o0or7j3b42vc9a5k8m7etjqv1hvgd5vt.apps.googleusercontent.com', // Web
			'546590152270-jsk7vkud486vg1eqsos9bt463fcbljug.apps.googleusercontent.com', // iOS
			'546590152270-5mhpmj00qsus5dnmrb5o6dbbmb3eu4g2.apps.googleusercontent.com', // Android
		];

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

		// Generate JWT token
		const token = await sign(
			{
				sub: user.id,
				email: user.email,
				name: user.name,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
			},
			c.env.JWT_SECRET
		);

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				provider: 'google',
			},
			token,
		});
	} catch (error) {
		console.error('Google auth error:', error);
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
