/**
 * JWT token utilities with refresh token support
 */

import { sign } from 'hono/jwt';
import { getPrisma } from './db';

/**
 * Generate random bytes using Web Crypto API (Cloudflare Workers compatible)
 */
function generateRandomHex(byteLength: number): string {
	const bytes = new Uint8Array(byteLength);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

const ACCESS_TOKEN_EXPIRY = 60 * 60; // 1 hour
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 30; // 30 days

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: number;
	refreshTokenExpiresAt: number;
}

export interface UserTokenData {
	id: string;
	email: string;
	name: string;
}

/**
 * Generate both access and refresh tokens for a user
 */
export async function generateTokenPair(
	user: UserTokenData,
	jwtSecret: string,
	databaseUrl: string,
	ipAddress?: string,
	userAgent?: string
): Promise<TokenPair> {
	const now = Math.floor(Date.now() / 1000);
	const accessTokenExpiresAt = now + ACCESS_TOKEN_EXPIRY;
	const refreshTokenExpiresAt = now + REFRESH_TOKEN_EXPIRY;

	// Generate access token (short-lived)
	const accessToken = await sign(
		{
			sub: user.id,
			email: user.email,
			name: user.name,
			exp: accessTokenExpiresAt,
			type: 'access',
		},
		jwtSecret
	);

	// Generate refresh token (long-lived, stored in DB)
	const refreshTokenValue = generateRandomHex(64);

	const prisma = getPrisma(databaseUrl);

	// Store refresh token in database
	await prisma.refreshToken.create({
		data: {
			token: refreshTokenValue,
			userId: user.id,
			expiresAt: new Date(refreshTokenExpiresAt * 1000),
			ipAddress,
			userAgent,
		},
	});

	return {
		accessToken,
		refreshToken: refreshTokenValue,
		accessTokenExpiresAt,
		refreshTokenExpiresAt,
	};
}

/**
 * Validate and use a refresh token to generate a new token pair
 */
export async function refreshAccessToken(
	refreshTokenValue: string,
	jwtSecret: string,
	databaseUrl: string,
	ipAddress?: string,
	userAgent?: string
): Promise<TokenPair | null> {
	const prisma = getPrisma(databaseUrl);

	// Find refresh token
	const refreshToken = await prisma.refreshToken.findUnique({
		where: { token: refreshTokenValue },
		include: { user: true },
	});

	if (!refreshToken) {
		return null;
	}

	// Check if token is expired
	if (refreshToken.expiresAt < new Date()) {
		// Delete expired token
		await prisma.refreshToken.delete({
			where: { id: refreshToken.id },
		});
		return null;
	}

	// Delete old refresh token (single-use)
	await prisma.refreshToken.delete({
		where: { id: refreshToken.id },
	});

	// Generate new token pair
	return generateTokenPair(
		{
			id: refreshToken.user.id,
			email: refreshToken.user.email,
			name: refreshToken.user.name,
		},
		jwtSecret,
		databaseUrl,
		ipAddress,
		userAgent
	);
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(
	refreshTokenValue: string,
	databaseUrl: string
): Promise<boolean> {
	const prisma = getPrisma(databaseUrl);

	try {
		await prisma.refreshToken.delete({
			where: { token: refreshTokenValue },
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(
	userId: string,
	databaseUrl: string
): Promise<number> {
	const prisma = getPrisma(databaseUrl);

	const result = await prisma.refreshToken.deleteMany({
		where: { userId },
	});

	return result.count;
}

/**
 * Clean up expired refresh tokens
 */
export async function cleanupExpiredTokens(
	databaseUrl: string
): Promise<number> {
	const prisma = getPrisma(databaseUrl);

	const result = await prisma.refreshToken.deleteMany({
		where: {
			expiresAt: {
				lt: new Date(),
			},
		},
	});

	return result.count;
}
