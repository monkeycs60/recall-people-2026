/**
 * Audit logging utilities
 */

import { getPrisma } from './db';
import { Context } from 'hono';

export type AuditAction =
  | 'login'
  | 'register'
  | 'token_refresh'
  | 'logout'
  | 'contact_create'
  | 'contact_update'
  | 'contact_delete'
  | 'note_create'
  | 'note_delete'
  | 'transcribe'
  | 'extract'
  | 'search'
  | 'summary'
  | 'settings_update'
  | 'api_error';

export type AuditResource = 'auth' | 'contact' | 'note' | 'transcribe' | 'extract' | 'search' | 'summary' | 'settings';

export interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resource?: AuditResource;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  databaseUrl: string,
  data: AuditLogData
): Promise<void> {
  try {
    const prisma = getPrisma(databaseUrl);
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        details: data.details ? JSON.stringify(data.details) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        success: data.success ?? true,
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Extract IP address and user agent from Hono context
 */
export function getClientInfo(c: Context): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP'),
    userAgent: c.req.header('User-Agent'),
  };
}

/**
 * Create audit log from Hono context
 */
export async function auditLog(
  c: Context,
  data: Omit<AuditLogData, 'ipAddress' | 'userAgent'>
): Promise<void> {
  const clientInfo = getClientInfo(c);
  const databaseUrl = (c.env as any).DATABASE_URL;

  await createAuditLog(databaseUrl, {
    ...data,
    ...clientInfo,
  });
}
