import { Hono } from 'hono';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { getPrisma } from '../lib/db';
import { rateLimiters } from '../middleware/rateLimit';
import { auditLog } from '../lib/audit';
import { createSESClient } from '../lib/ses';
import { buildPasswordResetEmailHtml, buildPasswordResetEmailText } from '../templates/password-reset';
import { revokeAllUserTokens } from '../lib/tokens';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  SES_FROM_EMAIL: string;
  APP_URL: string;
  RATE_LIMIT: KVNamespace;
};

const TOKEN_EXPIRY_MINUTES = 30;

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

function generateResetToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const passwordResetRoutes = new Hono<{ Bindings: Bindings }>();

passwordResetRoutes.post('/forgot-password', rateLimiters.login, async (c) => {
  try {
    const body = await c.req.json();

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      await auditLog(c, {
        action: 'forgot_password',
        resource: 'auth',
        success: false,
        details: { error: 'Validation failed', issues: validation.error.issues },
      });
      return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
    }

    const { email } = validation.data;
    const prisma = getPrisma(c.env.DATABASE_URL);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await auditLog(c, {
        action: 'forgot_password',
        resource: 'auth',
        success: false,
        details: { email, reason: 'User not found' },
      });
      return c.json({
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    await prisma.verification.deleteMany({
      where: { identifier: email },
    });

    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await prisma.verification.create({
      data: {
        identifier: email,
        value: resetToken,
        expiresAt,
      },
    });

    const resetUrl = `https://clementserizay.com/reset-password?token=${resetToken}`;

    const sesClient = createSESClient({
      accessKeyId: c.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
      region: c.env.AWS_REGION || 'eu-west-3',
      fromEmail: c.env.SES_FROM_EMAIL || 'noreply@clementserizay.com',
    });

    const emailResult = await sesClient.sendEmail({
      to: email,
      subject: 'Recall People - Reinitialisation de votre mot de passe',
      htmlBody: buildPasswordResetEmailHtml({
        userName: user.name,
        resetUrl,
        expiresInMinutes: TOKEN_EXPIRY_MINUTES,
      }),
      textBody: buildPasswordResetEmailText({
        userName: user.name,
        resetUrl,
        expiresInMinutes: TOKEN_EXPIRY_MINUTES,
      }),
    });

    if (!emailResult.success) {
      console.error('[Password Reset] Failed to send email:', emailResult.error);
      await auditLog(c, {
        userId: user.id,
        action: 'forgot_password',
        resource: 'auth',
        success: false,
        details: { email, reason: 'Email send failed', error: emailResult.error },
      });
      return c.json({ error: 'Failed to send reset email' }, 500);
    }

    await auditLog(c, {
      userId: user.id,
      action: 'forgot_password',
      resource: 'auth',
      success: true,
      details: { email, messageId: emailResult.messageId },
    });

    return c.json({
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    await auditLog(c, {
      action: 'forgot_password',
      resource: 'auth',
      success: false,
      details: { error: String(error) },
    });
    return c.json({ error: 'Password reset request failed' }, 500);
  }
});

passwordResetRoutes.post('/reset-password', rateLimiters.login, async (c) => {
  try {
    const body = await c.req.json();

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      await auditLog(c, {
        action: 'reset_password',
        resource: 'auth',
        success: false,
        details: { error: 'Validation failed', issues: validation.error.issues },
      });
      return c.json({ error: 'Invalid input', details: validation.error.issues }, 400);
    }

    const { token, newPassword } = validation.data;
    const prisma = getPrisma(c.env.DATABASE_URL);

    const verification = await prisma.verification.findFirst({
      where: { value: token },
    });

    if (!verification) {
      await auditLog(c, {
        action: 'reset_password',
        resource: 'auth',
        success: false,
        details: { reason: 'Token not found' },
      });
      return c.json({ error: 'Invalid or expired reset link' }, 400);
    }

    if (new Date() > verification.expiresAt) {
      await prisma.verification.delete({
        where: { id: verification.id },
      });

      await auditLog(c, {
        action: 'reset_password',
        resource: 'auth',
        success: false,
        details: { reason: 'Token expired', identifier: verification.identifier },
      });
      return c.json({ error: 'Invalid or expired reset link' }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
      include: { accounts: true },
    });

    if (!user) {
      await auditLog(c, {
        action: 'reset_password',
        resource: 'auth',
        success: false,
        details: { reason: 'User not found', identifier: verification.identifier },
      });
      return c.json({ error: 'Invalid or expired reset link' }, 400);
    }

    const credentialsAccount = user.accounts.find(
      (account) => account.providerId === 'credentials'
    );

    const hashedPassword = await hash(newPassword, 12);

    if (credentialsAccount) {
      await prisma.account.update({
        where: { id: credentialsAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          accountId: user.email,
          providerId: 'credentials',
          userId: user.id,
          password: hashedPassword,
        },
      });
    }

    await prisma.verification.delete({
      where: { id: verification.id },
    });

    await revokeAllUserTokens(user.id, c.env.DATABASE_URL);

    await auditLog(c, {
      userId: user.id,
      action: 'reset_password',
      resource: 'auth',
      success: true,
      details: { email: user.email },
    });

    return c.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    await auditLog(c, {
      action: 'reset_password',
      resource: 'auth',
      success: false,
      details: { error: String(error) },
    });
    return c.json({ error: 'Password reset failed' }, 500);
  }
});
