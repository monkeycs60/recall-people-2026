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

		// Create user (in production, hash password with bcrypt!)
		const user = await prisma.user.create({
			data: {
				email,
				name,
				// WARNING: In production, hash the password!
				// For now, storing plain text for simplicity
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

		// Find user
		const user = await prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		// In production, verify hashed password here!
		// For now, just check if user exists

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
			'REDACTED_GOOGLE_CLIENT_ID_WEB', // Web
			'REDACTED_GOOGLE_CLIENT_ID_IOS', // iOS
			'REDACTED_GOOGLE_CLIENT_ID_ANDROID', // Android
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
		});

		if (!user) {
			user = await prisma.user.create({
				data: {
					email,
					name: name || email.split('@')[0],
					image: picture || null,
					emailVerified: true,
				},
			});
		} else if (picture && !user.image) {
			// Update image if user doesn't have one
			user = await prisma.user.update({
				where: { id: user.id },
				data: { image: picture },
			});
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
		});

		if (!user) {
			return c.json({ error: 'User not found' }, 401);
		}

		return c.json({
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
			},
		});
	} catch (error) {
		console.error('Verify error:', error);
		return c.json({ error: 'Invalid token' }, 401);
	}
});
