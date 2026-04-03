import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

/**
 * Phase 3: Audit Logging Utility
 *
 * Tracks user actions like signup, login, verification, password changes
 * Used for security monitoring, compliance, and debugging
 */

export type AuditAction =
  | 'signup'
  | 'login'
  | 'verify_email'
  | 'password_change'
  | 'role_change'
  | 'account_suspend'
  | 'failed_login'
  | 'admin_create_user';

export type AuditResourceType = 'user' | 'admin' | 'article' | 'comment';

function getClientIP(request?: NextRequest): string {
  if (!request) return 'unknown';
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function getUserAgent(request?: NextRequest): string | null {
  if (!request) return null;
  return request.headers.get('user-agent');
}

export async function logAuditEvent(
  action: AuditAction,
  resourceType: AuditResourceType,
  options?: {
    userId?: number | null;
    resourceId?: number | null;
    details?: Record<string, any>;
    request?: NextRequest;
  }
): Promise<void> {
  try {
    const ipAddress = getClientIP(options?.request);
    const userAgent = getUserAgent(options?.request);

    await prisma.auditLog.create({
      data: {
        userId: options?.userId || null,
        action,
        resourceType,
        resourceId: options?.resourceId || null,
        details: options?.details ? JSON.stringify(options.details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Non-blocking: log errors but don't crash application
    console.warn('[AuditLog] Failed to log event:', error);
  }
}

/**
 * Query audit logs for a specific user or action
 */
export async function queryAuditLogs(filter?: {
  userId?: number;
  action?: AuditAction;
  days?: number;
}) {
  try {
    const where: any = {};

    if (filter?.userId) where.userId = filter.userId;
    if (filter?.action) where.action = filter.action;

    if (filter?.days) {
      const since = new Date();
      since.setDate(since.getDate() - filter.days);
      where.createdAt = { gte: since };
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  } catch (error) {
    console.warn('[AuditLog] Failed to query logs:', error);
    return [];
  }
}
